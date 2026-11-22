// @build: 2026-11-21 | id: TEORICO-ACCESO-RESUMEN | desc: Índice determinista de acceso teórico vigente por usuario/curso para reglas Firestore.

export function resumenAccesoId(userId, cursoTeoricoId) {
  return `${String(userId)}_${String(cursoTeoricoId)}`;
}

export function vencimientoMsDeAcceso(vencimiento) {
  if (vencimiento == null) return null;
  if (typeof vencimiento?.toMillis === 'function') return vencimiento.toMillis();
  const numero = Number(vencimiento);
  return Number.isFinite(numero) ? numero : null;
}

export function esAccesoVigente(acceso, nowMs = Date.now()) {
  if (!acceso || acceso.estadoPago !== 'Aprobado') return false;
  const vencMs = vencimientoMsDeAcceso(acceso.vencimiento);
  return vencMs == null || vencMs > nowMs;
}

function msDeMarca(valor) {
  if (valor == null) return 0;
  if (typeof valor?.toMillis === 'function') return valor.toMillis();
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Resume los accesos aprobados del estudiante para el portal: un registro por
 * curso (el aprobado más reciente), con vigencia, vencimiento y módulos.
 */
export function resumirAccesosTeoricos(accesos = [], cursos = [], nowMs = Date.now()) {
  const cursosPorId = new Map((cursos || []).map((curso) => [String(curso.id), curso]));
  const aprobadosPorCurso = new Map();

  (accesos || []).forEach((acceso) => {
    if (acceso?.estadoPago !== 'Aprobado' || acceso?.cursoTeoricoId == null) return;
    const cursoId = String(acceso.cursoTeoricoId);
    const previo = aprobadosPorCurso.get(cursoId);
    if (!previo || msDeMarca(acceso.aprobadoEn) >= msDeMarca(previo.aprobadoEn)) {
      aprobadosPorCurso.set(cursoId, acceso);
    }
  });

  return Array.from(aprobadosPorCurso.entries())
    .map(([cursoId, acceso]) => {
      const curso = cursosPorId.get(cursoId) || {};
      const vencimientoMs = vencimientoMsDeAcceso(acceso.vencimiento);
      return {
        cursoId,
        accesoId: acceso.id || null,
        nombre: curso.nombre || 'Módulo formativo',
        orden: Number(curso.orden) || 99,
        totalModulos: Number(curso.totalModulos) || 0,
        totalQuizzes: Number(curso.totalQuizzes) || 0,
        estado: 'Aprobado',
        vigente: esAccesoVigente(acceso, nowMs),
        vencimientoMs,
        vitalicio: vencimientoMs == null,
        origen: acceso.origen || 'standalone'
      };
    })
    .sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre));
}

export function resumenDesdeAcceso(acceso, { estado = 'Aprobado', updatedAt = null } = {}) {
  return {
    userId: String(acceso.userId),
    cursoTeoricoId: String(acceso.cursoTeoricoId),
    estado,
    vencimientoMs: vencimientoMsDeAcceso(acceso.vencimiento),
    origen: acceso.origen || 'standalone',
    accesoId: acceso.id || null,
    packReservaId: acceso.packReservaId || null,
    updatedAt
  };
}
