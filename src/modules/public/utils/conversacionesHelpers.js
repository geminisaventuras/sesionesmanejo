// Helpers puros de la metadata de conversaciones IA (T-148 / F-17.2).
// No guarda transcripcion ni PII: solo referencia al interesado y actividad.
export const RETENCION_CONVERSACION_MESES = 12;
export const ROLES_MENSAJE = ['usuario', 'asistente'];
export const LIMITE_TURNOS_CONVERSACION = 500;
export const LIMITE_TEXTO_MENSAJE = 2000;
export const FUENTES_MENSAJE = ['ia', 'kb'];

function ruta(valor) {
  const limpio = String(valor ?? '/').trim().slice(0, 120);
  return limpio || '/';
}

export function normalizarConversacion(entrada = {}, ahora = new Date()) {
  const interesadoId = String(entrada.interesadoId ?? '').trim().slice(0, 120);
  const errores = [];
  if (!interesadoId) errores.push('interesadoId');

  const expiraEn = new Date(ahora.getTime());
  expiraEn.setMonth(expiraEn.getMonth() + RETENCION_CONVERSACION_MESES);

  return {
    ok: errores.length === 0,
    errores,
    datos: {
      interesadoId,
      canal: 'chat',
      origen: ruta(entrada.origen),
      pagina: ruta(entrada.pagina),
      turnos: 0,
      derivacionWhatsapp: false,
      ultimoMensajeRol: 'asistente',
      expiraEn,
    },
  };
}

function fechaDe(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor?.toDate === 'function') return valor.toDate();
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function resumenConversacion(doc = {}) {
  return {
    id: doc.id,
    interesadoId: doc.interesadoId || '',
    canal: doc.canal || 'chat',
    origen: doc.origen || '',
    pagina: doc.pagina || '',
    turnos: Number.isFinite(doc.turnos) ? doc.turnos : 0,
    derivacionWhatsapp: doc.derivacionWhatsapp === true,
    ultimoMensajeRol: ROLES_MENSAJE.includes(doc.ultimoMensajeRol) ? doc.ultimoMensajeRol : 'asistente',
    inicioEn: fechaDe(doc.inicioEn),
    ultimoMensajeEn: fechaDe(doc.ultimoMensajeEn),
    actualizadoEn: fechaDe(doc.actualizadoEn),
  };
}

export function fechaConversacion(valor) {
  const fecha = fechaDe(valor);
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
}

export function normalizarMensaje(entrada = {}) {
  const rol = ROLES_MENSAJE.includes(entrada.rol) ? entrada.rol : null;
  const texto = String(entrada.texto ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, LIMITE_TEXTO_MENSAJE);
  const fuente = FUENTES_MENSAJE.includes(entrada.fuente) ? entrada.fuente : null;
  const kbVersion = String(entrada.kbVersion ?? '').trim().slice(0, 64) || null;
  const errores = [];
  if (!rol) errores.push('rol');
  if (!texto) errores.push('texto');

  return {
    ok: errores.length === 0,
    errores,
    datos: { rol, texto, fuente, kbVersion },
  };
}

export function resumenMensaje(doc = {}) {
  return {
    id: doc.id,
    rol: ROLES_MENSAJE.includes(doc.rol) ? doc.rol : 'asistente',
    texto: doc.texto || '',
    fuente: FUENTES_MENSAJE.includes(doc.fuente) ? doc.fuente : null,
    kbVersion: doc.kbVersion || null,
    creadoEn: fechaDe(doc.creadoEn),
  };
}
