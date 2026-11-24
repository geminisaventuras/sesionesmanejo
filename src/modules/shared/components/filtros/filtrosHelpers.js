// @build: 2026-11-23 | id: T-071-FILTROS-HELPERS | desc: Utilidades puras para el sistema compartido de filtros (sin lógica de negocio).
// Cada vista declara sus campos, valores y valores iniciales; este módulo solo agrupa,
// cuenta y resume. No consulta Firestore, no calcula dinero y no decide permisos.

/**
 * Normaliza una opción de campo a `{ valor, etiqueta }`.
 * Acepta `{ valor, etiqueta }`, `{ id, nombre }`, `{ value, label }` o un primitivo.
 */
export const normalizarOpcion = (opcion) => {
  if (opcion === null || opcion === undefined) return { valor: '', etiqueta: '' };
  if (typeof opcion !== 'object') return { valor: opcion, etiqueta: String(opcion) };
  if (Object.prototype.hasOwnProperty.call(opcion, 'valor')) {
    return {
      valor: opcion.valor,
      etiqueta: opcion.etiqueta ?? String(opcion.valor ?? ''),
    };
  }
  if (Object.prototype.hasOwnProperty.call(opcion, 'id')) {
    return {
      valor: opcion.id,
      etiqueta: opcion.nombre ?? String(opcion.id ?? ''),
    };
  }
  if (Object.prototype.hasOwnProperty.call(opcion, 'value')) {
    return {
      valor: opcion.value,
      etiqueta: opcion.label ?? String(opcion.value ?? ''),
    };
  }
  return { valor: '', etiqueta: '' };
};

/** Normaliza la lista completa de opciones de un campo. */
export const normalizarOpciones = (campo) =>
  (Array.isArray(campo?.opciones) ? campo.opciones : []).map(normalizarOpcion);

/** Valor predeterminado declarado por el campo, con fallback por tipo. */
export const valorPorDefecto = (campo) => {
  if (!campo) return '';
  if (campo.defecto !== undefined) return campo.defecto;
  if (campo.tipo === 'switch') return false;
  if (campo.tipo === 'rango') return { desde: '', hasta: '' };
  if (campo.tipo === 'chips') {
    const primera = normalizarOpciones(campo)[0];
    return primera ? primera.valor : '';
  }
  return '';
};

/** Construye el objeto de valores iniciales de todos los campos declarados. */
export const construirValoresIniciales = (campos = [], iniciales = {}) => {
  const salida = {};
  (Array.isArray(campos) ? campos : []).forEach((campo) => {
    salida[campo.id] = Object.prototype.hasOwnProperty.call(iniciales, campo.id)
      ? iniciales[campo.id]
      : valorPorDefecto(campo);
  });
  return salida;
};

/** Comparación estructural mínima para valores primitivos y objetos tipo rango. */
export const valoresIguales = (a, b) => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const clavesA = Object.keys(a);
  const clavesB = Object.keys(b);
  if (clavesA.length !== clavesB.length) return false;
  return clavesA.every((clave) => valoresIguales(a[clave], b[clave]));
};

/**
 * Decide si un campo cuenta como filtro activo.
 * Prioridad: `campo.esActivo(valor, defecto)` de la vista; si no existe, comparación
 * contra el valor predeterminado (D5: la fecha por defecto no suma).
 */
export const esCampoActivo = (campo, valor, defecto) => {
  if (typeof campo?.esActivo === 'function') return Boolean(campo.esActivo(valor, defecto));
  if (valor === undefined || valor === null) return false;
  if (campo?.tipo === 'rango') {
    return (
      String(valor?.desde ?? '') !== String(defecto?.desde ?? '') ||
      String(valor?.hasta ?? '') !== String(defecto?.hasta ?? '')
    );
  }
  if (typeof valor === 'string') return valor.trim() !== '' && !valoresIguales(valor, defecto);
  return !valoresIguales(valor, defecto);
};

const defectoDeCampo = (campo, iniciales = {}) =>
  Object.prototype.hasOwnProperty.call(iniciales, campo.id)
    ? iniciales[campo.id]
    : valorPorDefecto(campo);

/** Cuenta los campos no predeterminados. */
export const contarFiltrosActivos = (campos = [], valores = {}, iniciales = {}) =>
  (Array.isArray(campos) ? campos : []).reduce((total, campo) => {
    const defecto = defectoDeCampo(campo, iniciales);
    return total + (esCampoActivo(campo, valores?.[campo.id], defecto) ? 1 : 0);
  }, 0);

/**
 * Resumen corto de filtros activos, por ejemplo `['Sede Centro', 'Curso Básico', '+2']`.
 * `max` limita las etiquetas visibles; el resto se agrupa como `+N`.
 * Si el campo define `resumen(valor, defecto)`, manda ese texto; si no, usa su etiqueta.
 */
export const construirResumenActivo = (campos = [], valores = {}, iniciales = {}, opciones = {}) => {
  const max = opciones.max ?? 2;
  const activos = [];
  (Array.isArray(campos) ? campos : []).forEach((campo) => {
    const defecto = defectoDeCampo(campo, iniciales);
    const valor = valores?.[campo.id];
    if (!esCampoActivo(campo, valor, defecto)) return;
    const etiqueta =
      typeof campo.resumen === 'function' ? campo.resumen(valor, defecto) : campo.etiqueta;
    if (etiqueta !== undefined && etiqueta !== null && String(etiqueta).trim() !== '') {
      activos.push(String(etiqueta));
    }
  });
  if (max > 0 && activos.length > max) {
    return [...activos.slice(0, max), `+${activos.length - max}`];
  }
  return activos;
};

/**
 * Agrupa campos conservando el orden de aparición; devuelve `{ grupo, campos }`.
 * Los campos sin `grupo` se agrupan aparte con `grupo: null` y sin leyenda.
 */
export const agruparCampos = (campos = []) => {
  const grupos = [];
  const indice = new Map();
  (Array.isArray(campos) ? campos : []).forEach((campo) => {
    const grupo = campo?.grupo ? String(campo.grupo) : null;
    const clave = grupo ?? '__sinGrupo';
    if (!indice.has(clave)) {
      const entrada = { grupo, campos: [] };
      indice.set(clave, entrada);
      grupos.push(entrada);
    }
    indice.get(clave).campos.push(campo);
  });
  return grupos;
};

/** Texto accesible del botón/panel a partir del contador y el resumen. */
export const etiquetaContador = (contador = 0) =>
  contador > 0 ? `${contador} activo${contador === 1 ? '' : 's'}` : 'sin filtros';
