// @build: 2026-11-24 | id: MOVILIDAD-HELPERS-1 | desc: Validación y armado de la solicitud de movilidad (FT-058), separada del precio del curso.

import { distanciaKmEntreCoordenadas } from '../../shared/utils/geografiaHelpers.js';
import { inicioMinDesdeLabel } from '../../shared/utils/horarios.js';
import { calcularTarifaMovilidad, construirSnapshotMovilidad } from './movilidadPricing.js';

export const MOVILIDAD_AUTORIZACION_VERSION = '2026-11-24';

export const MOVILIDAD_AUTORIZACION_TEXTO =
  'Autorizo a Moto App a asignar un prestador para conducir mi motocicleta desde mi ubicación hasta la sede y de regreso. ' +
  'Declaro que la moto está en condiciones de circular y que su registro y seguro están vigentes. ' +
  'Entiendo que Moto App coordina el servicio, no conduce, no asegura ni actúa como transportista.';

export const MOVILIDAD_ESTADOS = Object.freeze([
  'solicitada',
  'asignada',
  'en_camino',
  'recogido',
  'en_sesion',
  'retorno',
  'completada',
  'cancelada',
  'no_presentado',
]);

export const MOVILIDAD_ETIQUETAS = Object.freeze({
  solicitada: 'Solicitada',
  asignada: 'Asignada',
  en_camino: 'En camino',
  recogido: 'Recogido',
  en_sesion: 'En sesión',
  retorno: 'Retorno',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_presentado: 'No presentado',
});

const TRANSICIONES = Object.freeze({
  solicitada: ['asignada', 'cancelada'],
  asignada: ['en_camino', 'cancelada'],
  en_camino: ['recogido', 'cancelada', 'no_presentado'],
  recogido: ['en_sesion'],
  en_sesion: ['retorno'],
  retorno: ['completada'],
  completada: [],
  cancelada: [],
  no_presentado: [],
});

export function puedeTransicionarMovilidad(actual, siguiente) {
  return (TRANSICIONES[actual] || []).includes(siguiente);
}

const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Valida una hora en formato 24h "HH:MM". */
export function esHoraHHMM(valor) {
  return typeof valor === 'string' && HORA_HHMM.test(valor);
}

