// @build: 2026-11-19 | id: FINANZAS-SSOT | desc: Cálculo único de comisiones y pendientes para admin/staff/proveedor
//
// Regla de oro:
// - Instructor: comisión congelada en la reserva; si es compartida, se aplica el %.
// - Proveedor: comisión congelada en la reserva; config.pagoProveedor es SOLO
//   fallback para reservas legacy que no tienen el campo.
// - Proveedor asignado: reserva.proveedorId es la fuente de verdad; no se infiere
//   por el dueño de la moto (eso causaba deudas en el proveedor equivocado).

const numero = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
};

const idIgual = (a, b) => String(a) === String(b);

export function comisionInstructorReserva(reserva, staffId, { permitirColaboracion = false } = {}) {
  if (!reserva) return 0;

  // T-025 / FT-001: el mapa D1/D2 es la fuente de verdad cuando el tutor
  // original ya cobró y otro tutor cubre D2. Devuelve solo la parte del tutor.
  if (reserva.pagosInstructorDia) {
    const asignaciones = asignacionesInstructorDe(reserva, staffId);
    if (asignaciones.length === 0) return 0;
    return redondear2(asignaciones.reduce((acc, asignacion) => acc + numero(asignacion.monto), 0));
  }

  const comision = numero(reserva.comisionInstructor);

  if (reserva.esReservaCompartida === true) {
    const involucrado = (reserva.instructoresInvolucrados || []).find(
      (inv) => idIgual(inv.id, staffId)
    );
    if (!involucrado) return 0;
    return comision * numero(involucrado.porcentaje) / 100;
  }

  if (idIgual(reserva.instructorId, staffId)) return comision;

  if (permitirColaboracion && (reserva.implicadosIds || []).some((id) => idIgual(id, staffId))) {
    return comision;
  }

  return 0;
}

export function comisionInstructorTotal(reserva) {
  if (!reserva) return 0;

  if (reserva.pagosInstructorDia) {
    const asignaciones = construirAsignacionesInstructor(reserva);
    if (asignaciones.length > 0) {
      return redondear2(asignaciones.reduce((acc, asignacion) => acc + numero(asignacion.monto), 0));
    }
  }

  const comision = numero(reserva.comisionInstructor);

  if (reserva.esReservaCompartida === true) {
    const involucrados = reserva.instructoresInvolucrados || [];
    if (involucrados.length === 0) return comision;
    return involucrados.reduce(
      (acc, inv) => acc + (comision * numero(inv.porcentaje) / 100),
      0
    );
  }

  return comision;
}

export function comisionProveedorReserva(reserva, config = {}) {
  if (!reserva) return 0;
  if (reserva.comisionProveedor !== undefined && reserva.comisionProveedor !== null) {
    return numero(reserva.comisionProveedor);
  }
  return numero(config?.pagoProveedor);
}

export function esPendienteInstructor(reserva, staffId, { permitirColaboracion = false } = {}) {
  if (!reserva || reserva.estadoPago !== 'Aprobado') return false;

  // T-025 / FT-001: con mapa D1/D2, la deuda/pendiente se evalúa por asignación.
  if (reserva.pagosInstructorDia) {
    return asignacionesPendientesInstructor(reserva, staffId).length > 0;
  }

  if (reserva.esReservaCompartida === true) {
    const involucrado = (reserva.instructoresInvolucrados || []).find(
      (inv) => idIgual(inv.id, staffId)
    );
    return Boolean(involucrado) && involucrado.pagado !== true;
  }

  if (!idIgual(reserva.instructorId, staffId)) {
    if (!permitirColaboracion) return false;
    const esColaborador = (reserva.implicadosIds || []).some((id) => idIgual(id, staffId));
    if (!esColaborador) return false;
  }

  return reserva.pagadoInstructor !== true;
}

