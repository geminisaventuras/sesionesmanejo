// @build: 2026-11-21 | id: PACK-PRICING-A+ | desc: Cálculo puro de precios de pack en centavos, snapshot único para admin, servicio y backfill.

export const PACK_PRICING_VERSION = 1;

const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (cents) => Number((cents / 100).toFixed(2));
const cents = (value) => Math.max(0, toCents(value));

/**
 * Calcula el snapshot financiero de un pack.
 * Los cursos deben venir en el orden de cursoIds. Los precios se redondean
 * una sola vez y el servicio debe copiarlos verbatim.
 */
export function calcularPreciosPack({
  cursos = [],
  cursosTeoricos = [],
  descuentoTipo = 'porcentaje',
  descuentoValor = 0,
  sumarTeoricosAlPrecio = false,
  calculadoEn = null,
  calculadoPor = null,
} = {}) {
  const cursosValidos = (cursos || []).filter(Boolean);
  if (cursosValidos.length === 0) {
    throw new Error('El pack debe tener al menos un curso de sesiones.');
  }

  const cursoIds = cursosValidos.map((curso) => String(curso.id));
  const preciosBaseCents = cursosValidos.map((curso) => cents(curso.precioBase));
  const baseSesionesCents = preciosBaseCents.reduce((acc, value) => acc + value, 0);
  if (baseSesionesCents <= 0) {
    throw new Error('La base de precios de las sesiones debe ser mayor que cero.');
  }

  const teoricosValidos = sumarTeoricosAlPrecio ? (cursosTeoricos || []).filter(Boolean) : [];
  const teoricosIds = teoricosValidos.map((curso) => String(curso.id));
  const teoricosPreciosCents = teoricosValidos.map((curso) => cents(curso.precio));
  const baseTeoricosCents = teoricosPreciosCents.reduce((acc, value) => acc + value, 0);
  const baseTotalCents = baseSesionesCents + baseTeoricosCents;

  const valorDescuento = Math.max(0, Number(descuentoValor) || 0);
  const descuentoCalculadoCents = descuentoTipo === 'porcentaje'
    ? Math.round((baseTotalCents * valorDescuento) / 100)
    : Math.round(valorDescuento * 100);
  const descuentoAplicadoCents = Math.min(baseTotalCents, Math.max(0, descuentoCalculadoCents));
  const precioTotalCents = baseTotalCents - descuentoAplicadoCents;

  const preciosProrrateadosCents = [];
  let acumuladoCents = 0;
  for (let index = 0; index < cursosValidos.length; index += 1) {
    if (index === cursosValidos.length - 1) {
      preciosProrrateadosCents.push(precioTotalCents - acumuladoCents);
      continue;
    }
    const prorrateado = Math.floor((precioTotalCents * preciosBaseCents[index]) / baseSesionesCents);
    preciosProrrateadosCents.push(prorrateado);
    acumuladoCents += prorrateado;
  }

  const comisionesInstructorCents = cursosValidos.map((curso) => cents(curso.comisionInstructor));
  const comisionesProveedorEmpresaCents = cursosValidos.map((curso) => cents(curso.comisionProveedor));
  const comisionesProveedorPropiaCents = cursosValidos.map(() => 0);

  const deficitsEmpresaCents = preciosProrrateadosCents.map((prorrateado, index) =>
    comisionesInstructorCents[index] + comisionesProveedorEmpresaCents[index] - prorrateado
  );
  const deficitsPropiaCents = preciosProrrateadosCents.map((prorrateado, index) =>
    comisionesInstructorCents[index] - prorrateado
  );

  return {
    version: PACK_PRICING_VERSION,
    moneda: 'USD',
    baseSesiones: fromCents(baseSesionesCents),
    baseTeoricos: fromCents(baseTeoricosCents),
    precioBaseTotal: fromCents(baseTotalCents),
    descuentoTipo,
    descuentoValor: valorDescuento,
    descuentoMonto: fromCents(descuentoAplicadoCents),
    precioTotal: fromCents(precioTotalCents),
    cursoIds,
    preciosBase: preciosBaseCents.map(fromCents),
    preciosProrrateados: preciosProrrateadosCents.map(fromCents),
    comisionesInstructor: comisionesInstructorCents.map(fromCents),
    comisionesProveedorMotoEmpresa: comisionesProveedorEmpresaCents.map(fromCents),
    comisionesProveedorMotoPropia: comisionesProveedorPropiaCents.map(fromCents),
    deficitsMotoEmpresa: deficitsEmpresaCents.map(fromCents),
    deficitsMotoPropia: deficitsPropiaCents.map(fromCents),
    motoIncluidaPorCurso: cursosValidos.map((curso) => curso.motoIncluida !== false),
    permiteTraerMotoPropiaPorCurso: cursosValidos.map((curso) => curso.permiteTraerMotoPropia !== false),
    teoricosIncluidos: Boolean(sumarTeoricosAlPrecio && teoricosValidos.length > 0),
    teoricosIds,
    teoricosPrecios: teoricosPreciosCents.map(fromCents),
    calculadoEn,
    calculadoPor,
  };
}

/**
 * Resuelve la modalidad de moto con la configuración congelada del pack.
 * No confía en motoIncluida/permiteTraerMotoPropia del cliente.
 */
export function resolverTraeMoto(precios, index, cursoId, traeMotoPorCurso = {}) {
  const motoIncluida = precios?.motoIncluidaPorCurso?.[index] !== false;
  const permitePropia = precios?.permiteTraerMotoPropiaPorCurso?.[index] !== false;
  if (!motoIncluida) return 'Sí';
  if (!permitePropia) return 'No';
  return traeMotoPorCurso?.[String(cursoId)] === 'Sí' ? 'Sí' : 'No';
}

/**
 * Devuelve los valores congelados que debe escribir la child para el índice.
 * Con traeMoto='Sí' el proveedor no cobra y no se asigna moto escolar.
 */
export function seleccionarValoresCurso(precios, index, traeMoto, { motoAsignadaId = null, proveedorId = null } = {}) {
  const propia = traeMoto === 'Sí';
  return {
    precio: Number(precios?.preciosProrrateados?.[index] ?? 0),
    precioBaseOriginal: Number(precios?.preciosBase?.[index] ?? 0),
    comisionInstructor: Number(precios?.comisionesInstructor?.[index] ?? 0),
    comisionProveedor: propia
      ? 0
      : Number(precios?.comisionesProveedorMotoEmpresa?.[index] ?? 0),
    deficitComision: propia
      ? Number(precios?.deficitsMotoPropia?.[index] ?? 0)
      : Number(precios?.deficitsMotoEmpresa?.[index] ?? 0),
    motoAsignadaId: propia ? null : (motoAsignadaId || null),
    proveedorId: propia ? null : (proveedorId || null),
  };
}

export function sumarProrrateados(precios) {
  const totalCents = (precios?.preciosProrrateados || []).reduce(
    (acc, value) => acc + toCents(value),
    0
  );
  return fromCents(totalCents);
}
