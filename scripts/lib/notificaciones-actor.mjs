// Validación pura del actor de un evento de notificación (ERR-095).
//
// Objetivo: impedir que un usuario autenticado forje un evento sensible de
// otra entidad en `eventosNotificacion`. Sin Firebase y sin efectos: recibe el
// tipo de evento, el actor y la entidad ya leída de Firestore.
//
// Regla de negocio: el dispatcher valida al actor y el estado real antes de
// crear notificaciones. Si no corresponde, el evento queda `fallido` con
// `error:'actor-no-autorizado'` y no se notifica ni se reintenta.

const ESTADOS_PAGO = {
  pago_aprobado: 'Aprobado',
  pago_rechazado: 'Rechazado',
};

// Campos de la entidad que identifican a un actor legítimo por tipo de evento.
const CAMPOS_RESERVA = ['userId', 'instructorId', 'proveedorId', 'proveedorReposicionId'];
const CAMPOS_AULA = ['userId', 'instructorId'];

const ok = () => ({ ok: true });

function denegado(motivo) {
  return { ok: false, motivo };
}

function texto(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor).trim();
}

/**
 * Indica si el actor puede disparar `tipo` sobre `entidad`.
 *
 * @param {object} datos
 * @param {string} datos.tipo    tipo de evento del outbox.
 * @param {string} datos.actorUid uid que originó el evento.
 * @param {string} datos.actorRol rol resuelto del actor (`admin`, etc.).
 * @param {object} datos.entidad documento real de la entidad afectada.
 * @returns {{ ok: boolean, motivo?: string }}
 */
export function validarActorEvento({ tipo, actorUid, actorRol, entidad } = {}) {
  const actor = texto(actorUid);
  if (!actor) return denegado('actor-vacio');

  const esAdmin = texto(actorRol) === 'admin';
  const doc = entidad && typeof entidad === 'object' && !Array.isArray(entidad) ? entidad : null;
  const coincide = (...campos) =>
    Boolean(doc) && campos.some((campo) => {
      const valor = texto(doc[campo]);
      return valor !== '' && valor === actor;
    });

  switch (tipo) {
    case 'sistema_prueba':
      // El evento de prueba solo se dirige al propio actor.
      return ok();

    case 'reserva_creada':
      return esAdmin || coincide('userId') ? ok() : denegado('actor-no-es-dueno');

    case 'pago_aprobado':
    case 'pago_rechazado': {
      if (!esAdmin) return denegado('requiere-admin');
      if (!doc) return denegado('entidad-no-soportada');
      const estadoEsperado = ESTADOS_PAGO[tipo];
      return texto(doc.estadoPago) === estadoEsperado ? ok() : denegado('estado-pago-no-corresponde');
    }

    case 'reserva_reprogramada':
    case 'reserva_cancelada':
    case 'instructor_asignado':
      if (!doc) return denegado('entidad-no-soportada');
      return esAdmin || coincide(...CAMPOS_RESERVA) ? ok() : denegado('actor-ajeno-a-reserva');

    case 'sesion_iniciada':
    case 'sesion_pausada':
    case 'sesion_finalizada':
    case 'emergencia_aula':
      if (!doc) return denegado('entidad-no-soportada');
      return esAdmin || coincide(...CAMPOS_AULA) ? ok() : denegado('actor-ajeno-al-aula');

    case 'movilidad_solicitud':
      if (!doc) return denegado('entidad-no-soportada');
      return esAdmin || coincide('userId') ? ok() : denegado('actor-no-es-solicitante');

    case 'movilidad_asignada':
      if (!doc) return denegado('entidad-no-soportada');
      return esAdmin || coincide('userId', 'prestadorId') ? ok() : denegado('actor-ajeno-a-movilidad');

    case 'pago_staff':
      if (!doc) return denegado('entidad-no-soportada');
      return esAdmin || coincide('staffId', 'userId', 'beneficiarioId', 'instructorId', 'proveedorId')
        ? ok() : denegado('actor-ajeno-al-pago');

    case 'deuda_proveedor':
      if (!doc) return denegado('entidad-no-soportada');
      return esAdmin || coincide('proveedorId', 'proveedorUid', 'userId')
        ? ok() : denegado('actor-ajeno-a-la-deuda');

    default:
      return denegado('tipo-no-soportado');
  }
}
