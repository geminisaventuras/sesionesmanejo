// @build: 2026-11-12 | id: WHATSAPP-SERVICE-V1 | desc: Plantillas de mensajes centralizadas + Maps + Helpers
// Aplica reglas: dominio prod, dirección exacta, código corto, recordatorio 15 min.
import { formatearSede } from '../utils/sedesHelpers.js';
import { urlMapaSede, validarCoordenadas } from '../utils/geografiaHelpers.js';
const BASE_URL = 'https://motoapp.website';

export const getBaseUrl = () => BASE_URL;

export const formatearTelefonoVE = (telStr) => {
  let tel = String(telStr || '').replace(/\D/g, '');
  if (!tel) return null;
  if (tel.startsWith('0') && tel.length === 11) tel = '58' + tel.slice(1);
  else if (tel.length === 10) tel = '58' + tel;
  return tel.length >= 11 ? tel : null;
};

// Coordenadas exactas de las sedes (para abrir el pin en Maps sin fallos).
// El ID manda: los nombres pueden repetirse ("Caracas") o cambiar en DEV.
const COORDENADAS_POR_ID = {
  'sede1': '10.470516554614811, -66.59752921091554',        // Guarenas (Villa)
  'sede2': '10.489872304195245, -66.88481411546675',        // Caracas (UCV)
  '1793924508290': '10.466822378537012, -66.9727309588204', // Caracas Montalbán
};

// Los nombres específicos van antes del genérico "caracas" para no devolver UCV en Montalbán.
const COORDENADAS_POR_NOMBRE_ESPECIFICO = [
  { clave: 'montalban', coords: '10.466822378537012, -66.9727309588204' },
  { clave: 'ciudad universitaria', coords: '10.489872304195245, -66.88481411546675' },
  { clave: 'ucv', coords: '10.489872304195245, -66.88481411546675' },
  { clave: 'villa', coords: '10.470516554614811, -66.59752921091554' },
  { clave: 'guarenas', coords: '10.470516554614811, -66.59752921091554' },
];

const COORDENADAS_POR_NOMBRE_GENERICO = [
  { clave: 'caracas', coords: '10.489872304195245, -66.88481411546675' },
];

const normalizarClaveSede = (valor) =>
  String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const linkMapaSede = (sede) => {
  if (!sede) return '';

  // 0) T-048: coordenadas guardadas por el admin en la sede (mapa real).
  const coordenadas = validarCoordenadas(sede.coordenadas);
  if (coordenadas.ok && coordenadas.coordenadas) {
    const urlCoordenadas = urlMapaSede(sede);
    if (urlCoordenadas) return urlCoordenadas;
  }

  // 1) Pin por ID (sede1, sede2, 1793924508290).
  const idSede = normalizarClaveSede(sede.id);
  let coords = idSede ? COORDENADAS_POR_ID[idSede] : null;

  // 2) Pin por nombre: específicos primero y genéricos al final.
  if (!coords) {
    const nombreSede = normalizarClaveSede(sede.nombre);
    for (const { clave, coords: pin } of COORDENADAS_POR_NOMBRE_ESPECIFICO) {
      if (nombreSede.includes(clave)) { coords = pin; break; }
    }
    if (!coords) {
      for (const { clave, coords: pin } of COORDENADAS_POR_NOMBRE_GENERICO) {
        if (nombreSede.includes(clave)) { coords = pin; break; }
      }
    }
  }

  // Si encontramos coordenadas exactas, usamos el pin. Si no, caemos en la búsqueda por texto.
  const query = coords ? coords : `${sede.nombre || ''}, ${sede.direccion || ''}`.trim();
  if (!query) return '';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};
export const codigoReservaCorto = (id) => {
  if (!id) return '';
  return `#${String(id).slice(-4).toUpperCase()}`;
};

export const construirLinkWhatsApp = (telefono, mensaje) => {
  const tel = formatearTelefonoVE(telefono);
  if (!tel) return null;
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
};

const FIRMA = `— Equipo Moto App 💙\n#RumboAlExito #MotoApp`;