// T-025 / FT-001: asignaciones de comisión del tutor por día (D1/D2), análogas
// a las del proveedor. Sin mapa se conserva el comportamiento legacy (unico o
// compartida por porcentaje).
export function construirAsignacionesInstructor(reserva) {
  if (!reserva) return [];

  const total = redondear2(numero(reserva.comisionInstructor));
  const mapa = reserva.pagosInstructorDia || null;

  const desdeMapa = (dia, entrada) => {
    const monto = redondear2(entrada?.monto);
    const marcaPago = entrada?.pagado === true || Boolean(entrada?.pagoId) || entrada?.montoPagado != null;
    return {
      dia,
      instructorId: entrada?.instructorId ?? null,
      nombre: entrada?.nombre || '',
      monto,
      pagado: entrada?.pagado === true || Boolean(entrada?.pagoId),
      pagoId: entrada?.pagoId || null,
      montoPagado: marcaPago ? redondear2(numero(entrada?.montoPagado, monto)) : 0
    };
  };

  if (mapa) {
    const dias = ['d1', 'd2'].filter((dia) => mapa[dia]);
    if (dias.length > 0) return dias.map((dia) => desdeMapa(dia, mapa[dia]));
    if (mapa.unico) return [desdeMapa('unico', mapa.unico)];
  }

  if (reserva.esReservaCompartida === true) {
    return (reserva.instructoresInvolucrados || []).map((involucrado) => {
      const monto = redondear2(total * numero(involucrado.porcentaje) / 100);
      return {
        dia: 'compartido',
        instructorId: involucrado.id ?? null,
        nombre: involucrado.nombre || '',
        monto,
        pagado: involucrado.pagado === true,
        pagoId: involucrado.pagoId || null,
        montoPagado: involucrado.pagado === true ? monto : 0
      };
    });
  }

  return [{
    dia: 'unico',
    instructorId: reserva.instructorId ?? null,
    nombre: '',
    monto: total,
    pagado: reserva.pagadoInstructor === true,
    pagoId: reserva.pagoInstructorId || null,
    montoPagado: reserva.pagadoInstructor === true ? total : 0
  }];
}

export function asignacionesInstructorDe(reserva, staffId) {
  if (!reserva || staffId == null) return [];
  return construirAsignacionesInstructor(reserva).filter(
    (asignacion) => idIgual(asignacion.instructorId, staffId)
  );
}

export function asignacionesPendientesInstructor(reserva, staffId) {
  return asignacionesInstructorDe(reserva, staffId).filter(
    (asignacion) => asignacion.pagado !== true
  );
}

export function montoPendienteInstructor(reserva, staffId) {
  return redondear2(
    asignacionesPendientesInstructor(reserva, staffId)
      .reduce((acc, asignacion) => acc + numero(asignacion.monto), 0)
  );
}

/**
 * Detecta si el curso ya inició para efectos del relevo de tutor.
 * El estado del curso manda: `En Curso`, `Aprobado` y `Completado` son
 * evidencia explícita de inicio aunque falten marcas de sesión.
 */
const ESTADOS_CURSO_INICIADO = ['En Curso', 'Aprobado', 'Completado'];

export function cursoIniciadoParaRelevo(reserva) {
  if (!reserva) return false;
  if (ESTADOS_CURSO_INICIADO.includes(reserva.estadoCurso)) return true;

  const modulos = reserva.modulosEstado ? Object.values(reserva.modulosEstado) : [];
  return Boolean(
    reserva.sesionTotalInicio ||
    reserva.sesionDiariaInicio ||
    reserva.moduloEnProgreso ||
    (typeof reserva.tiempoEfectivo === 'number' && reserva.tiempoEfectivo > 0) ||
    reserva.pausaActiva ||
    modulos.some((valor) => valor === true || Boolean(valor?.fecha) || valor?.completado === true)
  );
}

/**
 * Calcula el relevo de tutor post-pago con la regla aprobada FT-001:
 * - D1 pagado se conserva.
 * - Si el curso inició: 50/50 fijo (D1 original, D2 nuevo).
 * - Si no inició: 100% al nuevo tutor.
 * - Si el tutor saliente cobró de más, se genera deuda por el exceso.
 * Es puro: no escribe ni lee Firestore.
 */
