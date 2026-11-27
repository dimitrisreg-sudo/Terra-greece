// Keep the deadline active until the response body has been read.
export async function withRequestDeadline(run, signal, timeout = 12000) {
  if (signal?.aborted) throw signal.reason;
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Service request timed out', 'TimeoutError')), timeout);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
