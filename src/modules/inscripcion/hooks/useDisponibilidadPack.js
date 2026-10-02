// @build: 2026-09-27.A2.17 | id: HOOK-DISPONIBILIDAD-PACK | desc: Disponibilidad para agendar curso del pack (copia de evaluarDisponibilidad de InscripcionView con bloqueos admin/proveedor)
import { useMemo } from 'react';
import { ordenarHorarios } from '../../shared/utils/horarios';
import { filtrarLocksDeOtros } from '../utils/locksHelpers';
import { getHoraIdOcupacion } from '../../shared/utils/reservaHelpers';
const MAX_DIAS_RESERVA = 30;

const getCaracasTime = () => {
  const d = new Date();
  const caracasStr = d.toLocaleString('en-US', { timeZone: 'America/Caracas' });
  return new Date(caracasStr);
};

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
    const blockTime = getCaracasTime();
    blockTime.setHours(hours, mins, 0, 0);
    return getCaracasTime() > blockTime;
  } catch (e) { return false; }
};

// ─── Función pura (idéntica a InscripcionView.evaluarDisponibilidad) ────
const evaluarDisponibilidad = ({
  form, horarios, instructores, motos, reservasConfirmadas, activeLocks,
  selectingBlockId, currentUserId, todayStr, lockId,
  bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin
}) => {
  const necesitaMoto = form.traeMoto !== 'Sí';

  // Filtro crítico: solo instructores en curso.instructoresPermitidos.
  // Array vacío o ausente = todos permitidos (compatibilidad con cursos legacy).
  const instructoresPermitidosSet = (() => {
    const lista = cursoSeleccionado?.instructoresPermitidos;
    if (!Array.isArray(lista) || lista.length === 0) return null;
    return new Set(lista.map(String));
  })();
  const estaPermitido = (i) => !instructoresPermitidosSet || instructoresPermitidosSet.has(String(i.id));

  const locksDeOtros = (activeLocks || []).filter(l => {
    if (l.userId === currentUserId) return false;
    if (!l.instructorId || !l.fecha || !l.horaId || !l.expiresAt) return false;
    if (l.expiresAt.toMillis() <= Date.now()) return false;
    return true;
  });

  const reservasDeOtros = reservasConfirmadas || [];

    const isInstructorOcupado = (instructorId, bloqueId, fecha1, fecha2) => {
    const enReserva = reservasDeOtros.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.instructorId !== instructorId) return false;
      if (fecha1 && getHoraIdOcupacion(r, fecha1) === bloqueId) return true;
      if (fecha2 && getHoraIdOcupacion(r, fecha2) === bloqueId) return true;
      return false;
    });
    if (enReserva) return true;
    const enLock = locksDeOtros.some(lock => {
      if (lock.instructorId !== instructorId) return false;
      if (lock.horaId !== bloqueId) return false;
      return lock.fecha === fecha1 || (fecha2 && lock.fecha === fecha2);
    });
    return enLock;
  };

  const isMotoOcupada = (motoId, bloqueId, fecha1, fecha2) => {
    const enReserva = reservasDeOtros.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.motoAsignadaId !== motoId && r.motoReposicionId !== motoId) return false;
      if (r.traeMoto === 'Sí') return false;
      if (fecha1 && getHoraIdOcupacion(r, fecha1) === bloqueId) return true;
      if (fecha2 && getHoraIdOcupacion(r, fecha2) === bloqueId) return true;
      return false;
    });
    if (enReserva) return true;
    const enLock = locksDeOtros.some(lock => {
      if (lock.motoAsignadaId !== motoId) return false;
      if (lock.horaId !== bloqueId) return false;
      return lock.fecha === fecha1 || (fecha2 && lock.fecha === fecha2);
    });
    return enLock;
  };

  const fecha2Calc = cursoUnDia
    ? null
    : (form.fecha1 ? (() => {
        const d = new Date(form.fecha1 + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })() : null);

  const calcularBloque = (bloque, fecha1, fecha2) => {
    if (bloque.isLunch) return { ...bloque, disponible: false, reason: 'ALMUERZO', instructorId: null, motoAsignadaId: null };

    const afectaFecha = (b, f) => {
      if (!f) return false;
      if (f < b.fechaInicio) return false;
      const fin = b.fechaFin || b.fechaInicio;
      if (f > fin) return false;
      if (b.sedeId && String(b.sedeId) !== String(form.sedeId)) return false;
      if (b.todoElDia) return true;
      return (b.horarios || []).includes(bloque.id);
    };
    const hayBloqueoAdmin = (bloqueosAdmin || []).some(b =>
      afectaFecha(b, fecha1) || afectaFecha(b, fecha2)
    );
    if (hayBloqueoAdmin) {
      return { ...bloque, disponible: false, reason: 'BLOQUEO_ADMIN', instructorId: null, motoAsignadaId: null };
    }

    const horariosDeSede = sedeSeleccionada?.horariosHabilitados || [];
    const horariosDelCurso = cursoSeleccionado?.horariosPorSede?.[form.sedeId];
    const horariosPermitidos = (horariosDelCurso !== undefined) ? horariosDelCurso : horariosDeSede;
    if (horariosPermitidos.length > 0 && !horariosPermitidos.includes(bloque.id)) {
      return { ...bloque, disponible: false, reason: 'NO_OFRECIDO', instructorId: null, motoAsignadaId: null };
    }

    if (fecha1 < todayStr || isPastBlock(fecha1, bloque.label, todayStr))
      return { ...bloque, disponible: false, reason: 'CERRADO', instructorId: null, motoAsignadaId: null };
    if (bloque.id === selectingBlockId)
      return { ...bloque, disponible: true, reason: '', instructorId: null, motoAsignadaId: null, seleccionando: true };
    if (lockId && form.horaId === bloque.id)
      return { ...bloque, disponible: true, reason: '', restaurado: true };

        const instructoresDisponibles = (instructores || [])
      .filter(estaPermitido)
      .filter(i => i.activo && (i.sedes || []).includes(form.sedeId))
      .filter(i => !isInstructorOcupado(i.id, bloque.id, fecha1, fecha2));

    let motosDisponibles = [];
    if (necesitaMoto) {
      motosDisponibles = (motos || [])
        .filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId))
        .filter(m => !isMotoOcupada(m.id, bloque.id, fecha1, fecha2));
    }
    const motosDisponiblesBase = motosDisponibles;

    if (necesitaMoto && motosDisponibles.length > 0) {
      const afectaProveedor = (b, motoId, f) => {
        if (!f) return false;
        if (b.motoId !== motoId && b.motoId !== 'ALL') return false;
        if (b.fecha !== f) return false;
        const [hIni, mIni] = (b.horaInicio || '00:00').split(':').map(Number);
        const [hFin, mFin] = (b.horaFin || '23:59').split(':').map(Number);
        const bloqueInicio = hIni * 60 + mIni;
        const bloqueFin = hFin * 60 + mFin;
        const labelParts = bloque.label.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!labelParts) return false;
        let hBloque = parseInt(labelParts[1], 10);
        const mBloque = parseInt(labelParts[2], 10);
        const mod = labelParts[3].toUpperCase();
        if (mod === 'PM' && hBloque < 12) hBloque += 12;
        if (mod === 'AM' && hBloque === 12) hBloque = 0;
        const bloqueMinutos = hBloque * 60 + mBloque;
        return bloqueMinutos >= bloqueInicio && bloqueMinutos < bloqueFin;
      };
      motosDisponibles = motosDisponibles.filter(m => {
        const bloqueado = (bloqueosProveedor || []).some(b =>
          afectaProveedor(b, m.id, fecha1) || afectaProveedor(b, m.id, fecha2)
        );
        return !bloqueado;
      });
    }

    if (necesitaMoto && motosDisponibles.length === 0 && instructoresDisponibles.length > 0 && motosDisponiblesBase.length > 0) {
      return { ...bloque, disponible: false, reason: 'BLOQUEO_PROVEEDOR', instructorId: null, motoAsignadaId: null };
    }

    const instructorSeleccionado = instructoresDisponibles.find(i => i.esPrincipal) || instructoresDisponibles[0];

    if (!necesitaMoto) {
      if (instructorSeleccionado)
        return { ...bloque, disponible: true, reason: '', instructorId: instructorSeleccionado.id, motoAsignadaId: null };
    } else {
      if (instructorSeleccionado && motosDisponibles.length > 0)
        return { ...bloque, disponible: true, reason: '', instructorId: instructorSeleccionado.id, motoAsignadaId: motosDisponibles[0].id };
    }

       const instructoresTotal = (instructores || [])
      .filter(estaPermitido)
      .filter(i => i.activo && (i.sedes || []).includes(form.sedeId));
    const motosTotal = (motos || []).filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId));
       const instructoresLibresSinLocks = instructoresTotal.filter(i => !reservasDeOtros.some(r => {
      if (r.instructorId !== i.id) return false;
      if (fecha1 && getHoraIdOcupacion(r, fecha1) === bloque.id) return true;
      if (fecha2 && getHoraIdOcupacion(r, fecha2) === bloque.id) return true;
      return false;
    })).length;

    const motosLibresSinLocks = necesitaMoto
      ? motosTotal.filter(m => !reservasDeOtros.some(r => {
          if (r.traeMoto === 'Sí') return false;
          if (r.motoAsignadaId !== m.id && r.motoReposicionId !== m.id) return false;
          if (fecha1 && getHoraIdOcupacion(r, fecha1) === bloque.id) return true;
          if (fecha2 && getHoraIdOcupacion(r, fecha2) === bloque.id) return true;
          return false;
        })).length
      : 999;

    if (!necesitaMoto) {
      if (instructoresLibresSinLocks === 0) return { ...bloque, disponible: false, reason: 'RESERVADO', instructorId: null, motoAsignadaId: null };
      return { ...bloque, disponible: false, reason: 'EN_ESPERA_PAGO', instructorId: null, motoAsignadaId: null };
    } else {
      if (instructoresLibresSinLocks === 0 || motosLibresSinLocks === 0) return { ...bloque, disponible: false, reason: 'RESERVADO', instructorId: null, motoAsignadaId: null };
      return { ...bloque, disponible: false, reason: 'EN_ESPERA_PAGO', instructorId: null, motoAsignadaId: null };
    }
  };

  const today = todayStr;
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1);
    return d.toISOString().split('T')[0];
  })();

  const diasDisponibles = [];
  if (form.sedeId && form.tipoMoto) {
    const cursor = new Date(today + 'T12:00:00');
    const fin = new Date(maxDate + 'T12:00:00');
    while (cursor <= fin) {
      const fechaStr = cursor.toISOString().split('T')[0];
      const fecha2Candidate = cursoUnDia
        ? null
        : (() => {
            const d2 = new Date(cursor);
            d2.setDate(d2.getDate() + 1);
            return d2.toISOString().split('T')[0];
          })();
      const hayAlguno = (horarios || []).filter(h => h.activo && !h.isLunch).some(bloque => {
        const info = calcularBloque(bloque, fechaStr, fecha2Candidate);
        return info.disponible;
      });
      diasDisponibles.push({ fecha: fechaStr, disponible: hayAlguno });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const bloques = ordenarHorarios((horarios || []).filter(h => h.activo)).map(b => calcularBloque(b, form.fecha1, fecha2Calc));

  return { diasDisponibles, bloques, fecha2Calc, maxDate };
};

// ─── Hook público ─────────────────────────────────────
export function useDisponibilidadPack({
  form,
  horarios,
  instructores,
  motos,
  reservasConfirmadas,
  activeLocks,
  selectingBlockId,
  currentUserId,
  todayStr,
  lockId,
  bloqueosProveedor,
  bloqueosAdmin,
  cursoSeleccionado,
  sedeSeleccionada,
  clockTick = 0
}) {
  return useMemo(() => {
    if (!instructores?.length || !motos?.length || !horarios?.length) return null;
    const cursoUnDia = (cursoSeleccionado?.duracionTotal || 240) <= 120;
    return evaluarDisponibilidad({
      form, horarios, instructores, motos,
      reservasConfirmadas, activeLocks,
      selectingBlockId, currentUserId, todayStr, lockId,
      bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin
    });
  }, [
    form, horarios, instructores, motos, reservasConfirmadas, activeLocks,
    selectingBlockId, currentUserId, todayStr, lockId, bloqueosProveedor,
    bloqueosAdmin, cursoSeleccionado, sedeSeleccionada, clockTick
  ]);
}

export default useDisponibilidadPack;
