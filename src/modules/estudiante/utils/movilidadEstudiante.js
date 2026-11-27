// T-159 / FT-086: helpers puros para mostrar la movilidad del estudiante sin PII.
export const ESTADOS_MOVILIDAD_VIGENTES = [
  'solicitada',
  'asignada',
  'en_camino',
  'recogido',
  'en_sesion',
  'retorno',
];

const ETIQUETAS = {
  solicitada: 'Solicitud enviada',
  asignada: 'Prestador asignado',
  en_camino: 'En camino',
  recogido: 'Recogido',
  en_sesion: 'En sesión',
  retorno: 'En retorno',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_presentado: 'No presentado',
};

export function etiquetaEstadoMovilidad(estado) {
  return ETIQUETAS[estado] || 'En proceso';
}

export function seleccionarSolicitudVigente(lista = []) {
  if (!Array.isArray(lista) || lista.length === 0) return null;
  const ordenadas = [...lista].sort((a, b) =>
    String(b?.fechaSesion || '').localeCompare(String(a?.fechaSesion || ''))
  );
  return ordenadas.find((solicitud) => ESTADOS_MOVILIDAD_VIGENTES.includes(solicitud?.estado)) || null;
}

export function formatearFechaSesion(fechaSesion) {
  const texto = String(fechaSesion || '');
  const partes = texto.split('-');
  if (partes.length !== 3) return '';
  const [, mes, dia] = partes;
  if (!mes || !dia) return '';
  return `${dia}/${mes}`;
}

export function resumenMovilidad(solicitud) {
  if (!solicitud || typeof solicitud !== 'object') return '';
  const fecha = formatearFechaSesion(solicitud.fechaSesion);
  const monto = Number(solicitud.montoUSD);
  const montoTexto = Number.isFinite(monto) && monto > 0 ? `USD ${monto.toFixed(2)}` : '';
  return [fecha, montoTexto].filter(Boolean).join(' · ');
}
