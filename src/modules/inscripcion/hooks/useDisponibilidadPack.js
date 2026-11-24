// @build: 2026-11-23 | id: PROVEEDOR-INACTIVO | desc: Disponibilidad para agendar curso del pack; excluye motos de proveedor inactivo (activo === false).
import { useEffect, useMemo, useState } from 'react';
import { ordenarHorarios } from '../../shared/utils/horarios';
import { filtrarLocksDeOtros } from '../utils/locksHelpers';
import { getHoraIdOcupacion } from '../../shared/utils/reservaHelpers';
import { afectaFechaAdmin, afectaHorarioAdmin, afectaProveedor } from '../../shared/utils/bloqueosHelpers';
import { calcularNecesitaMoto, puedeCalcularDisponibilidad } from '../../shared/utils/motoHelpers';
import { obtenerPermitidosCurso, MOTIVO_CURSO_SIN_INSTRUCTORES, mensajeCursoSinInstructores } from '../utils/instructoresPermitidos';
import { filtrarMotosProveedorActivo } from '../utils/recursosHelpers';
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
    form, horarios, instructores, motos, proveedoresPublicos, reservasConfirmadas, activeLocks,
  selectingBlockId, currentUserId, todayStr, lockId,
  bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin
}) => {
  // SSOT-MOTO-HELPERS: derivar necesidad de moto desde helper único.
  // Si el curso tiene motoIncluida: false, NUNCA se busca moto de escuela.
  const { necesitaMoto } = calcularNecesitaMoto(cursoSeleccionado, form.traeMoto);

  // PROVEEDOR-INACTIVO: motos de un proveedor con `activo === false` no se
  // ofrecen para agendar el pack. Filtro puro, aplicado una sola vez.
  // Fuente: espejo público `proveedoresPublicos` (`{ id, activo }`).
  const motosPermitidas = filtrarMotosProveedorActivo(motos, proveedoresPublicos);

  // D10: fail-closed. Sin `instructoresPermitidos` configurado (vacío o
  // ausente) NADIE puede impartir el curso: no se listan tutores ni bloques.
  const permitidosCurso = obtenerPermitidosCurso(cursoSeleccionado);
  if (!permitidosCurso.configurado) {
    return {
      diasDisponibles: [],
      bloques: [],
      fecha2Calc: null,
      maxDate: null,
      error: {
        code: MOTIVO_CURSO_SIN_INSTRUCTORES,
        message: mensajeCursoSinInstructores()
      }
    };
  }
  const instructoresPermitidosSet = new Set(permitidosCurso.permitidos);
  const estaPermitido = (i) => instructoresPermitidosSet.has(String(i.id));

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

    // SSOT-BLOQUEOS: validar bloqueosAdmin contra fecha1 Y fecha2.
    const hayBloqueoAdmin = (bloqueosAdmin || []).some(b => {
      if (!afectaHorarioAdmin(b, bloque.id)) return false;
      if (afectaFechaAdmin(b, fecha1, form.sedeId)) return true;
      if (fecha2 && afectaFechaAdmin(b, fecha2, form.sedeId)) return true;
      return false;
    });
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
    // El lock seleccionado no se restaura a ciegas: debe seguir pasando
    // por bloqueos admin/proveedor e instructor/moto.
    const instructoresDisponibles = (instructores || [])
      .filter(estaPermitido)
      .filter(i => i.activo && (i.sedes || []).includes(form.sedeId))
      .filter(i => !isInstructorOcupado(i.id, bloque.id, fecha1, fecha2));

    let motosDisponibles = [];
    if (necesitaMoto) {
      motosDisponibles = (motosPermitidas || [])
        .filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId))
        .filter(m => !isMotoOcupada(m.id, bloque.id, fecha1, fecha2));
    }
    const motosDisponiblesBase = motosDisponibles;

    if (necesitaMoto && motosDisponibles.length > 0) {
      // SSOT-BLOQUEOS: bloqueo de proveedor contra fecha1 Y fecha2.
      motosDisponibles = motosDisponibles.filter(m => {
        const bloqueado = (bloqueosProveedor || []).some(b =>
          afectaProveedor(b, m.id, fecha1, bloque.label, m.proveedorId) ||
          (fecha2 && afectaProveedor(b, m.id, fecha2, bloque.label, m.proveedorId))
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
    const motosTotal = (motosPermitidas || []).filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId));
    // PROVEEDOR-INACTIVO: si había motos elegibles y todas quedaron fuera por
    // proveedor inactivo, se muestra el estado "No disponible" existente.
    const motosElegiblesBase = (motos || []).filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId));
    const sinMotoPorProveedorInactivo = necesitaMoto && motosTotal.length === 0 && motosElegiblesBase.length > 0;
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
      if (sinMotoPorProveedorInactivo) return { ...bloque, disponible: false, reason: 'NO_DISPONIBLE', instructorId: null, motoAsignadaId: null };
      if (instructoresLibresSinLocks === 0 || motosLibresSinLocks === 0) return { ...bloque, disponible: false, reason: 'RESERVADO', instructorId: null, motoAsignadaId: null };
      return { ...bloque, disponible: false, reason: 'EN_ESPERA_PAGO', instructorId: null, motoAsignadaId: null };
    }
  };

  const today = todayStr;
  const maxDate = (() => {
    const d = new Date(todayStr + 'T12:00:00');
    d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1);
    return d.toISOString().split('T')[0];
  })();

  const diasDisponibles = [];
  // SSOT-MOTO-HELPERS: calcular días cuando sede + (tipoMoto O curso sin moto).
  if (puedeCalcularDisponibilidad(form.sedeId, form.tipoMoto, cursoSeleccionado)) {
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
  proveedoresPublicos,
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
  // ERR-051: tick interno de 60 s para reevaluar `isPastBlock` sin recargar.
  // No añade listeners ni consultas: solo fuerza el recálculo del memo.
  const [tickInterno, setTickInterno] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = setInterval(() => setTickInterno(Date.now()), 60_000);
    return () => clearInterval(intervalo);
  }, []);

  return useMemo(() => {
    const emptyResult = { diasDisponibles: [], bloques: [], fecha2Calc: null, maxDate: null, error: null };

    // Sin curso cargado todavía no hay política que evaluar (ni error que mostrar).
    if (!cursoSeleccionado) return emptyResult;

    // D10: la falta de configuración se informa antes que la falta de datos,
    // para que la UI muestre el motivo real y no "no hay fechas".
    if (!obtenerPermitidosCurso(cursoSeleccionado).configurado) {
      return {
        ...emptyResult,
        error: { code: MOTIVO_CURSO_SIN_INSTRUCTORES, message: mensajeCursoSinInstructores() }
      };
    }

    if (!instructores?.length || !motos?.length || !horarios?.length) return emptyResult;
    if (!form.sedeId || !form.tipoMoto) return emptyResult;
    
    const cursoUnDia = (cursoSeleccionado?.duracionTotal || 240) <= 120;
    return evaluarDisponibilidad({
      form, horarios, instructores, motos,
      proveedoresPublicos,
      reservasConfirmadas, activeLocks,
      selectingBlockId, currentUserId, todayStr, lockId,
      bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin
    });
  }, [
  form, horarios, instructores, motos, proveedoresPublicos, reservasConfirmadas, activeLocks,
    selectingBlockId, currentUserId, todayStr, lockId, bloqueosProveedor,
    bloqueosAdmin, cursoSeleccionado, sedeSeleccionada, clockTick, tickInterno
  ]);
}

export default useDisponibilidadPack;
