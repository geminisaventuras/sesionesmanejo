import { useMemo } from 'react';
import { LockService } from '../../../services/LockService';

const MAX_DIAS_RESERVA = 30;

const isPastBlock = (fecha, label, todayStr) => {
  if (fecha !== todayStr || !label) return false;
  try {
    const startStr = label.split('-')[0].trim();
    const parts = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!parts) return false;
    let hours = parseInt(parts[1], 10);
    const mins = parseInt(parts[2], 10);
    const modifier = parts[3].toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const blockTime = new Date();
    blockTime.setHours(hours, mins, 0, 0);
    return new Date() > blockTime;
  } catch (e) { return false; }
};

const calcularDisponibilidadBloque = (
  bloque, fecha1, fecha2, sedeId, tipoMoto, traeMoto,
  instructores, motos, reservas, activeLocks, selectingBlockId, todayStr
) => {
  if (bloque.isLunch) return { ...bloque, disponible: false, reason: 'ALMUERZO', instructorId: null, motoAsignadaId: null };
  if (fecha1 < todayStr || isPastBlock(fecha1, bloque.label, todayStr))
    return { ...bloque, disponible: false, reason: 'CERRADO', instructorId: null, motoAsignadaId: null };
  if (bloque.id === selectingBlockId)
    return { ...bloque, disponible: true, reason: '', instructorId: null, motoAsignadaId: null, seleccionando: true };

  const locks = activeLocks || [];

  // Instructores ocupados por reservas confirmadas (descuento permanente)
  const instructoresOcupadosPorReservas = instructores
    .filter(i => i.activo && (i.sedes || []).includes(sedeId))
    .filter(i => reservas.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (String(r.horaId) !== String(bloque.id)) return false;
      const coincideFecha = r.fecha === fecha1 || r.fecha === fecha2 || r.fecha2 === fecha1 || r.fecha2 === fecha2;
      return coincideFecha && String(r.instructorId) === String(i.id);
    }));

  // Instructores ocupados por locks temporales (descuento temporal)
  const instructoresOcupadosPorLocks = instructores
    .filter(i => i.activo && (i.sedes || []).includes(sedeId))
    .filter(i => !instructoresOcupadosPorReservas.some(oi => String(oi.id) === String(i.id)))
    .filter(i => locks.some(lock => {
      return String(lock.horaId) === String(bloque.id) && String(lock.instructorId) === String(i.id);
    }));

  // Instructores disponibles (ni en reservas ni en locks)
  const instructoresDisponibles = instructores
    .filter(i => i.activo && (i.sedes || []).includes(sedeId))
    .filter(i => !instructoresOcupadosPorReservas.some(oi => String(oi.id) === String(i.id)))
    .filter(i => !instructoresOcupadosPorLocks.some(oi => String(oi.id) === String(i.id)));

  // Motos ocupadas por reservas confirmadas
  const motosOcupadasPorReservas = motos
    .filter(m => m.activo && m.tipo === tipoMoto && (m.sedes || []).includes(sedeId))
    .filter(m => reservas.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (String(r.horaId) !== String(bloque.id)) return false;
      const coincideFecha = r.fecha === fecha1 || r.fecha === fecha2 || r.fecha2 === fecha1 || r.fecha2 === fecha2;
      if (!coincideFecha || r.traeMoto === 'Sí') return false;
      return String(r.motoAsignadaId) === String(m.id);
    }));

  // Motos ocupadas por locks temporales
  const motosOcupadasPorLocks = motos
    .filter(m => m.activo && m.tipo === tipoMoto && (m.sedes || []).includes(sedeId))
    .filter(m => !motosOcupadasPorReservas.some(om => String(om.id) === String(m.id)))
    .filter(m => locks.some(lock => {
      return String(lock.horaId) === String(bloque.id) && String(lock.motoAsignadaId) === String(m.id);
    }));

  // Motos disponibles
  const motosDisponibles = motos
    .filter(m => m.activo && m.tipo === tipoMoto && (m.sedes || []).includes(sedeId))
    .filter(m => !motosOcupadasPorReservas.some(om => String(om.id) === String(m.id)))
    .filter(m => !motosOcupadasPorLocks.some(om => String(om.id) === String(m.id)));

  const necesitaMoto = traeMoto !== 'Sí';

  // Si hay recursos disponibles, el bloque está libre
  if (!necesitaMoto) {
    if (instructoresDisponibles.length > 0)
      return { ...bloque, disponible: true, reason: '', instructorId: instructoresDisponibles[0].id, motoAsignadaId: null };
  } else {
    if (instructoresDisponibles.length > 0 && motosDisponibles.length > 0)
      return { ...bloque, disponible: true, reason: '', instructorId: instructoresDisponibles[0].id, motoAsignadaId: motosDisponibles[0].id };
  }

  // Si no hay recursos disponibles, determinar la razón
  // Primero verificamos si las reservas confirmadas ya agotaron los recursos
  const instructoresLibresSinLocks = instructores
    .filter(i => i.activo && (i.sedes || []).includes(sedeId))
    .filter(i => !instructoresOcupadosPorReservas.some(oi => String(oi.id) === String(i.id)));

  const motosLibresSinLocks = motos
    .filter(m => m.activo && m.tipo === tipoMoto && (m.sedes || []).includes(sedeId))
    .filter(m => !motosOcupadasPorReservas.some(om => String(om.id) === String(m.id)));

  // Si sin considerar locks ya no hay recursos, es porque están reservados
  if (!necesitaMoto) {
    if (instructoresLibresSinLocks.length === 0)
      return { ...bloque, disponible: false, reason: 'RESERVADO', instructorId: null, motoAsignadaId: null };
    // Si hay instructores libres pero los locks los ocupan todos, es "en espera"
    if (instructoresDisponibles.length === 0)
      return { ...bloque, disponible: false, reason: 'EN_ESPERA_PAGO', instructorId: null, motoAsignadaId: null };
  } else {
    if (instructoresLibresSinLocks.length === 0 || motosLibresSinLocks.length === 0)
      return { ...bloque, disponible: false, reason: 'RESERVADO', instructorId: null, motoAsignadaId: null };
    // Si hay recursos libres sin locks pero los locks los ocupan todos
    if (instructoresDisponibles.length === 0 || motosDisponibles.length === 0)
      return { ...bloque, disponible: false, reason: 'EN_ESPERA_PAGO', instructorId: null, motoAsignadaId: null };
  }

  // Fallback: Ocupado genérico
  return { ...bloque, disponible: false, reason: 'OCUPADO', instructorId: null, motoAsignadaId: null };
};