export function calcularRelevoTutor(reserva, {
  instructorDestinoId,
  instructorDestinoNombre = '',
  inicioCurso = false
} = {}) {
  if (!reserva || !instructorDestinoId) return null;

  const total = redondear2(numero(reserva.comisionInstructor));
  const origenId = reserva.instructorId ?? null;
  const previoMap = reserva.pagosInstructorDia || null;
  const previas = construirAsignacionesInstructor(reserva);
  const legacyPagado = reserva.pagadoInstructor === true && !previoMap;
  const pagosInstructorDia = {};
  const deudas = [];

  const agregarDeuda = (instructorId, monto, motivo) => {
    if (instructorId == null || instructorId === '') return;
    const valor = redondear2(numero(monto));
    if (!(valor > 0.004)) return;
    const existente = deudas.find((deuda) => idIgual(deuda.instructorId, instructorId));
    if (existente) {
      existente.monto = redondear2(existente.monto + valor);
      return;
    }
    deudas.push({ instructorId, monto: valor, motivo });
  };

  const cobradoDe = (asignacion) => {
    if (!asignacion) return 0;
    if (!asignacion.pagado && !(numero(asignacion.montoPagado) > 0)) return 0;
    return redondear2(numero(asignacion.montoPagado, asignacion.monto));
  };

  if (!inicioCurso) {
    // El nuevo tutor cobra el 100%; todo lo ya pagado a otros es deuda.
    previas.forEach((asignacion) => {
      if (idIgual(asignacion.instructorId, instructorDestinoId)) return;
      agregarDeuda(asignacion.instructorId, cobradoDe(asignacion), 'relevo_tutor_no_servido');
    });

    pagosInstructorDia.unico = {
      instructorId: instructorDestinoId,
      nombre: instructorDestinoNombre,
      monto: total,
      montoPagado: 0,
      pagado: false,
      pagoId: null
    };
  } else {
    const { d1, d2 } = repartirComision(total);
    const originalId = previoMap?.d1?.instructorId || reserva.instructorOriginalId || origenId;

    let cobradoD1 = 0;
    let pagoIdD1 = null;
    let d1Pagado = false;

    const entradaD1 = previoMap?.d1 && (
      !previoMap.d1.instructorId || idIgual(previoMap.d1.instructorId, originalId)
    ) ? previoMap.d1 : null;

    if (entradaD1) {
      const marcaPago = entradaD1.pagado === true || Boolean(entradaD1.pagoId) || entradaD1.montoPagado != null;
      if (marcaPago) {
        cobradoD1 = redondear2(numero(entradaD1.montoPagado, d1));
        pagoIdD1 = entradaD1.pagoId || null;
        d1Pagado = true;
      }
    } else if (previoMap?.unico && idIgual(previoMap.unico.instructorId, originalId)) {
      const marcaPago = previoMap.unico.pagado === true ||
        Boolean(previoMap.unico.pagoId) ||
        previoMap.unico.montoPagado != null;
      if (marcaPago) {
        cobradoD1 = redondear2(numero(previoMap.unico.montoPagado, d1));
        pagoIdD1 = previoMap.unico.pagoId || null;
        d1Pagado = true;
      }
    } else if (legacyPagado) {
      cobradoD1 = total;
      pagoIdD1 = reserva.pagoInstructorId || null;
      d1Pagado = true;
    }

    pagosInstructorDia.d1 = {
      instructorId: originalId,
      nombre: entradaD1?.nombre || '',
      monto: d1,
      montoPagado: redondear2(cobradoD1),
      pagado: d1Pagado,
      pagoId: pagoIdD1
    };

    // El original conserva D1; cualquier exceso cobrado es deuda.
    agregarDeuda(originalId, cobradoD1 - d1, 'relevo_tutor_sobrepago');

    // Un D2 anterior ya pagado que deja de servir también debe devolver su parte.
    const anteriorD2 = previoMap?.d2;
    if (anteriorD2?.instructorId && !idIgual(anteriorD2.instructorId, instructorDestinoId)) {
      const marcaPago = anteriorD2.pagado === true ||
        Boolean(anteriorD2.pagoId) ||
        anteriorD2.montoPagado != null;
      if (marcaPago) {
        const monto = redondear2(numero(anteriorD2.montoPagado, d2));
        agregarDeuda(anteriorD2.instructorId, monto, 'relevo_tutor_reasignado');
      }
    }

    pagosInstructorDia.d2 = {
      instructorId: instructorDestinoId,
      nombre: instructorDestinoNombre,
      monto: d2,
      montoPagado: 0,
      pagado: false,
      pagoId: null
    };
  }

  const todosPagados = Object.values(pagosInstructorDia).every(
    (asignacion) => asignacion.pagado === true
  );

  return {
    pagosInstructorDia,
    deudas,
    pagadoInstructor: todosPagados
  };
}

