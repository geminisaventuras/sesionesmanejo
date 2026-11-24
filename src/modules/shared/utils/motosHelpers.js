// @build: 2026-11-23 | id: T-076-ERR-037 | desc: Etiqueta legible de moto para filtros, selects y listas (sin IDs crudos).
//
// Solo presentación: no muta la moto recibida, no cambia el `value` de los selects
// (siguen siendo IDs) ni los datos persistidos. El ID es el último recurso.

const texto = (valor) => {
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return '';
};

/**
 * Etiqueta legible de una moto.
 * Orden: `marca + modelo` → `nombre` → `Moto`; luego `· placa` o `(tipo)`.
 * Si no hay ningún dato legible, usa los últimos 6 caracteres del ID.
 * @param {object|null|undefined} moto
 * @returns {string} etiqueta lista para UI
 */
export function etiquetaMoto(moto) {
  if (!moto || typeof moto !== 'object') return 'Moto';

  const marca = texto(moto.marca);
  const modelo = texto(moto.modelo);
  const nombre = texto(moto.nombre);
  const placa = texto(moto.placa);
  const tipo = texto(moto.tipo);

  const hayDatos = Boolean(marca || modelo || nombre || placa || tipo);
  if (!hayDatos) {
    const id = texto(moto.id);
    return id ? `Moto #${id.slice(-6)}` : 'Moto';
  }

  const base = [marca, modelo].filter(Boolean).join(' ') || nombre || 'Moto';
  const detalle = placa ? ` · ${placa}` : (tipo ? ` (${tipo})` : '');
  return `${base}${detalle}`;
}
