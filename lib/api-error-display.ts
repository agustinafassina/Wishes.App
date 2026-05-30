
export const CONNECTION_ERROR_MSG = 'Revisá tu conexión e intentá de nuevo.';


export function getApiErrorDisplay(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const msg = error.message;
    const name = error.name;
    if (msg === 'Failed to fetch' || name === 'TypeError') return CONNECTION_ERROR_MSG;
    if (name === 'AbortError' || /timeout|aborted/i.test(msg)) return CONNECTION_ERROR_MSG;
    const statusMatch = msg.match(/Error \((\d{3})\)|\((\d{3})\)/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1] ?? statusMatch[2], 10);
      if (status >= 500) return CONNECTION_ERROR_MSG;
    }
    return msg;
  }
  return fallback;
}
