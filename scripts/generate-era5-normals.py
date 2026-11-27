"""Generate Terra Greece's ERA5 normals from the anonymous Open-Meteo AWS open archive.

Build-time dependencies: numpy, omfiles==1.2.0, requests. No API or credentials required.
"""
import argparse
import base64
import calendar
from concurrent.futures import ThreadPoolExecutor
from datetime import date
import hashlib
import json
from pathlib import Path
import time

import numpy as np
from omfiles import OmFileReader
import requests

ROOT = "https://openmeteo.s3.amazonaws.com/data/copernicus_era5/"
FIRST, LAST = 1991, 2020
SOUTH, NORTH, WEST, EAST = 33.5, 42.5, 18.5, 30
ROWS, COLS = int((NORTH - SOUTH) * 4 + 1), int((EAST - WEST) * 4 + 1)
Y, X = int((SOUTH + 90) * 4), int((WEST + 180) * 4)
VARIABLES = ("temperature_2m", "precipitation")


class PublicRanges:
    """Read bounded byte ranges and verify object identity for the entire file."""
    def __init__(self, session, url):
        self.session = session
        self.calls = self.bytes = 0
        self.blocks = []
        with session.head(url, timeout=25) as response:
            response.raise_for_status()
            self.length = int(response.headers["Content-Length"])
            self.etag = response.headers["ETag"]

    def size(self, _path):
        return self.length

    def cat_file(self, path, start=None, end=None):
        if start is None or end is None:
            raise ValueError("Full-object reads are disabled")
        if start < 0:
            start += self.length
        if end < 0:
            end += self.length
        end = min(end, self.length) - 1
        if end < start:
            return b""
        for offset, block in self.blocks:
            if offset <= start and end < offset + len(block):
                return block[start - offset:end - offset + 1]
        requested_end = end
        # OM readers visit contiguous compressed chunks. Bound read-ahead to coalesce them.
        end = min(self.length - 1, max(end, start + 256 * 1024 - 1))
        headers = {"Range": f"bytes={start}-{end}", "If-Match": self.etag}
        with self.session.get(path, headers=headers, timeout=35, stream=True) as response:
            expected = f"bytes {start}-{end}/{self.length}"
            if (response.status_code != 206 or response.headers.get("Content-Range") != expected
                    or response.headers.get("ETag") != self.etag):
                raise ValueError(f"Unverified range: HTTP {response.status_code}, {expected}")
            payload = response.content
        if len(payload) != end - start + 1:
            raise ValueError("Truncated byte range")
        self.calls += 1
        self.bytes += len(payload)
        self.blocks = [(start, payload), *self.blocks[:2]]
        return payload[:requested_end - start + 1]


def round_daily(values):
    """Encode the archive API's one-decimal daily precision, ties away from zero."""
    return np.copysign(np.floor(np.abs(values) * 10 + 0.5), values) / 10


def year_stats(values, year, variable):
    count = 365 + calendar.isleap(year)
    if values.shape != (ROWS, COLS, count * 24):
        raise ValueError(f"Unexpected regional shape for {variable}, {year}: {values.shape}")
    valid = np.isfinite(values)
    if variable == "temperature_2m":
        valid &= (values >= -100) & (values <= 70)
    else:
        valid &= values >= 0
    complete = valid.all(axis=-1)
    hourly = np.where(valid, values, 0).astype(np.float64).reshape(ROWS, COLS, count, 24)
    temperature = variable == "temperature_2m"
    daily = round_daily(hourly.mean(axis=-1) if temperature else hourly.sum(axis=-1))
    normal = np.mean if temperature else np.sum
    stats = [normal(daily, axis=-1)]
    start = 0
    for month in range(1, 13):
        end = start + calendar.monthrange(year, month)[1]
        stats.append(normal(daily[:, :, start:end], axis=-1))
        start = end
    return np.where(complete[:, :, None], np.stack(stats, axis=-1), np.nan)


def fetch_year(task):
    year, variable, work = task
    output = work / f"{variable}-{year}.npz"
    url = f"{ROOT}{variable}/year_{year}.om"
    if output.exists():
        with np.load(output) as stored:
            return stored["stats"], str(stored["etag"]), int(stored["bytes"]), int(stored["calls"])

    for attempt in range(3):
        try:
            with requests.Session() as session:
                archive = PublicRanges(session, url)
                with OmFileReader.from_fsspec(archive, url) as reader:
                    if reader.shape != (721, 1440, 24 * (365 + calendar.isleap(year))):
                        raise ValueError(f"Unexpected global archive shape: {reader.shape}")
                    values = reader[Y:Y + ROWS, X:X + COLS, :]
                stats = year_stats(values, year, variable)
            temp = output.with_suffix(".pending.npz")
            np.savez_compressed(temp, stats=stats, etag=archive.etag, bytes=archive.bytes, calls=archive.calls)
            temp.replace(output)
            print(f"{year} {variable}: {archive.bytes:,} bytes, {archive.calls} range requests", flush=True)
            return stats, archive.etag, archive.bytes, archive.calls
        except (requests.RequestException, RuntimeError, ValueError):
            if attempt == 2:
                raise
            time.sleep(2 ** (attempt + 1))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work-dir", required=True, type=Path, help="Resumable yearly aggregates")
    parser.add_argument("--output", type=Path, default=Path("data/era5-normals-1991-2020.json"))
    parser.add_argument("--generated-on", type=date.fromisoformat, default=date.today())
    parser.add_argument("--workers", type=int, choices=range(1, 7), default=4)
    args = parser.parse_args()
    args.work_dir.mkdir(parents=True, exist_ok=True)
    tasks = [(year, variable, args.work_dir) for year in range(FIRST, LAST + 1) for variable in VARIABLES]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        results = list(pool.map(fetch_year, tasks))

    # np.mean intentionally keeps any NaN from an incomplete year, per variable.
    temperature = np.mean([result[0] for result in results[::2]], axis=0)
    precipitation = np.mean([result[0] for result in results[1::2]], axis=0)
    temp_codes = np.where(np.isfinite(temperature), np.rint(temperature * 100), -32768)
    rain_codes = np.where(np.isfinite(precipitation), np.rint(precipitation * 10), 65535)
    if np.any((temp_codes < -32768) | (temp_codes > 32767)) or np.any((rain_codes < 0) | (rain_codes > 65535)):
        raise ValueError("Normal exceeds the storage range")
    layout = np.concatenate([temp_codes.astype("<i2").view("<u2"), rain_codes.astype("<u2")], axis=-1)
    packed = layout.tobytes(order="C")
    dataset = {
        "version": 1, "period": "1991-2020", "step": 0.25, "south": SOUTH, "west": WEST,
        "rows": ROWS, "columns": COLS, "generatedOn": args.generated_on.isoformat(),
        "license": "CC BY 4.0", "source": ROOT,
        "encoding": "base64-le-i16-celsius-x100-u16-mm-x10",
        "sha256": hashlib.sha256(packed).hexdigest(),
        "etag": {f"{variable}/{year}": result[1] for (year, variable, _), result in zip(tasks, results)},
        "transferBytes": sum(result[2] for result in results),
        "rangeRequests": sum(result[3] for result in results),
        "values": base64.b64encode(packed).decode("ascii"),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(dataset, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{args.output}: {args.output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