// D2-FINANZAS: una reserva de 2 días puede reponerse con otro proveedor. La
// comisión congelada no cambia; solo se reparte entre D1 (original) y D2
// (reposición). Sin reposición distinta, el 100% sigue siendo del original.

const redondear2 = (valor) => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;

const centavosDe = (valor) => Math.round(numero(valor) * 100);

const esSplitProveedor = (reserva) => {
  if (!reserva) return false;
  const original = reserva.proveedorId;
  const reposicion = reserva.proveedorReposicionId;
  if (original == null || original === '' || reposicion == null || reposicion === '') return false;
  return !idIgual(original, reposicion);
};

// Reparto aprobado: D1 = floor(total * 100 / 2) / 100; D2 absorbe el residuo.
const repartirComision = (total) => {
  const centavos = centavosDe(total);
  const d1Centavos = Math.floor(centavos / 2);
  return {
    d1: d1Centavos / 100,
    d2: (centavos - d1Centavos) / 100
  };
};

/**
 * Asignaciones de la comisión de proveedor para una reserva.
 * Devuelve siempre un array (vacío solo si no hay reserva).
 * - Sin split: [{ dia: 'unico', ... }]
 * - Con split: [{ dia: 'd1', ... }, { dia: 'd2', ... }]
 */
export function construirAsignacionesProveedor(reserva, config = {}) {
  if (!reserva) return [];

  const total = redondear2(comisionProveedorReserva(reserva, config));
  const mapa = reserva.pagosProveedorDia || null;
  // Legacy: flag global pagadoProveedor sin desglose por día.
  const legacyPagado = reserva.pagadoProveedor === true && !mapa;

  if (!esSplitProveedor(reserva)) {
    const entrada = mapa?.unico || null;
    let pagado;
    let pagoId;
    if (entrada) {
      pagado = entrada.pagado === true || Boolean(entrada.pagoId);
      pagoId = entrada.pagoId || null;
    } else {
      pagado = legacyPagado || reserva.pagadoProveedor === true;
      pagoId = pagado ? (reserva.pagoProveedorId || null) : null;
    }
    return [{
      dia: 'unico',
      proveedorId: reserva.proveedorId ?? null,
      monto: total,
      pagado,
      pagoId
    }];
  }

  const { d1, d2 } = repartirComision(total);

  const construir = (dia, proveedorId, monto) => {
    const entradaBruta = mapa?.[dia] || null;
    // Si el mapa es de otro proveedor (reposición repetida), no se hereda el pago.
    const entrada = entradaBruta &&
      (!entradaBruta.proveedorId || idIgual(entradaBruta.proveedorId, proveedorId))
      ? entradaBruta
      : null;
    let pagado = false;
    let pagoId = null;
    if (entrada) {
      pagado = entrada.pagado === true || Boolean(entrada.pagoId);
      pagoId = entrada.pagoId || null;
    } else if (legacyPagado && dia === 'd1') {
      pagado = true;
      pagoId = reserva.pagoProveedorId || null;
    }
    return {
      dia,
      proveedorId: proveedorId ?? null,
      monto: redondear2(monto),
      pagado,
      pagoId
    };
  };

  return [
    construir('d1', reserva.proveedorId, d1),
    construir('d2', reserva.proveedorReposicionId, d2)
  ];
}

