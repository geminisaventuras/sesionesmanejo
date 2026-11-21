// @build: 2026-11-06 | id: ADMIN-OCUPACION-PARCIAL | desc: Agrega estado parcial_bloqueado para bloqueos en algunas sedes.
import { afectaFechaAdmin, afectaHorarioAdmin, afectaInstructor, afectaProveedor } from '../../shared/utils/bloqueosHelpers';
import { getHoraIdOcupacion } from '../../shared/utils/reservaHelpers';

export function calcularEstadoBloque({
  fecha,
  bloque,
  instructores = [],
  motos = [],
  cursos = [],
  reservas = [],
  bloqueosAdmin = [],
  bloqueosInstructores = [],
  bloqueosProveedor = [],
  filtros = {} // { sedeId, cursoId, instructorId, motoId }
}) {
  const { sedeId, cursoId, instructorId, motoId } = filtros;

  // ==========================================
  // 1. VERIFICAR BLOQUEOS (Máxima Prioridad)
  // ==========================================
  
  // Detectar bloqueos de admin globales (sin sede) y parciales (con sede)
  const bloqueosAdminRelevantes = bloqueosAdmin.filter(b => {
    const aplicaFecha = b.fechaInicio <= fecha && (b.fechaFin || b.fechaInicio) >= fecha;
    return aplicaFecha && afectaHorarioAdmin(b, bloque.id);
  });

  const hayBloqueoAdminGlobal = bloqueosAdminRelevantes.some(b => !b.sedeId || b.sedeId === null);
  const hayBloqueoAdminParcial = bloqueosAdminRelevantes.some(b => b.sedeId && b.sedeId !== null);

  if (sedeId) {
    // Si hay un filtro de sede, verificar si el bloqueo afecta a esa sede
    const afectaEstaSede = bloqueosAdminRelevantes.some(b => 
      !b.sedeId || String(b.sedeId) === String(sedeId)
    );
    if (afectaEstaSede) {
      return { estado: 'bloqueado', total: 0, disponibles: 0, motivo: 'Admin', reservas: [] };
    }
  } else {
    // Filtro "Todas"
    if (hayBloqueoAdminGlobal) {
      return { estado: 'bloqueado', total: 0, disponibles: 0, motivo: 'Admin', reservas: [] };
    }
    if (hayBloqueoAdminParcial) {
      // No retornamos inmediatamente, seguimos para calcular cupos,
      // pero al final forzaremos el estado a 'parcial_bloqueado'.
    }
  }

  // Bloqueo de Instructor (solo si hay filtro específico)
  if (instructorId) {
    const hayBloqueoInstructor = bloqueosInstructores.some(b => 
      afectaInstructor(b, instructorId, fecha, bloque.id, sedeId)
    );
    if (hayBloqueoInstructor) {
      return { estado: 'bloqueado', total: 1, disponibles: 0, motivo: 'Instructor', reservas: [] };
    }
  }

  // Bloqueo de Proveedor (solo si hay filtro específico)
  if (motoId) {
    const hayBloqueoProveedor = bloqueosProveedor.some(b => 
      afectaProveedor(
        b,
        motoId,
        fecha,
        bloque.label,
        motos.find(m => String(m.id) === String(motoId))?.proveedorId
      )
    );
    if (hayBloqueoProveedor) {
      return { estado: 'bloqueado', total: 1, disponibles: 0, motivo: 'Proveedor', reservas: [] };
    }
  }

  // ==========================================
  // 2. FILTRAR RECURSOS DISPONIBLES (Base)
  // ==========================================
  
  const cursoObj = cursos.find(c => String(c.id) === String(cursoId));
  
  let instructoresValidos = instructores.filter(i => {
    if (!i.activo) return false;
    if (sedeId && !(i.sedes || []).includes(sedeId)) return false;
    if (instructorId && String(i.id) !== String(instructorId)) return false;
    if (cursoObj && Array.isArray(cursoObj.instructoresPermitidos) && cursoObj.instructoresPermitidos.length > 0) {
      if (!cursoObj.instructoresPermitidos.includes(String(i.id))) return false;
    }
    return true;
  });

  let motosValidas = motos.filter(m => {
    if (!m.activo) return false;
    if (sedeId && !(m.sedes || []).includes(sedeId)) return false;
    if (motoId && String(m.id) !== String(motoId)) return false;
    return true;
  });

  // Un bloqueo "ALL" de proveedor solo excluye las motos de ese proveedor.
  // Cuando el filtro es "Todas", la matriz debe reflejar el bloqueo parcial.
  const motosBloqueadasProveedor = motosValidas.filter(m =>
    (bloqueosProveedor || []).some(b =>
      afectaProveedor(b, m.id, fecha, bloque.label, m.proveedorId)
    )
  );
  const motosDisponiblesProveedor = motosValidas.filter(m =>
    !motosBloqueadasProveedor.some(b => String(b.id) === String(m.id))
  );

  if (motosValidas.length > 0 && motosDisponiblesProveedor.length === 0) {
    return { estado: 'bloqueado', total: 0, disponibles: 0, motivo: 'Proveedor', reservas: [] };
  }

  // ==========================================
  // 3. CALCULAR OCUPADOS Y RESERVAS DEL BLOQUE
  // ==========================================
  
  const reservasEnBloque = reservas.filter(r => {
    if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
    const horaEfectiva = getHoraIdOcupacion(r, fecha);
    if (horaEfectiva !== bloque.id) return false;
    if (sedeId && r.sedeId !== sedeId) return false;
    if (cursoId && String(r.cursoId) !== String(cursoId)) return false;
    return true;
  });

  const instructoresOcupados = instructoresValidos.filter(i => 
    reservasEnBloque.some(r => String(r.instructorId) === String(i.id))
  );

  const motosOcupadas = motosDisponiblesProveedor.filter(m => 
    reservasEnBloque.some(r => String(r.motoAsignadaId) === String(m.id))
  );

  const totalInstructores = instructoresValidos.length;
  const disponiblesInstructores = Math.max(0, totalInstructores - instructoresOcupados.length);
  
  const totalMotos = motosDisponiblesProveedor.length;
  const disponiblesMotos = Math.max(0, totalMotos - motosOcupadas.length);

  const totalReal = totalMotos > 0 ? Math.min(totalInstructores, totalMotos) : totalInstructores;
  const disponiblesReal = totalMotos > 0 ? Math.min(disponiblesInstructores, disponiblesMotos) : disponiblesInstructores;

  // ==========================================
  // 4. DETERMINAR ESTADO FINAL
  // ==========================================
  
  let estado = 'libre';
  if (disponiblesReal === 0) estado = 'lleno';
  else if (disponiblesReal < totalReal) estado = 'parcial';

  // Forzar 'parcial_bloqueado' si había un bloqueo parcial de admin o proveedor
  // y no es un bloqueo total.
  if (motosBloqueadasProveedor.length > 0 && estado !== 'bloqueado') {
    estado = 'parcial_bloqueado';
  }
  if (!sedeId && hayBloqueoAdminParcial && estado !== 'bloqueado') {
    estado = 'parcial_bloqueado';
  }

  return {
    estado,
    total: totalReal,
    disponibles: disponiblesReal,
    reservas: reservasEnBloque,
    motivo: null
  };
}
