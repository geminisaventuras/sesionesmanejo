// Helpers puros del CRM de interesados (FT-078 / F-17.2).
// No crean cuentas ni reservas: solo normalizan y validan la captura con consentimiento.
export const ESTADOS_CRM = ['nuevo', 'contactado', 'convertido', 'descartado'];
export const CANALES_CRM = ['chat', 'home', 'whatsapp', 'otro'];
// v2 (25/11): el consentimiento tambien cubre guardar la conversacion para auditar la IA.
export const CONSENTIMIENTO_VERSION = '2026-11-v2';
export const CONSENTIMIENTO_VERSION_LEGACY = '2026-11-v1';
export const RETENCION_MESES = 12;

export function normalizarTelefono(valor) {
  const limpio = String(valor ?? '').replace(/[^\d+]/g, '');
  return limpio.replace(/(?!^)\+/g, '').slice(0, 20);
}

export function primerNombre(valor) {
  const nombre = String(valor ?? '').trim().replace(/\s+/g, ' ');
  return nombre.split(' ')[0] || '';
}

export function normalizarInteresado(entrada = {}, ahora = new Date()) {
  const nombre = String(entrada.nombre ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const telefono = normalizarTelefono(entrada.telefono);
  const correo = String(entrada.correo ?? '').trim().toLowerCase().slice(0, 120);
  const interes = String(entrada.interes ?? '').trim().slice(0, 120);
  const canal = CANALES_CRM.includes(entrada.canal) ? entrada.canal : 'chat';
  const origen = String(entrada.origen ?? '/').trim().slice(0, 120) || '/';
  const errores = [];

  if (nombre.length < 2) errores.push('nombre');
  if (telefono.replace(/\D/g, '').length < 7) errores.push('telefono');
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.push('correo');
  if (entrada.consentimiento !== true) errores.push('consentimiento');

  const expiraEn = new Date(ahora.getTime());
  expiraEn.setMonth(expiraEn.getMonth() + RETENCION_MESES);

  return {
    ok: errores.length === 0,
    errores,
    datos: {
      nombre,
      telefono,
      correo: correo || null,
      interes,
      canal,
      origen,
      estado: 'nuevo',
      consentimiento: true,
      consentimientoVersion: CONSENTIMIENTO_VERSION,
      expiraEn,
    },
  };
}

export function estadoValido(estado) {
  return ESTADOS_CRM.includes(estado);
}

function fechaDe(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor?.toDate === 'function') return valor.toDate();
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function estaVencido(expiraEn, ahora = new Date()) {
  const fecha = fechaDe(expiraEn);
  return Boolean(fecha && fecha.getTime() <= ahora.getTime());
}

export function resumenInteresado(doc = {}) {
  return {
    id: doc.id,
    nombre: doc.nombre || '',
    telefono: doc.telefono || '',
    correo: doc.correo || '',
    interes: doc.interes || '',
    canal: doc.canal || 'otro',
    origen: doc.origen || '',
    estado: ESTADOS_CRM.includes(doc.estado) ? doc.estado : 'nuevo',
    consentimiento: doc.consentimiento === true,
    notas: doc.notas || '',
    vencido: estaVencido(doc.expiraEn),
  };
}
