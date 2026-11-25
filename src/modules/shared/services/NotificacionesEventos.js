// Emisor de eventos de notificación.
//
// El cliente solo declara QUÉ pasó (tipo + entidad + actor). El dispatcher
// resuelve destinatarios, valida el estado actual en Firestore y crea la
// notificación. Así el navegador no elige a quién notificar ni escribe PII.
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  TIPOS_EVENTO,
  construirClaveEvento,
  detectarEventosReserva,
} from '../utils/notificacionesHelpers';

export const RUTA_DATOS = 'artifacts/motoescuela-pro-v1/public/data';
export const COLECCION_EVENTOS = 'eventosNotificacion';
export const COLECCION_NOTIFICACIONES = 'notificaciones';
export const COLECCION_DISPOSITIVOS = 'pushSuscripciones';
export const COLECCION_PREFERENCIAS = 'preferenciasNotificacion';

function limpiarDatos(datos = {}) {
  // Solo ids y valores operativos. Nunca nombres, cédulas, teléfonos ni correos.
  const permitidos = [
    'reservaId', 'packReservaId', 'instructorId', 'proveedorId',
    'proveedorReposicionId', 'movilidadId', 'pagoId', 'deudaId',
    'staffId', 'rolOrigen', 'motivo', 'monto', 'moneda',
  ];
  const salida = {};
  for (const clave of permitidos) {
    const valor = datos?.[clave];
    if (valor === undefined || valor === null) continue;
    if (typeof valor === 'string' && valor.length > 120) continue;
    if (typeof valor === 'object') continue;
    salida[clave] = valor;
  }
  return salida;
}

export async function emitirEvento({
  tipo,
  entidadTipo,
  entidadId,
  actorUid,
  token = 'base',
  datos = {},
} = {}) {
  if (!TIPOS_EVENTO.includes(tipo)) {
    return { ok: false, motivo: 'tipo-invalido' };
  }
  if (!entidadTipo || !entidadId) {
    return { ok: false, motivo: 'entidad-invalida' };
  }
  if (!actorUid) {
    // El registro público sin sesión no puede escribir el outbox; el admin
    // lo recupera al detectar la reserva nueva.
    return { ok: false, motivo: 'sin-actor' };
  }

  const clave = construirClaveEvento(tipo, entidadId, token);
  try {
    await setDoc(doc(db, RUTA_DATOS, COLECCION_EVENTOS, clave), {
      clave,
      tipo,
      entidadTipo,
      entidadId: String(entidadId),
      actorUid: String(actorUid),
      token: String(token || 'base'),
      datos: limpiarDatos(datos),
      estado: 'pendiente',
      intentos: 0,
      ocurridoEn: serverTimestamp(),
    });
    return { ok: true, clave };
  } catch (error) {
    // La acción de negocio ya se completó: no se revierte por una alerta.
    console.warn('[NotificacionesEventos] No se pudo emitir el evento:', tipo, error?.code || error?.message);
    return { ok: false, motivo: error?.code || 'error' };
  }
}

export async function emitirEventosReserva(anterior, actual, actorUid) {
  if (!actual?.id || !actorUid) return [];
  const eventos = detectarEventosReserva(anterior, actual);
  if (eventos.length === 0) return [];
  const resultados = await Promise.all(
    eventos.map((evento) => emitirEvento({
      tipo: evento.tipo,
      entidadTipo: 'reserva',
      entidadId: evento.entidadId,
      actorUid,
      token: evento.token,
      datos: {
        reservaId: evento.entidadId,
        instructorId: actual.instructorId || null,
        proveedorId: actual.proveedorId || null,
        proveedorReposicionId: actual.proveedorReposicionId || null,
        packReservaId: actual.packReservaId || null,
      },
    }))
  );
  return resultados;
}

export async function emitirEventoReservaNueva(reserva, actorUid) {
  if (!reserva?.id || !actorUid) return { ok: false, motivo: 'sin-datos' };
  return emitirEvento({
    tipo: 'reserva_creada',
    entidadTipo: 'reserva',
    entidadId: reserva.id,
    actorUid,
    token: 'nueva',
    datos: {
      reservaId: reserva.id,
      instructorId: reserva.instructorId || null,
      proveedorId: reserva.proveedorId || null,
      packReservaId: reserva.packReservaId || null,
    },
  });
}
