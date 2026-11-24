// @build: 2026-11-22 | id: SEDES-HELPER-CANONICO | desc: Puente de presentación para el nombre canónico de cada sede.
//
// IMPORTANTE: esto es un puente de presentación mientras se normalizan los datos
// de sedes en DEV. NO reemplaza la migración de datos: el catálogo real puede traer
// IDs/nombres históricos distintos. No muta los objetos recibidos.

// T-048 / FT-031: la jerarquía geográfica vive en helpers puros y se reexporta
// aquí para que los consumidores de sedes tengan un único punto de entrada.
export {
  agruparSedesPorCiudad,
  etiquetaUbicacionSede,
  resolverCadenaSede,
} from './geografiaHelpers.js';

import { resolverCadenaSede } from './geografiaHelpers.js';

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

// FT-050: la ciudad de la sede sale del catálogo (ciudadId) o del propio doc.
// No se usa `zona`: es la referencia física (barrio/edificio), no la ciudad.
export function ciudadSede(sede, catalogos = {}) {
  if (!sede || typeof sede !== 'object') return '';
  const { ciudad } = resolverCadenaSede(sede, catalogos);
  return String(ciudad?.nombre ?? sede.ciudad ?? '').trim();
}

// FT-050: etiqueta por defecto "nombre de la sede - ciudad", sin calle ni avenida.
// Usa el nombre real de la sede (el que administra el Operador) y cae al canónico
// si el doc no lo trae. Si la ciudad ya está contenida en el nombre, no se repite.
// La dirección completa queda como opt-in (mensajes).
export function etiquetaCortaSede(sede, catalogos = {}) {
  if (!sede || typeof sede !== 'object') return '—';

  const nombreReal = typeof sede.nombre === 'string' ? sede.nombre.trim() : '';
  const nombre = nombreReal || nombreSedeCanonico(sede);
  if (!nombre || nombre === '—') return '—';

  const ciudad = ciudadSede(sede, catalogos);
  if (!ciudad) return nombre;
  if (normalizarTexto(nombre).includes(normalizarTexto(ciudad))) return nombre;
  return `${nombre} - ${ciudad}`;
}

export function formatearSede(sede, opciones = {}) {
  if (!sede) return '—';

  // Uso explícito para mensajes y sitios que requieren la dirección exacta.
  if (opciones.incluirDireccion === true) {
    const nombre = nombreSedeCanonico(sede);
    return sede.direccion ? `${nombre} - ${sede.direccion}` : nombre;
  }

  return etiquetaCortaSede(sede, opciones.catalogos);
}
