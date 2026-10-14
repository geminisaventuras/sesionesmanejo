// @build: 2026-10-12 | id: CORREGIR-PAGO-FASE1 | desc: Tipos de servicio para corrección unificada
// Diccionario de dominio (FIRE v2). Evita magic strings dispersos.

export const SERVICE_TYPES = {
  RESERVA: 'reserva',
  PACK: 'pack',
  TEORICO: 'teorico',
};

export const SERVICE_TYPES_VALIDOS = Object.values(SERVICE_TYPES);

// Mapeo tipo → colección Firestore
export const SERVICE_COLLECTIONS = {
  [SERVICE_TYPES.RESERVA]: 'reservas',
  [SERVICE_TYPES.PACK]: 'reservasPack',
  [SERVICE_TYPES.TEORICO]: 'accesosTeoricos',
};

// Etiquetas legibles para UI
export const SERVICE_LABELS = {
  [SERVICE_TYPES.RESERVA]: 'Reserva',
  [SERVICE_TYPES.PACK]: 'Pack',
  [SERVICE_TYPES.TEORICO]: 'Módulo formativo',
};

// Motivos predefinidos para rechazo (dropdown admin)
export const MOTIVOS_RECHAZO = [
  { value: 'referencia_no_coincide', label: 'La referencia no coincide' },
  { value: 'monto_incorrecto', label: 'Monto incorrecto' },
  { value: 'comprobante_ilegible', label: 'Comprobante ilegible' },
  { value: 'otro', label: 'Otro (escribir)' },
];

// Motivo por defecto si el admin no selecciona ninguno
export const MOTIVO_RECHAZO_DEFAULT = 'La referencia del pago no coincide';

// Límite de intentos de corrección
export const MAX_INTENTOS_CORRECCION = 3;