const VESTIMENTA = `*Código de vestimenta e hidratación:*\n• Pantalón tipo Jean\n• Zapatos cerrados\n• Sudadera o suéter\n• Llevar botella de agua (hidratación)`;
// ─────────────────────────────────────────────────────────────────────────────
// 1) MENSAJE: APROBACIÓN DE PAGO (Reserva individual)
// ─────────────────────────────────────────────────────────────────────────────
export const construirMensajeAprobacion = ({ nombre, curso, fecha, horario, sede, codigoReserva }) => {
  const maps = linkMapaSede(sede);
  return `¡Hola ${nombre}! 👋

✅ *Tu pago fue aprobado correctamente.*

📋 *Reserva:* ${codigoReserva}
🎓 *Sesión:* ${curso}
📅 *Fecha:* ${fecha}
⏰ *Hora:* ${horario}
📍 *Sede:* ${formatearSede(sede, { incluirDireccion: true })}
${sede?.direccion ? `🗺️ *Ubicación:* ${maps}\n` : ''}
⏱️ *Recuerda:* Llega 15 minutos antes.

${VESTIMENTA}

¡Gracias por confiar en nosotros!

${FIRMA}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2) MENSAJE: PACK APROBADO (incluye primera sesión)
// ─────────────────────────────────────────────────────────────────────────────
export const construirMensajePackAprobado = ({
  nombre, packNombre, curso, fecha, horario, sede, instructor, codigoReserva, linkPanel
}) => {
  const maps = linkMapaSede(sede);
  return `¡Hola ${nombre}! 🎉

🌟 *Tu ${packNombre || 'Pack'} fue aprobado exitosamente.*

📋 *Reserva:* ${codigoReserva}
🎓 *Primera sesión:* ${curso}
📅 *Fecha:* ${fecha}
⏰ *Hora:* ${horario}
📍 *Sede:* ${formatearSede(sede, { incluirDireccion: true })}
${sede?.direccion ? `🗺️ *Ubicación:* ${maps}\n` : ''}
👨‍🏫 *Tutor:* ${instructor}

⏱️ *Recuerda:* Llega 15 minutos antes.

🔗 *Gestiona tus próximas sesiones acá:*
${linkPanel}

${VESTIMENTA}

¡Nos vemos en la pista!

${FIRMA}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 3) MENSAJE: REPROGRAMACIÓN DE SESIÓN
// ─────────────────────────────────────────────────────────────────────────────
export const construirMensajeReprogramacion = ({ nombre, curso, fecha, horario, sede, motivo, codigoReserva }) => {
  const maps = linkMapaSede(sede);
  return `¡Hola ${nombre}! 👋

📅 *Tu sesión fue reprogramada.*

📋 *Reserva:* ${codigoReserva}
🎓 *Sesión:* ${curso}
📅 *Nueva fecha:* ${fecha}
⏰ *Hora:* ${horario}
📍 *Sede:* ${formatearSede(sede, { incluirDireccion: true })}
${sede?.direccion ? `🗺️ *Ubicación:* ${maps}\n` : ''}
${motivo ? `📝 *Motivo:* ${motivo}\n` : ''}
⏱️ *Recuerda:* Llega 15 minutos antes.

${VESTIMENTA}

Cualquier duda, respondé este mensaje.

${FIRMA}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 4) MENSAJE: RECHAZO DE PAGO (solo variante "corregir", no "cancelar")
// ─────────────────────────────────────────────────────────────────────────────
export const construirMensajeRechazo = ({
  nombre, curso, motivo, codigoReserva, intentosRestantes, linkCorreccion
}) => {
  return `¡Hola ${nombre}! 👋

⚠️ *No pudimos verificar tu pago.*

📋 *Reserva:* ${codigoReserva}
🎓 *Sesión:* ${curso}
📝 *Motivo:* ${motivo}
🔁 *Intentos restantes:* ${intentosRestantes}

👉 *Corregí la referencia acá:*
${linkCorreccion}

Si ya corregiste, ignorá este mensaje. Te avisamos en cuanto se apruebe.

${FIRMA}`;
};
