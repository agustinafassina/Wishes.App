/** Mensaje sugerido cuando el error parece de red (5xx, timeout, sin conexión). */
export const CONNECTION_ERROR_MSG = 'Revisá tu conexión e intentá de nuevo.';

/**
 * Devuelve un mensaje amigable para mostrar al usuario.
 * En errores 5xx, timeout o de red usa CONNECTION_ERROR_MSG; en el resto el mensaje del error o el fallback.
 */
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
