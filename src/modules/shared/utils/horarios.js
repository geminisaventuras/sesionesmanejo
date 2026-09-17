// @build: 2026-08-30.16-00-00 | id: ORDEN-HORARIOS | backup: horarios.js.backup-20260830-160000 | desc: Orden de horarios por hora de inicio
export function parseHora(str) {
  const match = str?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

export function ordenarHorarios(horarios) {
  return [...horarios].sort((a, b) => {
    const horaA = parseHora(a.horaInicio) ?? parseHora(a.label?.split('-')[0]?.trim()) ?? 0;
    const horaB = parseHora(b.horaInicio) ?? parseHora(b.label?.split('-')[0]?.trim()) ?? 0;
    return horaA - horaB;
  });
}