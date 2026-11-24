// @build: 2026-11-22 | id: ADR-009-CONFIG-SPLIT | desc: Helper puro para separar/fusionar configuración operativa (main) y fiscal/interna (privada).

// ADR-009: `configuraciones/main` queda para cotizar/pagar/validar y
// `configuraciones/privada` para datos fiscales e internos.
//
// IMPORTANTE:
// - Este helper NO valida reglas de negocio, montos, tipos ni permisos.
// - NO crea documentos ni decide el destino de escrituras: solo clasifica y
//   combina objetos ya leídos de Firestore.
// - `pagoProveedor` NO se considera privado en esta fase: permanece en `main`
//   como compatibilidad explícita mientras existan reservas legacy sin comisión
//   congelada y el panel del proveedor no dependa de `privada`.
// - No muta las entradas; devuelve copias de los objetos planos y arreglos.

/**
 * Campos que ADR-009 concentra en `configuraciones/privada`.
 * Debe mantenerse alineado con el ADR; no agregar campos sin decisión registrada.
 */
export const CAMPOS_PRIVADOS = Object.freeze([
  'finanzas', // incluye `iva`
  'tasaUSDT',
  'pagoInstructor',
  'autoTasas',
  'promocionActiva',
  'metodoPagoStaffDefault',
  'bancoDefaultStaff'
]);

const esObjetoPlano = (valor) => {
  if (valor === null || typeof valor !== 'object') return false;
  const proto = Object.getPrototypeOf(valor);
  return proto === Object.prototype || proto === null;
};

const clonarValor = (valor) => {
  if (Array.isArray(valor)) return valor.map(clonarValor);
  if (esObjetoPlano(valor)) {
    const copia = {};
    for (const clave of Object.keys(valor)) copia[clave] = clonarValor(valor[clave]);
    return copia;
  }
  return valor;
};

const comoObjeto = (valor) => {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return null;
  return valor;
};

/**
 * Separa una configuración en sus partes operativa y privada.
 *
 * - Ignora `null`, arreglos y valores no-objeto (devuelve ambas partes vacías).
 * - Los campos desconocidos se conservan en `operativa` (no se adivina su destino).
 * - No muta `config`; los valores compuestos se copian.
 *
 * @param {object|null|undefined} config
 * @returns {{ operativa: object, privada: object }}
 */
export function separarConfiguracion(config) {
  const operativa = {};
  const privada = {};
  const origen = comoObjeto(config);
  if (!origen) return { operativa, privada };

  for (const clave of Object.keys(origen)) {
    const destino = CAMPOS_PRIVADOS.includes(clave) ? privada : operativa;
    destino[clave] = clonarValor(origen[clave]);
  }

  return { operativa, privada };
}

/**
 * Fusiona la configuración operativa (`main`) con los campos privados que
 * existan en `privada`, manteniendo `main` como base.
 *
 * - Si `privada` es `null`, inválida o no trae un campo privado, se conserva el
 *   valor de `main` (o queda ausente; nunca se inventan valores).
 * - Un campo privado con valor `undefined` o `null` se considera ausente para
 *   no borrar valores operativos por una lectura parcial o corrupta.
 * - Los campos desconocidos de `privada` se ignoran; no se copian a la mezcla.
 * - No muta `operativa` ni `privada`.
 *
 * @param {object|null|undefined} operativa
 * @param {object|null|undefined} privada
 * @returns {object}
 */
export function fusionarConfiguracion(operativa, privada) {
  const resultado = {};
  const base = comoObjeto(operativa);

  if (base) {
    for (const clave of Object.keys(base)) resultado[clave] = clonarValor(base[clave]);
  }

  const fuentePrivada = comoObjeto(privada);
  if (!fuentePrivada) return resultado;

  for (const campo of CAMPOS_PRIVADOS) {
    if (!Object.prototype.hasOwnProperty.call(fuentePrivada, campo)) continue;
    const valor = fuentePrivada[campo];
    if (valor === undefined || valor === null) continue;
    resultado[campo] = clonarValor(valor);
  }

  return resultado;
}
