// @build: 2026-06-22.REFACTOR | id: DISPONIBILIDAD | desc: Hook de cálculo de disponibilidad de bloques y días. Delega consultas a servicios.
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
  instructores, motos, reservas, activeLocks, lockId, selectingBlockId, todayStr
) => {
  if (bloque.isLunch) return { ...bloque, disponible: false, reason: 'ALMUERZO', instructorId: null, motoAsignadaId: null };
  if (fecha1 < todayStr || isPastBlock(fecha1, bloque.label, todayStr))
    return { ...bloque, disponible: false, reason: 'CERRADO', instructorId: null, motoAsignadaId: null };
  if (bloque.id === selectingBlockId)
    return { ...bloque, disponible: true, reason: '', instructorId: null, motoAsignadaId: null, seleccionando: true };

  const locks = activeLocks || [];
  const instructoresDisponibles = instructores
    .filter(i => i.activo && (i.sedes || []).includes(sedeId))
    .filter(i => !reservas.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (String(r.horaId) !== String(bloque.id)) return false;
      const coincideFecha = r.fecha === fecha1 || r.fecha === fecha2 || r.fecha2 === fecha1 || r.fecha2 === fecha2;
      return coincideFecha && String(r.instructorId) === String(i.id);
    }))
    .filter(i => !locks.some(l => l.id.startsWith(`${fecha1}_${bloque.id}_${i.id}`) && l.id !== lockId));

  const motosDisponibles = motos
    .filter(m => m.activo && m.tipo === tipoMoto && (m.sedes || []).includes(sedeId))
    .filter(m => !reservas.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (String(r.horaId) !== String(bloque.id)) return false;
      const coincideFecha = r.fecha === fecha1 || r.fecha === fecha2 || r.fecha2 === fecha1 || r.fecha2 === fecha2;
      if (!coincideFecha || r.traeMoto === 'Sí') return false;
      return String(r.motoAsignadaId) === String(m.id);
    }))
    .filter(m => !locks.some(l => l.id.startsWith(`${fecha1}_${bloque.id}_`) && l.id.endsWith(`_${m.id}`) && l.id !== lockId));

  const necesitaMoto = traeMoto !== 'Sí';
  if (!necesitaMoto) {
    if (instructoresDisponibles.length > 0)
      return { ...bloque, disponible: true, reason: '', instructorId: instructoresDisponibles[0].id, motoAsignadaId: null };
    return { ...bloque, disponible: false, reason: 'OCUPADO', instructorId: null, motoAsignadaId: null };
  } else {
    if (instructoresDisponibles.length === 0)
      return { ...bloque, disponible: false, reason: 'OCUPADO', instructorId: null, motoAsignadaId: null };
    if (motosDisponibles.length === 0)
      return { ...bloque, disponible: false, reason: 'SIN_MOTO', instructorId: null, motoAsignadaId: null };
    return { ...bloque, disponible: true, reason: '', instructorId: instructoresDisponibles[0].id, motoAsignadaId: motosDisponibles[0].id };
  }
};

export function useDisponibilidad({
  form, selectingBlockId, lockId,
  instructores, motos, reservas, horarios,
  activeLocks, isSelectingHorario, locksSnapshotRef,
  getTodayStr
}) {
  const today = getTodayStr();
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // ✅ Estado de carga: true mientras los recursos no estén disponibles
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
          instructores, motos, reservas, null, null, selectingBlockId, today
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
    const locksSource = isSelectingHorario ? locksSnapshotRef.current : activeLocks;
    const hor = (horarios || []).filter(h => h.activo).sort((a, b) => a.id.localeCompare(b.id));
    return hor.map(b => {
      const info = calcularDisponibilidadBloque(
        b, form.fecha1, fecha2Calc, form.sedeId, form.tipoMoto, form.traeMoto,
        instructores, motos, reservas, locksSource, lockId, selectingBlockId, today
      );
      if (lockId && form.horaId === b.id) return { ...info, disponible: true, reason: '', restaurado: true };
      return info;
    });
  }, [form.fecha1, form.sedeId, form.tipoMoto, form.traeMoto, activeLocks, lockId, form.horaId, today, reservas, instructores, motos, horarios, fecha2Calc, selectingBlockId, isSelectingHorario]);

  const buscarProximaFechaDisponible = async () => {
    return await LockService.buscarProximaFechaDisponible(form.fecha1, today, maxDate, horarios, getTodayStr);
  };

  return { diasDisponibles, bloques, fecha2Calc, maxDate, buscarProximaFechaDisponible, cargando };
}