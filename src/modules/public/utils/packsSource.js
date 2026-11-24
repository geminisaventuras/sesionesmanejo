// @build: 2026-11-22 | id: T-060-PACKS-SOURCE | desc: Fuente configurable de la colección pública de packs con fallback seguro a `packs`.
//
// Reglas:
// - Solo dos fuentes permitidas: `packs` (maestro histórico, default) y `packsPublicos` (proyección T-060).
// - Cualquier valor ausente, vacío, con espacios o desconocido cae a `packs`, para no romper DEV/PROD.
// - Solo lectura pública: los paneles admin y los servicios de compra siguen usando el maestro `packs`.
// - Función pura: no lee Firestore ni muta la configuración recibida.

export const FUENTE_PACKS_DEFECTO = 'packs';
export const FUENTE_PACKS_PUBLICOS = 'packsPublicos';
export const FUENTES_PACKS_PERMITIDAS = Object.freeze([
  FUENTE_PACKS_DEFECTO,
  FUENTE_PACKS_PUBLICOS,
]);

const PERMITIDAS = new Set(FUENTES_PACKS_PERMITIDAS);

/**
 * Normaliza una fuente de packs a un valor permitido.
 *
 * @param {*} valor Valor crudo (típicamente `VITE_PACKS_SOURCE`).
 * @returns {'packs'|'packsPublicos'} Fuente permitida; `packs` si el valor no es válido.
 */
export function resolverFuentePacks(valor) {
  const normalizado = typeof valor === 'string' ? valor.trim() : '';
  return PERMITIDAS.has(normalizado) ? normalizado : FUENTE_PACKS_DEFECTO;
}

// En Vite, `import.meta.env` es el objeto de entorno; en Node (tests unitarios) no existe.
const ENV_PACKS_SOURCE = import.meta.env ? import.meta.env.VITE_PACKS_SOURCE : undefined;

/** Colección que deben consultar las vistas públicas. */
export const PACKS_SOURCE = resolverFuentePacks(ENV_PACKS_SOURCE);
