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

export function esPendienteProveedor(reserva, staffId) {
  if (!reserva || reserva.estadoPago !== 'Aprobado') return false;
  return reserva.pagadoProveedor !== true && idIgual(reserva.proveedorId, staffId);
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
