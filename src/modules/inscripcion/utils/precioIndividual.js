// @build: 2026-11-21 | id: INDIVIDUAL-PRICING-A+ | desc: Cálculo puro del precio individual en centavos y snapshot inmutable (USD SSOT, VES congelado).

export const PRECIO_INDIVIDUAL_VERSION = 1;

const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (cents) => Number((cents / 100).toFixed(2));
const moneda = (value) => String(value || '').trim();

/**
 * Resuelve la modalidad de moto con el catálogo del curso (no confía en el cliente).
 */
export function resolverTraeMotoIndividual(curso, traeMotoSolicitado) {
  if (curso?.motoIncluida === false) return 'Sí';
  if (curso?.permiteTraerMotoPropia === false) return 'No';
  return traeMotoSolicitado === 'Sí' ? 'Sí' : 'No';
}

/**
 * Tasa FX usada para congelar el monto en VES. USD es la moneda base.
 * Coincide con la política vigente: monedaCobroClientes === 'USD' usa tasaUSD,
 * el resto usa tasaEUR.
 */
export function resolverTasaFXVigente(config = {}) {
  const esUSD = String(config?.monedaCobroClientes || '') === 'USD';
  const tasa = Number(esUSD ? config?.tasaUSD : config?.tasaEUR);
  return tasa > 0 ? tasa : 1;
}

/**
 * Convierte un monto USD a VES con la tasa congelada, redondeando a centavos.
 * Compartido por individual y packs para que servicio y reglas coincidan.
 */
export function calcularPagoTotalVES(precioTotalUSD, tasaFX) {
  const cents = Math.round((Number(precioTotalUSD) || 0) * 100);
  const tasa = Number(tasaFX) > 0 ? Number(tasaFX) : 1;
  return Number((Math.round(cents * tasa) / 100).toFixed(2));
}

/**
 * Comisión del proveedor según sede, con comisión 0 si el estudiante trae moto propia.
 */
export function resolverComisionProveedorIndividual({ curso, sedeId, traeMoto }) {
  if (traeMoto === 'Sí') return 0;
  const porSede = curso?.comisionProveedorPorSede || {};
  const clave = sedeId != null ? String(sedeId) : null;
  if (clave && Object.prototype.hasOwnProperty.call(porSede, clave)) {
    return Number(porSede[clave]) || 0;
  }
  return Number(curso?.comisionProveedor) || 0;
}

/**
 * Calcula el snapshot financiero de una reserva individual.
 * El servicio debe copiar los valores verbatim; las reglas los comparan contra
 * el catálogo (cursos + configuraciones + sedes).
 */
export function calcularPrecioIndividual({
  curso = null,
  config = {},
  sede = null,
  sedeId = null,
  sabeBicicleta = 'Sí',
  traeMoto: traeMotoSolicitado = 'No',
  calculadoEn = null,
  calculadoPor = null,
  origen = 'cliente',
} = {}) {
  if (!curso || !curso.id) {
    throw new Error('No se puede calcular el precio individual sin curso.');
  }

  const idSede = sedeId != null ? String(sedeId) : (sede?.id != null ? String(sede.id) : null);
  const traeMoto = resolverTraeMotoIndividual(curso, traeMotoSolicitado);
  const esGuarenas = String(sede?.nombre || '') === 'Guarenas';

  const precioBaseCursoCents = toCents(curso?.precioBase);
  const precioBaseCents = precioBaseCursoCents > 0
    ? precioBaseCursoCents
    : toCents(config?.precioBase);
  if (precioBaseCents <= 0) {
    throw new Error('El curso no tiene un precio base válido.');
  }

  const recargoSedeCents = esGuarenas ? toCents(config?.recargoGuarenas) : 0;
  const recargoSinBiciCents = sabeBicicleta === 'No' ? toCents(config?.recargoSinBici) : 0;
  const descuentoMotoPropiaCents = traeMoto === 'Sí' ? toCents(config?.descuentoMotoPropia) : 0;
  const recargoAlquilerMotoCents = (traeMoto !== 'Sí' && curso?.motoIncluida !== false)
    ? toCents(curso?.precioAlquilerMoto)
    : 0;
  const descuentoPromoCents = toCents(config?.descuentoPromo);

  let precioTotalCents = precioBaseCents
    + recargoSedeCents
    + recargoSinBiciCents
    + recargoAlquilerMotoCents
    - descuentoMotoPropiaCents
    - descuentoPromoCents;
  if (precioTotalCents < 0) precioTotalCents = 0;
  if (precioTotalCents <= 0) {
    throw new Error('El precio final del curso debe ser mayor que cero.');
  }

  const comisionInstructorCents = toCents(curso?.comisionInstructor);
  const comisionProveedorCents = toCents(resolverComisionProveedorIndividual({
    curso,
    sedeId: idSede,
    traeMoto,
  }));
  const deficitComisionCents = comisionInstructorCents + comisionProveedorCents - precioTotalCents;

  const monedaCobro = moneda(config?.monedaCobroClientes) || 'EUR';
  const tasaFX = resolverTasaFXVigente(config);
  const precioTotal = fromCents(precioTotalCents);
  const pagoTotalVES = calcularPagoTotalVES(precioTotal, tasaFX);

  return {
    version: PRECIO_INDIVIDUAL_VERSION,
    moneda: 'USD',
    monedaCobro,
    tasaFX,
    cursoId: String(curso.id),
    sedeId: idSede,
    sedeNombre: sede?.nombre || null,
    guarenas: esGuarenas,
    sabeBicicleta,
    traeMoto,
    motoIncluida: curso?.motoIncluida !== false,
    permiteTraerMotoPropia: curso?.permiteTraerMotoPropia !== false,
    precioBase: fromCents(precioBaseCents),
    recargoSede: fromCents(recargoSedeCents),
    recargoSinBici: fromCents(recargoSinBiciCents),
    recargoAlquilerMoto: fromCents(recargoAlquilerMotoCents),
    descuentoMotoPropia: fromCents(descuentoMotoPropiaCents),
    descuentoPromo: fromCents(descuentoPromoCents),
    precioTotal,
    pagoTotalVES,
    comisionInstructor: fromCents(comisionInstructorCents),
    comisionProveedor: fromCents(comisionProveedorCents),
    deficitComision: fromCents(deficitComisionCents),
    calculadoEn,
    calculadoPor,
    origen,
  };
}
