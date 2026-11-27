import { CLIMATE_PERIOD } from './climate-normals.js';

const months = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
const shortMonths = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'];
const rainfallColor = '#176398';
const temperatureColor = '#a34322';
const format = value => value == null ? '—' : value.toLocaleString('el-GR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function node(tag, text) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  return item;
}

export function createClimatogram() {
  const figure = node('figure');
  figure.className = 'climatogram';
  figure.hidden = true;
  figure.append(node('figcaption', 'Κλιματόγραμμα ERA5 · ' + CLIMATE_PERIOD));
  const canvas = node('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const legend = node('div');
  legend.className = 'climate-legend';
  const rainLabel = node('span', 'Υετός (mm) · αριστερά');
  rainLabel.className = 'climate-rain-label';
  const tempLabel = node('span', 'Θερμοκρασία (°C) · δεξιά');
  tempLabel.className = 'climate-temp-label';
  legend.append(rainLabel, tempLabel);
  const details = node('details');
  details.append(node('summary', 'Μηνιαίος πίνακας τιμών'));
  const table = node('table');
  table.append(node('caption', 'Μηνιαίες κανονικές τιμές ERA5, ' + CLIMATE_PERIOD));
  const headings = table.createTHead().insertRow();
  for (const label of ['Μήνας', 'Υετός (mm)', 'Θερμ. (°C)']) {
    const heading = node('th', label);
    heading.scope = 'col';
    headings.append(heading);
  }
  const rows = table.createTBody();
  details.append(table);
  figure.append(legend, canvas, details);
  let temperature;
  let rain;

  function draw() {
    const width = canvas.clientWidth;
    if (!width || figure.hidden) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const height = 184;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(ratio, ratio);
    const left = 31;
    const right = width - 30;
    const top = 16;
    const bottom = 150;
    const step = (right - left) / 12;
    const x = index => left + (index + 0.5) * step;
    const y = fraction => bottom - fraction * (bottom - top);
    const rainMax = rain ? Math.max(20, Math.ceil(Math.max(...rain) / 20) * 20) : 20;
    const tempMin = temperature ? Math.floor(Math.min(...temperature) / 4) * 4 : 0;
    const tempMax = temperature ? Math.max(tempMin + 4, Math.ceil(Math.max(...temperature) / 4) * 4) : 4;

    context.font = '10px system-ui, sans-serif';
    context.textBaseline = 'middle';
    for (let tick = 0; tick <= 4; tick++) {
      const fraction = tick / 4;
      const vertical = y(fraction);
      context.strokeStyle = '#dae2dc';
      context.beginPath();
      context.moveTo(left, vertical);
      context.lineTo(right, vertical);
      context.stroke();
      if (rain) {
        context.textAlign = 'right';
        context.fillStyle = rainfallColor;
        context.fillText(String(rainMax * fraction), left - 4, vertical);
      }
      if (temperature) {
        context.textAlign = 'left';
        context.fillStyle = temperatureColor;
        context.fillText(String(tempMin + (tempMax - tempMin) * fraction), right + 4, vertical);
      }
    }
    if (rain) {
      context.fillStyle = rainfallColor;
      rain.forEach((value, index) => {
        const barTop = y(value / rainMax);
        context.fillRect(x(index) - step * 0.32, barTop, step * 0.64, bottom - barTop);
      });
    }
    if (temperature) {
      context.strokeStyle = temperatureColor;
      context.lineWidth = 2;
      context.beginPath();
      temperature.forEach((value, index) => {
        const vertical = y((value - tempMin) / (tempMax - tempMin));
        if (index === 0) context.moveTo(x(index), vertical);
        else context.lineTo(x(index), vertical);
      });
      context.stroke();
    }
    context.fillStyle = '#39443a';
    context.textAlign = 'right';
    shortMonths.forEach((month, index) => {
      context.save();
      context.translate(x(index), bottom + 5);
      context.rotate(-Math.PI / 2);
      context.fillText(month, 0, 0);
      context.restore();
    });
  }

  if (typeof ResizeObserver === 'function') new ResizeObserver(draw).observe(canvas);
  return {
    figure,
    update(nextTemperature, nextRain) {
      if (nextTemperature === temperature && nextRain === rain) return;
      temperature = nextTemperature;
      rain = nextRain;
      figure.hidden = !temperature && !rain;
      rainLabel.hidden = !rain;
      tempLabel.hidden = !temperature;
      rows.replaceChildren();
      if (figure.hidden) return;
      months.forEach((month, index) => {
        const row = rows.insertRow();
        const header = node('th', month);
        header.scope = 'row';
        row.append(header, node('td', format(rain?.[index])), node('td', format(temperature?.[index])));
      });
      draw();
    },
  };
}
