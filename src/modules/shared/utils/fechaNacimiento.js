// FT-089 (T-162): datos del Paso 1 visibles en los paneles.
// Utilidades puras para fecha de nacimiento. Se parsea 'YYYY-MM-DD' por partes
// para no depender de la zona horaria del runtime (new Date('YYYY-MM-DD') es UTC).

const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

const parsearFecha = (fechaISO) => {
  if (typeof fechaISO !== 'string') return null;
  const coincidencia = fechaISO.trim().match(PATRON_FECHA);
  if (!coincidencia) return null;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  if (anio < 1000 || anio > 9999 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  // Descarta fechas inexistentes (30/02, 31/04, 29/02 en año no bisiesto).
  const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    comprobacion.getUTCFullYear() !== anio ||
    comprobacion.getUTCMonth() !== mes - 1 ||
    comprobacion.getUTCDate() !== dia
  ) {
    return null;
  }

  return { anio, mes, dia };
};

/**
 * Edad en años cumplidos a la fecha `hoy`.
 * @param {string} fechaISO fecha 'YYYY-MM-DD'
 * @param {Date} hoy fecha de referencia (por defecto hoy)
 * @returns {number|null} entero, o null si la fecha falta/es inválida/futura
 */
export function calcularEdad(fechaISO, hoy = new Date()) {
  const partes = parsearFecha(fechaISO);
  if (!partes) return null;
  if (!(hoy instanceof Date) || Number.isNaN(hoy.getTime())) return null;

  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth() + 1;
  const diaHoy = hoy.getDate();

  let edad = anioHoy - partes.anio;
  const cumplePendiente =
    mesHoy < partes.mes || (mesHoy === partes.mes && diaHoy < partes.dia);
  if (cumplePendiente) edad -= 1;

  // Una fecha de nacimiento futura no es válida como edad.
  return edad < 0 ? null : edad;
}

/**
 * Fecha de nacimiento en formato 'DD/MM/AAAA'.
 * @param {string} fechaISO fecha 'YYYY-MM-DD'
 * @returns {string} fecha formateada, o '' si falta/es inválida
 */
export function formatearFechaNacimiento(fechaISO) {
  const partes = parsearFecha(fechaISO);
  if (!partes) return '';
  const dia = String(partes.dia).padStart(2, '0');
  const mes = String(partes.mes).padStart(2, '0');
  return `${dia}/${mes}/${partes.anio}`;
}
