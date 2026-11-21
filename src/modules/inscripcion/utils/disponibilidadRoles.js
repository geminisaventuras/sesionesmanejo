// @build: 2026-11-20 | id: UI-D1-D2 | desc: Roles de presentación para cursos de 2 días, sin alterar la regla de disponibilidad existente.

export function sumarDiasISO(fecha, dias) {
  if (!fecha) return null;
  const cursor = new Date(fecha + 'T12:00:00');
  cursor.setDate(cursor.getDate() + dias);
  return cursor.toISOString().split('T')[0];
}

// Agrega metadatos de presentación a la lista ya calculada por el motor de
// disponibilidad. No decide si una fecha está disponible: solo etiqueta si
// puede ser el segundo día de un inicio válido del día anterior.
export function obtenerProximaFechaDisponible(diasDisponibles = [], fechaActual = '') {
  const fechas = (diasDisponibles || [])
    .filter(dia => dia.disponible)
    .map(dia => dia.fecha)
    .filter(Boolean)
    .sort();

  if (!fechaActual) return fechas[0] || null;
  return fechas.find(fecha => fecha > fechaActual) || null;
}

export function enriquecerDiasConRoles(diasDisponibles = [], { esCursoDosDias = false } = {}) {
  const porFecha = new Map((diasDisponibles || []).map(dia => [dia.fecha, dia]));

  return (diasDisponibles || []).map(dia => {
    const anterior = esCursoDosDias ? porFecha.get(sumarDiasISO(dia.fecha, -1)) : null;
    const segundoDia = Boolean(esCursoDosDias && anterior?.disponible);
    const inicio = Boolean(dia.disponible);

    return {
      ...dia,
      inicio,
      segundoDia,
      motivo: inicio ? 'OK' : (segundoDia ? 'D2' : 'SIN_DISPONIBILIDAD')
    };
  });
}
