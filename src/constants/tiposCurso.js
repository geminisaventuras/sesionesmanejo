export const TIPOS_CURSO = {
  EQUILIBRIO: 'equilibrio',
  BASICO_AUTO: 'basico_auto',
  BASICO_SINCRO: 'basico_sincro',
  MOTERO: 'motero',
  GENERAL: 'general'
};

export const TIPOS_CURSO_LABELS = {
  [TIPOS_CURSO.EQUILIBRIO]: 'Equilibrio',
  [TIPOS_CURSO.BASICO_AUTO]: 'Básico Automática',
  [TIPOS_CURSO.BASICO_SINCRO]: 'Básico Sincrónica',
  [TIPOS_CURSO.MOTERO]: 'Curso Motero',
  [TIPOS_CURSO.GENERAL]: 'General'
};

export const TIPOS_CURSO_OPTIONS = Object.entries(TIPOS_CURSO).map(([key, value]) => ({
  value,
  label: TIPOS_CURSO_LABELS[value]
}));

export const CURSOS_CON_MOTO_INCLUIDA = [
  TIPOS_CURSO.EQUILIBRIO,
  TIPOS_CURSO.BASICO_AUTO,
  TIPOS_CURSO.BASICO_SINCRO
];

export function incluyeMoto(tipoCurso) {
  if (!tipoCurso) return false;
  return CURSOS_CON_MOTO_INCLUIDA.includes(tipoCurso);
}
