// Utilidades de zona horaria Venezuela
export function obtenerFechaVenezuela() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }); // YYYY-MM-DD
}

export function obtenerHoraVenezuela() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Caracas', hour12: false });
}

export function obtenerFechaHoraVenezuela() {
  return new Date().toLocaleString('en-CA', { timeZone: 'America/Caracas', hour12: false });
}
