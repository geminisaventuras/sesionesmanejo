// Utilidades de zona horaria Venezuela
// Acepta un Date (o valor parseable) para poder fijar el instante en pruebas;
// sin argumento equivale al comportamiento previo (ahora). Salida YYYY-MM-DD en America/Caracas.
// Contrato: un string `YYYY-MM-DD` (date-only) representa el DÍA CALENDARIO VET y se devuelve tal
// cual, sin reinterpretarlo como medianoche UTC (lo que en VET caería el día anterior). Cualquier
// valor no parseable o una fecha date-only inválida (p. ej. 2026-02-31) lanza RangeError.
const RE_FECHA_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function obtenerFechaVenezuela(fecha = new Date()) {
  if (typeof fecha === 'string') {
    const coincidencia = RE_FECHA_DATE_ONLY.exec(fecha);
    if (coincidencia) {
      const anio = Number(coincidencia[1]);
      const mes = Number(coincidencia[2]);
      const dia = Number(coincidencia[3]);
      const calendario = new Date(Date.UTC(anio, mes - 1, dia, 12));
      const valido =
        calendario.getUTCFullYear() === anio &&
        calendario.getUTCMonth() === mes - 1 &&
        calendario.getUTCDate() === dia;
      if (!valido) {
        throw new RangeError(`Fecha date-only inválida: ${fecha}`);
      }
      return fecha; // día calendario VET: no se convierte desde UTC
    }
  }
  const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(fechaObj.getTime())) {
    throw new RangeError(`Fecha inválida: ${String(fecha)}`);
  }
  return fechaObj.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }); // YYYY-MM-DD
}

export function obtenerHoraVenezuela() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Caracas', hour12: false });
}

export function obtenerFechaHoraVenezuela() {
  return new Date().toLocaleString('en-CA', { timeZone: 'America/Caracas', hour12: false });
}

// Formatea un Date "de calendario" (creado con Date.UTC a mediodía) sin depender de la TZ del runtime.
const formatearFechaUTC = (fechaObj) => {
  const anio = fechaObj.getUTCFullYear();
  const mes = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fechaObj.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

// inicioSemanaVenezuela: devuelve el lunes (YYYY-MM-DD) de la semana de la fecha calendario en
// America/Caracas; inicioMesVenezuela: devuelve el día 1 (YYYY-MM-DD) del mes de esa misma fecha.
// Ambos derivan primero el día VET y operan con Date.UTC, así que no dependen de la TZ del runtime.
export function inicioSemanaVenezuela(fecha = new Date()) {
  const [anio, mes, dia] = obtenerFechaVenezuela(fecha).split('-').map(Number);
  const referencia = new Date(Date.UTC(anio, mes - 1, dia, 12));
  const diaSemana = referencia.getUTCDay() || 7; // 1 = lunes ... 7 = domingo
  const lunes = new Date(Date.UTC(anio, mes - 1, dia - (diaSemana - 1), 12));
  return formatearFechaUTC(lunes);
}

export function inicioMesVenezuela(fecha = new Date()) {
  const [anio, mes] = obtenerFechaVenezuela(fecha).split('-').map(Number);
  return formatearFechaUTC(new Date(Date.UTC(anio, mes - 1, 1, 12)));
}
