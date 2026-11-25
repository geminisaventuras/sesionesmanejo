// @build: 2026-11-24 | id: MOVILIDAD-HELPERS-1 | desc: Validación y armado de la solicitud de movilidad (FT-058), separada del precio del curso.

import { distanciaKmEntreCoordenadas } from '../../shared/utils/geografiaHelpers.js';
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