export function asignacionesPendientesProveedor(reserva, staffId, config = {}) {
  if (!reserva || staffId == null) return [];
  return construirAsignacionesProveedor(reserva, config).filter(
    (asignacion) => idIgual(asignacion.proveedorId, staffId) && asignacion.pagado !== true
  );
}

export function montoPendienteProveedor(reserva, staffId, config = {}) {
  return redondear2(
    asignacionesPendientesProveedor(reserva, staffId, config)
      .reduce((acc, asignacion) => acc + numero(asignacion.monto), 0)
  );
}

export function esPendienteProveedor(reserva, staffId, config = {}) {
  if (!reserva || reserva.estadoPago !== 'Aprobado') return false;
  return asignacionesPendientesProveedor(reserva, staffId, config).length > 0;
}

/**
 * Deuda del proveedor original cuando ya cobró más que su D1 y la reserva se
 * repuso en D2 con otro proveedor. Es puro; no escribe ni lee Firestore.
 */
/**
 * Deudas generadas al reprogramar D2: cubre el exceso legacy del proveedor
 * original y también a un proveedor D2 anterior que ya cobró y deja de servir.
 * Devuelve un array; puede haber más de un deudor por reserva.
 */
export function calcularDeudasReprogramacionD2(reserva, config = {}) {
  if (!reserva) return [];

  const asignaciones = construirAsignacionesProveedor(reserva, config);
  const d1 = asignaciones.find((asignacion) => asignacion.dia === 'd1');
  if (!d1) return [];

  const mapa = reserva.pagosProveedorDia || null;
  const deudas = [];

  const agregar = (proveedorId, monto, motivo) => {
    if (proveedorId == null || proveedorId === '') return;
    const valor = redondear2(numero(monto));
    if (!(valor > 0.004)) return;
    const existente = deudas.find((deuda) => idIgual(deuda.proveedorId, proveedorId));
    if (existente) {
      existente.monto = redondear2(existente.monto + valor);
      return;
    }
    deudas.push({ proveedorId, monto: valor, motivo });
  };

  const legacyPagado = reserva.pagadoProveedor === true && !mapa;
  let cobradoOriginal = 0;

  if (legacyPagado) {
    cobradoOriginal = comisionProveedorReserva(reserva, config);
  } else if (mapa?.d1) {
    const entrada = mapa.d1;
    const delMismo = !entrada.proveedorId || idIgual(entrada.proveedorId, reserva.proveedorId);
    const marcaPago = entrada.pagado === true || Boolean(entrada.pagoId) || entrada.montoPagado != null;
    if (delMismo && marcaPago) cobradoOriginal = numero(entrada.montoPagado, d1.monto);
  }

  agregar(reserva.proveedorId, cobradoOriginal - d1.monto, 'reposicion_d2_no_servida');

  const anteriorD2 = mapa?.d2;
  if (anteriorD2?.proveedorId && !idIgual(anteriorD2.proveedorId, reserva.proveedorReposicionId)) {
    const pagado = anteriorD2.pagado === true ||
      Boolean(anteriorD2.pagoId) ||
      numero(anteriorD2.montoPagado) > 0.004;
    if (pagado) {
      const monto = anteriorD2.montoPagado != null
        ? numero(anteriorD2.montoPagado)
        : numero(anteriorD2.monto);
      agregar(anteriorD2.proveedorId, monto, 'reposicion_d2_reasignada');
    }
  }

  return deudas;
}

