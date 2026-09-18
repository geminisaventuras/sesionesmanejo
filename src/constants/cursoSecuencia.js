import { TIPOS_CURSO } from './tiposCurso';

export const CURSO_SECUENCIA = {
  [TIPOS_CURSO.EQUILIBRIO]: {
    orden: 1,
    prerequisito: null,
    tipoMotoFijo: 'Automática'
  },
  [TIPOS_CURSO.BASICO_AUTO]: {
    orden: 2,
    prerequisito: null,
    tipoMotoFijo: 'Automática'
  },
  [TIPOS_CURSO.BASICO_SINCRO]: {
    orden: 2,
    prerequisito: null,
    tipoMotoFijo: 'Sincrónica'
  },
  [TIPOS_CURSO.GENERAL]: {
    orden: 3,
    prerequisito: [TIPOS_CURSO.BASICO_AUTO, TIPOS_CURSO.BASICO_SINCRO],
    tipoMotoFijo: null
  },
  [TIPOS_CURSO.MOTERO]: {
    orden: 4,
    prerequisito: [TIPOS_CURSO.GENERAL],
    tipoMotoFijo: null
  }
};

export function cumplePrerequisito(tipoCurso, reservasAprobadas = [], curso = null) {
  const config = CURSO_SECUENCIA[tipoCurso];
  // A2.2: preferir curso.prerequisitos (editable desde admin).
  // Fallback a CURSO_SECUENCIA[tipoCurso].prerequisito (hardcode legacy).
  const prereqs = Array.isArray(curso?.prerequisitos)
    ? curso.prerequisitos
    : (config?.prerequisito || []);

  if (!Array.isArray(prereqs) || prereqs.length === 0) return true;

  return reservasAprobadas.some(r => {
    if (!prereqs.includes(r.tipoCurso)) return false;

    if (r.estadoCurso === 'Aprobado') return true;

    const modulosEstado = r.modulosEstado || {};
    const totalModulos = Object.keys(modulosEstado).length;

    if (totalModulos > 0 && Object.values(modulosEstado).every(m => m && m.fecha)) {
      return true;
    }

    return false;
  });
}

export function getTipoMotoDeBasico(reservasAprobadas = []) {
  const basicos = reservasAprobadas
    .filter(r =>
      r.tipoCurso === TIPOS_CURSO.BASICO_AUTO ||
      r.tipoCurso === TIPOS_CURSO.BASICO_SINCRO
    )
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });

  if (basicos.length === 0) return null;

  return basicos[0].tipoCurso === TIPOS_CURSO.BASICO_AUTO
    ? 'Automática'
    : 'Sincrónica';
}
