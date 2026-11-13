// @build: 2026-11-06 | id: FORMATO-SEDE-HELPER | desc: Helper para mostrar Ciudad - Dirección de la sede.
export function formatearSede(sede) {
  if (!sede) return '—';
  if (sede.direccion) {
    return `${sede.nombre} - ${sede.direccion}`;
  }
  return sede.nombre || '—';
}