export function calcularDeudaSobrepagoProveedor(reserva, config = {}) {
  if (!reserva || !esSplitProveedor(reserva)) return null;

  const asignaciones = construirAsignacionesProveedor(reserva, config);
  const d1 = asignaciones.find((asignacion) => asignacion.dia === 'd1');
  if (!d1) return null;

  const mapa = reserva.pagosProveedorDia || null;
  const legacyPagado = reserva.pagadoProveedor === true && !mapa;

  let cobrado = 0;
  if (legacyPagado) {
    // Legacy sin desglose: el original cobró el 100% de la comisión.
    cobrado = comisionProveedorReserva(reserva, config);
  } else if (mapa?.d1) {
    const entrada = mapa.d1;
    const marcaPago = entrada.pagado === true || Boolean(entrada.pagoId) || entrada.montoPagado != null;
    if (marcaPago) cobrado = numero(entrada.montoPagado, d1.monto);
  }

  const exceso = numero(cobrado) - numero(d1.monto);
  if (!(exceso > 0.004)) return null;

  const monto = redondear2(exceso);
  if (!(monto > 0)) return null;

  return {
    proveedorId: reserva.proveedorId,
    monto,
    motivo: 'reposicion_d2_no_servida'
  };
}

/**
 * Aplica deudas del proveedor contra un monto bruto a pagar (FIFO).
 * Las deudas deben venir ya ordenadas por antigüedad. Centavos; nunca aplica
 * más que el saldo de cada deuda ni más que el bruto total.
 */
export function aplicarDescuentoDeuda(deudas = [], montoBruto = 0) {
  const bruto = Math.max(0, redondear2(montoBruto));
  let restante = bruto;
  const aplicadas = [];

  for (const deuda of deudas || []) {
    if (!deuda || restante <= 0) continue;
    const saldo = Math.max(0, redondear2(deuda.saldo));
    if (saldo <= 0) continue;
    const monto = redondear2(Math.min(saldo, restante));
    if (monto <= 0) continue;
    aplicadas.push({
      deudaId: deuda.id ?? deuda.deudaId ?? null,
      monto
    });
    restante = redondear2(restante - monto);
  }

  const descuento = redondear2(bruto - restante);
  return { descuento, neto: restante, aplicadas };
}

export function reservasPendientesInstructor(reservas, staffId) {
  return (reservas || []).filter((r) => esPendienteInstructor(r, staffId));
}

export function reservasPendientesProveedor(reservas, staffId) {
  return (reservas || []).filter((r) => esPendienteProveedor(r, staffId));
}

export function totalComisionInstructor(reservas, staffId) {
  return (reservas || []).reduce(
    (acc, r) => acc + comisionInstructorReserva(r, staffId),
    0
  );
}

export function totalComisionProveedor(reservas, config = {}) {
  return (reservas || []).reduce(
    (acc, r) => acc + comisionProveedorReserva(r, config),
    0
  );
}

// B-PAGOS-MONTO-LIBRE: el pago debe reconciliar el total con el detalle de
// comisiones y, si aplica, con el monto en VES a la tasa usada. Devuelve el
// total autoritativo (suma del detalle) o lanza un error de validación.
export function calcularTotalPago(detalles = [], { montoTotal = null, montoTotalVES = null, tasaAplicada = null } = {}) {
  const total = Math.round(
    (detalles || []).reduce((acc, d) => acc + numero(d?.comision), 0) * 100
  ) / 100;

  if (montoTotal != null && montoTotal !== '') {
    const solicitado = Number(montoTotal);
    if (Number.isFinite(solicitado) && Math.abs(solicitado - total) > 0.01) {
      throw new Error(`El monto total (${solicitado.toFixed(2)}) no coincide con la suma de comisiones (${total.toFixed(2)}).`);
    }
  }

  if (montoTotalVES != null && montoTotalVES !== '' && tasaAplicada != null && Number(tasaAplicada) > 0) {
    const esperado = Math.round(total * Number(tasaAplicada) * 100) / 100;
    if (Math.abs(Number(montoTotalVES) - esperado) > 0.05) {
      throw new Error(`El monto en VES (${Number(montoTotalVES).toFixed(2)}) no coincide con el total por la tasa (${esperado.toFixed(2)}).`);
    }
  }

  return total;
}
