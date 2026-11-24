// @build: 2026-11-22 | id: SEDES-HELPER-CANONICO | desc: Puente de presentación para el nombre canónico de cada sede.
//
// IMPORTANTE: esto es un puente de presentación mientras se normalizan los datos
// de sedes en DEV. NO reemplaza la migración de datos: el catálogo real puede traer
// IDs/nombres históricos distintos. No muta los objetos recibidos.

export const SEDES_CANONICOS = Object.freeze({
  sede1: 'Guarenas',
  sede2: 'Caracas Ciudad Universitaria',
  '1793924508290': 'Caracas Montalbán',
});

const normalizarTexto = (valor) =>
  String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function nombreSedeCanonico(sede) {
  if (!sede || typeof sede !== 'object') return '—';

  const id = sede.id == null ? '' : String(sede.id);
  if (id && SEDES_CANONICOS[id]) return SEDES_CANONICOS[id];

  const nombreNormalizado = normalizarTexto(sede.nombre);
  if (nombreNormalizado) {
    if (nombreNormalizado.includes('ciudad universitaria')) {
      return SEDES_CANONICOS.sede2;
    }
    if (nombreNormalizado.includes('montalban')) {
      return SEDES_CANONICOS['1793924508290'];
    }
  }

  if (typeof sede.nombre === 'string' && sede.nombre.trim()) return sede.nombre;
  return '—';
}

export function formatearSede(sede, opciones = {}) {
  if (!sede) return '—';

  const nombre = nombreSedeCanonico(sede);
  const incluirDireccion = opciones.incluirDireccion !== false;

  if (incluirDireccion && sede.direccion) return `${nombre} - ${sede.direccion}`;
  return nombre;
}