export function useDisponibilidad({
  form, selectingBlockId, lockId,
  instructores, motos, reservas, activeLocks, horarios,
  getTodayStr
}) {
  const today = getTodayStr();
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const cargando = !instructores?.length || !motos?.length || !horarios?.length;

  const fecha2Calc = useMemo(() => {
    if (!form.fecha1) return '';
    const d = new Date(form.fecha1 + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [form.fecha1]);

  const diasDisponibles = useMemo(() => {
    if (!form.sedeId || !form.tipoMoto) return [];
    const dias = [];
    const cursor = new Date(today + 'T12:00:00');
    const fin = new Date(maxDate + 'T12:00:00');
    while (cursor <= fin) {
      const fechaStr = cursor.toISOString().split('T')[0];
      const d2 = new Date(cursor);
      d2.setDate(d2.getDate() + 1);
      const fecha2Candidate = d2.toISOString().split('T')[0];
      const hayAlguno = (horarios || []).filter(h => h.activo && !h.isLunch).some(bloque => {
        const info = calcularDisponibilidadBloque(
          bloque, fechaStr, fecha2Candidate, form.sedeId, form.tipoMoto, form.traeMoto,
          instructores, motos, reservas, null, selectingBlockId, today
        );
        return info.disponible;
      });
      dias.push({ fecha: fechaStr, disponible: hayAlguno });
      cursor.setDate(cursor.getDate() + 1);
    }
    return dias;
  }, [form.sedeId, form.tipoMoto, form.traeMoto, reservas, maxDate, today, horarios, instructores, motos]);

  const bloques = useMemo(() => {
    if (!form.fecha1 || !form.sedeId || !form.tipoMoto) return [];
    if (!instructores?.length || !motos?.length) return [];
    const hor = (horarios || []).filter(h => h.activo).sort((a, b) => a.id.localeCompare(b.id));
    return hor.map(b => {
      const info = calcularDisponibilidadBloque(
        b, form.fecha1, fecha2Calc, form.sedeId, form.tipoMoto, form.traeMoto,
        instructores, motos, reservas, activeLocks, selectingBlockId, today
      );
      if (lockId && form.horaId === b.id) return { ...info, disponible: true, reason: '', restaurado: true };
      return info;
    });
  }, [form.fecha1, form.sedeId, form.tipoMoto, form.traeMoto, lockId, form.horaId, today, reservas, activeLocks, instructores, motos, horarios, fecha2Calc, selectingBlockId]);

  const buscarProximaFechaDisponible = async () => {
    return await LockService.buscarProximaFechaDisponible(form.fecha1, today, maxDate, horarios);
  };

  return { diasDisponibles, bloques, fecha2Calc, maxDate, buscarProximaFechaDisponible, cargando };
}