/** Minutos desde medianoche → "HH:MM" (24h). */
export function minutosAHoraHHMM(minutos) {
  const n = Number(minutos);
  if (!Number.isFinite(n)) return null;
  const normalizado = ((Math.round(n) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(normalizado / 60)).padStart(2, '0');
  const mm = String(normalizado % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Inicio del bloque en "HH:MM" (24h). Acepta `horaInicio` ya en 24h o el
 * `label` legacy ("08:00 AM - 10:00 AM"). Null si no se puede resolver.
 */
export function horaInicioDesdeHorario(horario) {
  if (!horario) return null;
  if (esHoraHHMM(horario.horaInicio)) return horario.horaInicio;
  const minutos = inicioMinDesdeLabel(horario.label || horario.horaInicio || '');
  return minutos == null ? null : minutosAHoraHHMM(minutos);
}

/**
 * FT-090: el prestador debe estar en el punto de recogida al menos 30 min
 * antes del inicio. Sin hora válida devuelve null (la UI avisa y no inventa).
 */
export function horaRecogidaDesdeInicio(horaInicio, minutos = 30) {
  if (!esHoraHHMM(horaInicio)) return null;
  const [hh, mm] = horaInicio.split(':').map(Number);
  const margen = Number.isFinite(Number(minutos)) && Number(minutos) >= 0 ? Number(minutos) : 30;
  return minutosAHoraHHMM(hh * 60 + mm - margen);
}

/** Id estable por reserva + día (migra el legacy `{reservaId}_{fecha}` a `_D1/_D2`). */
export function idSolicitudMovilidad(reservaId, dia) {
  const sufijo = dia === 'D2' ? 'D2' : 'D1';
  return `${reservaId}_${sufijo}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * FT-090: días de movilidad a solicitar. D1 siempre que exista fecha; D2 solo
 * si el estudiante lo pidió, el curso es de dos días y hay segunda fecha.
 * Se usa igual para reservas individuales y para la primera sesión del pack.
 */
export function diasSolicitudMovilidad({
  fecha1 = null,
  fecha2 = null,
  d2Solicitada = false,
  cursoUnDia = false,
} = {}) {
  const dias = [];
  if (!fecha1) return dias;
  dias.push({ dia: 'D1', fechaSesion: fecha1 });
  if (d2Solicitada === true && !cursoUnDia && fecha2) {
    dias.push({ dia: 'D2', fechaSesion: fecha2 });
  }
  return dias;
}

/** Día lógico de una solicitud, con compatibilidad para documentos legacy. */
export function diaDeSolicitud(solicitud) {
  if (solicitud?.dia === 'D2') return 'D2';
  if (solicitud?.dia === 'D1') return 'D1';
  const id = String(solicitud?.id || '');
  if (id.endsWith('_D2')) return 'D2';
  if (id.endsWith('_D1')) return 'D1';
  return 'D1';
}

/**
 * FT-090: plan puro de sincronización (idempotente). Devuelve solo los cambios
 * necesarios para que D1/D2 sigan a la reserva o se cancelen con ella.
 */
export function planSincronizacionMovilidad({
  solicitudes = [],
  fecha = null,
  fecha2 = null,
  horaId = null,
  horaIdReposicion = null,
  estadoReserva = null,
  horaInicioPorHoraId = {},
} = {}) {
  const estado = String(estadoReserva || '').toLowerCase();
  const cancelada = estado === 'cancelado' || estado === 'cancelada';
  const plan = [];

  for (const solicitud of Array.isArray(solicitudes) ? solicitudes : []) {
    if (!solicitud?.id) continue;
    const dia = diaDeSolicitud(solicitud);

    if (cancelada) {
      if (solicitud.estado === 'cancelada') continue;
      plan.push({
        id: solicitud.id,
        dia,
        tipo: 'cancelar',
        cambios: {
          estado: 'cancelada',
          motivoCancelacion: 'reserva_cancelada',
          canceladaPor: 'reserva',
        },
      });
      continue;
    }

    const fechaObjetivo = dia === 'D2' ? fecha2 : fecha;
    if (!fechaObjetivo) continue;
    const horaObjetivo = dia === 'D2' ? (horaIdReposicion || horaId) : horaId;
    const horaInicio = horaObjetivo
      ? (horaInicioPorHoraId?.[String(horaObjetivo)] ?? null)
      : null;
    const horaRecogida = horaRecogidaDesdeInicio(horaInicio, 30);

    const cambios = {};
    if (solicitud.dia !== dia) cambios.dia = dia;
    if (solicitud.fechaSesion !== fechaObjetivo) cambios.fechaSesion = fechaObjetivo;
    if (String(solicitud.horaId || '') !== String(horaObjetivo || '')) {
      cambios.horaId = horaObjetivo || null;
    }
    if ((solicitud.horaInicio ?? null) !== horaInicio) cambios.horaInicio = horaInicio;
    if ((solicitud.horaRecogida ?? null) !== horaRecogida) cambios.horaRecogida = horaRecogida;

    if (Object.keys(cambios).length > 0) {
      plan.push({
        id: solicitud.id,
        dia,
        tipo: 'actualizar',
        cambios,
        prestadorId: solicitud.prestadorId || null,
      });
    }
  }

  return plan;
}

/** Valida un pin {lat,lng} sin exponerlo en textos ni logs. */
export function validarPinMovilidad(pin) {
  if (!pin || typeof pin !== 'object') return { ok: false, error: 'Marca tu ubicación en el mapa.' };
  const lat = Number(pin.lat);
  const lng = Number(pin.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'La ubicación marcada no es válida.' };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: 'La ubicación marcada está fuera del mapa.' };
  }
  return { ok: true, pin: { lat, lng } };
}

/** Distancia de ida (pin del estudiante -> sede). Null si la sede no tiene coordenadas. */
export function distanciaMovilidadKm(pin, sede) {
  const p = validarPinMovilidad(pin);
  if (!p.ok) return null;
  const km = distanciaKmEntreCoordenadas(p.pin, sede?.coordenadas);
  if (!Number.isFinite(km) || km <= 0) return null;
  return Math.round(km * 100) / 100;
}

/** Perfil con acceso al panel de movilidad (rol dedicado, capacidad o admin). */
export function puedeOperarMovilidad(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'movilidad') return true;
  return user.data?.capacidades?.movilidad === true;
}

/**
 * Valida la solicitud completa del paso 2 y devuelve el snapshot que se
 * guardará en `solicitudesMovilidad`. No modifica el precio del curso.
 */
export function validarSolicitudMovilidad({ form = {}, sede = null, config = {}, tasaFX = 1 } = {}) {
  if (form.traeMoto !== 'Sí') return { ok: false, error: 'La movilidad solo aplica si traes tu propia moto.' };
  if (form.movilidadSolicitada !== true) return { ok: false, error: 'No solicitaste movilidad.' };

  const pin = validarPinMovilidad(form.movilidadPin);
  if (!pin.ok) return pin;

  if (!sede) return { ok: false, error: 'Selecciona la sede de la sesión.' };
  const distanciaKm = distanciaMovilidadKm(pin.pin, sede);
  if (!distanciaKm) {
    return { ok: false, error: 'La sede no tiene ubicación configurada; no podemos calcular la distancia.' };
  }

  const tarifa = calcularTarifaMovilidad({ config, distanciaKm });
  if (!tarifa.disponible) {
    const mensajes = {
      inactivo: 'El servicio de movilidad no está disponible.',
      'fuera-cobertura': 'Tu ubicación está fuera de la cobertura del servicio.',
      'distancia-invalida': 'La distancia no es válida.',
      'tarifa-no-configurada': 'La tarifa de movilidad no está configurada.',
    };
    return { ok: false, error: mensajes[tarifa.motivo] || 'No pudimos cotizar la movilidad.' };
  }

  if (form.movilidadAutorizacion !== true) {
    return { ok: false, error: 'Debes aceptar la autorización para que un prestador conduzca tu moto.' };
  }

  const snapshot = construirSnapshotMovilidad({
    config,
    distanciaKm,
    tasaFX,
    calculadoEn: new Date().toISOString(),
    calculadoPor: 'cliente',
  });

  return {
    ok: true,
    distanciaKm,
    tarifa,
    snapshot,
    autorizacion: {
      aceptada: true,
      version: MOVILIDAD_AUTORIZACION_VERSION,
      aceptadaEn: new Date().toISOString(),
    },
  };
}
