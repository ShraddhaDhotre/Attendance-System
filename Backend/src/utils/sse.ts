// Lightweight Server-Sent Events manager
// Use `any` for response to avoid cross-package type issues with Express Response/ServerResponse.
type Listener = { res: any; sessionId: number };
const listeners: Set<Listener> = new Set();

export function addListener(sessionId: number, res: any) {
  // Set SSE headers
  res.writeHead?.(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const listener = { res, sessionId };
  listeners.add(listener);

  // send a comment to acknowledge
  try { res.write(': connected\n\n'); } catch (_) {}

  return () => listeners.delete(listener);
}

export function broadcast(sessionId: number, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const l of Array.from(listeners)) {
    if (l.sessionId === sessionId) {
      try { l.res.write(payload); } catch (err) { listeners.delete(l); }
    }
  }
}

export function removeListener(res: any) {
  for (const l of Array.from(listeners)) if (l.res === res) listeners.delete(l);
}
