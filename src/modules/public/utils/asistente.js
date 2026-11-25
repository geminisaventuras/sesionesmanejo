// Cliente del asistente (FT-061). El widget solo se activa con VITE_ASISTENTE_IA=true
// y una URL de Worker configurada; sin eso no se renderiza nada.
const ENDPOINT = String(import.meta.env?.VITE_ASISTENTE_URL || '').replace(/\/+$/, '');

export const ASISTENTE_ACTIVO = import.meta.env?.VITE_ASISTENTE_IA === 'true' && Boolean(ENDPOINT);
// El Home usa el boton Chat -> /chat (pantalla completa); el flotante queda en las vitrinas.
export const RUTAS_ASISTENTE = ['/packs', '/sesiones'];

export async function preguntarAsistente({
  mensaje,
  pagina = '/',
  historial = [],
  fetchImpl = fetch,
  endpoint = ENDPOINT,
  timeoutMs = 20000,
} = {}) {
  const turnos = Array.isArray(historial)
    ? historial.slice(-6).map((turno) => ({ rol: turno?.rol, texto: String(turno?.texto || '').slice(0, 600) }))
    : [];
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${endpoint}/asistente`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mensaje, pagina, historial: turnos }),
      signal: control.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        respuesta: data?.respuesta || '',
        derivarWhatsapp: true,
        whatsappUrl: data?.whatsappUrl || null,
        motivo: data?.motivo || `http_${res.status}`,
      };
    }
    return { ok: true, ...data };
  } catch {
    return { ok: false, respuesta: '', derivarWhatsapp: true, whatsappUrl: null, motivo: 'sin_conexion' };
  } finally {
    clearTimeout(timer);
  }
}
