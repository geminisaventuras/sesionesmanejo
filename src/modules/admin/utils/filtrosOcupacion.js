// @build: 2026-11-23 | id: ERR-038-FILTROS-OCUPACION | desc: Filtros dependientes puros de Ocupación (sede→motos/instructores/cursos, curso→instructores/moto).
//
// Solo presentación/validación de opciones. No consulta Firestore, no calcula
// ocupación, no cambia `value` (IDs) ni la lógica de datos de T-072.
// Reglas (ERR-038):
// - Sede: motos e instructores activos que incluyen la sede; cursos excluidos si
//   `horariosPorSede` no está vacío y no contiene la sede (vacío = fallback).
// - Curso: tutores solo si `instructoresPermitidos` los incluye; vacío/ausente
//   = fail-closed (ninguno). Motos solo si el curso requiere moto y acepta su tipo.
// - Moto: no restringe tutores; sí restringe cursos (tipo compatible y requiere moto).
// - Instructor: restringe cursos a los que lo permiten.
// - Limpieza: al cambiar una selección se eliminan las dependientes inválidas.
import { instructorPermitidoEnCurso } from '../../inscripcion/utils/instructoresPermitidos.js';

const textoId = (valor) => (valor === null || valor === undefined ? '' : String(valor).trim());
const textoTipo = (valor) => (valor === null || valor === undefined ? '' : String(valor).trim());
const listaIds = (valor) => (Array.isArray(valor) ? valor.map(textoId).filter(Boolean) : []);
const listaTipos = (valor) => (Array.isArray(valor) ? valor.map(textoTipo).filter(Boolean) : []);

const buscarPorId = (lista, valor) => {
  const id = textoId(valor);
  if (!id) return null;
  return (lista || []).find((item) => textoId(item?.id) === id) || null;
};

/** Activo/a solo si el catálogo lo marca (misma regla que la matriz T-072). */
const estaActivo = (recurso) => Boolean(recurso?.activo);

/** La sede debe estar en `recurso.sedes` (lista estricta, sin comodín). */
const incluyeSede = (recurso, sedeId) => {
  const sede = textoId(sedeId);
  if (!sede) return true;
  return listaIds(recurso?.sedes).includes(sede);
};

/**
 * Regla de sede del curso: si `horariosPorSede` tiene claves, la sede debe ser
 * una de ellas; si está vacío/ausente, el curso cae a los horarios de la sede.
 */
export function cursoDisponibleEnSede(curso, sedeId) {
  const sede = textoId(sedeId);
  if (!sede) return true;
  const mapa = curso?.horariosPorSede;
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return true;
  const claves = Object.keys(mapa);
  if (claves.length === 0) return true;
  return claves.some((clave) => {
    if (textoId(clave) !== sede) return false;
    const horarios = mapa[clave];
    // Una sede con lista vacía se configuró sin horarios: no se ofrece ahí.
    if (Array.isArray(horarios)) return horarios.length > 0;
    return true;
  });
}

/** El curso requiere moto salvo `motoIncluida === false`. */
export function cursoRequiereMoto(curso) {
  if (!curso) return true;
  return curso.motoIncluida !== false;
}

/**
 * Compatibilidad de tipo: `tiposMotoEscuela` vacío = legacy (todos los tipos).
 * Un curso sin moto nunca acepta una moto del inventario.
 */
export function cursoAdmiteTipoMoto(curso, tipoMoto) {
  if (!curso || curso.motoIncluida === false) return false;
  const tipos = listaTipos(curso.tiposMotoEscuela);
  if (tipos.length === 0) return true;
  return tipos.includes(textoTipo(tipoMoto));
}

/** Curso + moto: requiere moto y el tipo de la moto debe estar permitido. */
export function cursoCompatibleConMoto(curso, moto) {
  if (!curso || !moto) return true;
  if (!cursoRequiereMoto(curso)) return false;
  return cursoAdmiteTipoMoto(curso, moto.tipo);
}

export function instructorDisponibleEnSede(instructor, sedeId) {
  return estaActivo(instructor) && incluyeSede(instructor, sedeId);
}

export function motoDisponibleEnSede(moto, sedeId) {
  return estaActivo(moto) && incluyeSede(moto, sedeId);
}

/** Tutor válido para la sede y, si hay curso, para su allowlist (fail-closed). */
export function instructorValidoContexto(instructor, sedeId, curso) {
  if (!instructorDisponibleEnSede(instructor, sedeId)) return false;
  if (curso && !instructorPermitidoEnCurso(curso, instructor.id)) return false;
  return true;
}

/** Moto válida para la sede y, si hay curso, para su requerimiento/tipo. */
export function motoValidaContexto(moto, sedeId, curso) {
  if (!motoDisponibleEnSede(moto, sedeId)) return false;
  if (curso && !cursoCompatibleConMoto(curso, moto)) return false;
  return true;
}

/**
 * Opciones dependientes. Cada lista se calcula con las DEMÁS selecciones
 * aplicadas (nunca con la propia), para evitar ciclos.
 *
 * @param {object} params
 * @param {Array} [params.cursos]
 * @param {Array} [params.instructores]
 * @param {Array} [params.motos]
 * @param {object} [params.seleccion] `{ filtroSede, filtroCurso, filtroInstructor, filtroMoto }`
 * @returns {{ cursos: Array, instructores: Array, motos: Array, motoHabilitada: boolean }}
 */
export function opcionesFiltrosOcupacion({
  cursos = [],
  instructores = [],
  motos = [],
  seleccion = {},
} = {}) {
  const sedeId = textoId(seleccion.filtroSede);
  const curso = buscarPorId(cursos, seleccion.filtroCurso);
  const instructor = buscarPorId(instructores, seleccion.filtroInstructor);
  const moto = buscarPorId(motos, seleccion.filtroMoto);

  const cursosValidos = (cursos || []).filter((item) => {
    if (!cursoDisponibleEnSede(item, sedeId)) return false;
    if (instructor && !instructorPermitidoEnCurso(item, instructor.id)) return false;
    if (moto && !cursoCompatibleConMoto(item, moto)) return false;
    return true;
  });

  const instructoresValidos = (instructores || []).filter((item) =>
    instructorValidoContexto(item, sedeId, curso)
  );

  const motoHabilitada = curso ? cursoRequiereMoto(curso) : true;
  const motosValidas = motoHabilitada
    ? (motos || []).filter((item) => motoValidaContexto(item, sedeId, curso))
    : [];

  return {
    cursos: cursosValidos,
    instructores: instructoresValidos,
    motos: motosValidas,
    motoHabilitada,
  };
}

/**
 * Limpia selecciones dependientes imposibles. El campo que el usuario acaba de
 * cambiar tiene prioridad: se conserva y se limpia el dependiente incompatible.
 * Sin `campoCambiado` se hace una validación completa (aplicar/lote).
 *
 * @returns {{ filtroSede: string, filtroCurso: string, filtroInstructor: string, filtroMoto: string }}
 */
export function limpiarSeleccionesOcupacion({
  cursos = [],
  instructores = [],
  motos = [],
  seleccion = {},
  campoCambiado,
} = {}) {
  const resultado = {
    filtroSede: textoId(seleccion.filtroSede),
    filtroCurso: textoId(seleccion.filtroCurso),
    filtroInstructor: textoId(seleccion.filtroInstructor),
    filtroMoto: textoId(seleccion.filtroMoto),
  };

  // IDs que ya no existen en el catálogo no se conservan.
  if (resultado.filtroCurso && !buscarPorId(cursos, resultado.filtroCurso)) resultado.filtroCurso = '';
  if (resultado.filtroInstructor && !buscarPorId(instructores, resultado.filtroInstructor)) {
    resultado.filtroInstructor = '';
  }
  if (resultado.filtroMoto && !buscarPorId(motos, resultado.filtroMoto)) resultado.filtroMoto = '';

  // Al elegir tutor/moto, el curso incompatible es el dependiente: se limpia.
  if (campoCambiado === 'filtroInstructor' && resultado.filtroCurso && resultado.filtroInstructor) {
    const curso = buscarPorId(cursos, resultado.filtroCurso);
    const instructor = buscarPorId(instructores, resultado.filtroInstructor);
    if (curso && instructor && !instructorPermitidoEnCurso(curso, instructor.id)) {
      resultado.filtroCurso = '';
    }
  }
  if (campoCambiado === 'filtroMoto' && resultado.filtroCurso && resultado.filtroMoto) {
    const curso = buscarPorId(cursos, resultado.filtroCurso);
    const moto = buscarPorId(motos, resultado.filtroMoto);
    if (curso && moto && !cursoCompatibleConMoto(curso, moto)) {
      resultado.filtroCurso = '';
    }
  }

  // Consistencia final: solo se limpian dependientes inválidos (máx. 4 pasadas).
  for (let intento = 0; intento < 4; intento += 1) {
    const curso = buscarPorId(cursos, resultado.filtroCurso);

    if (resultado.filtroCurso && curso && !cursoDisponibleEnSede(curso, resultado.filtroSede)) {
      resultado.filtroCurso = '';
      continue;
    }

    if (resultado.filtroInstructor) {
      const instructor = buscarPorId(instructores, resultado.filtroInstructor);
      if (!instructorValidoContexto(instructor, resultado.filtroSede, curso)) {
        resultado.filtroInstructor = '';
        continue;
      }
    }

    if (resultado.filtroMoto) {
      const moto = buscarPorId(motos, resultado.filtroMoto);
      if (!motoValidaContexto(moto, resultado.filtroSede, curso)) {
        resultado.filtroMoto = '';
        continue;
      }
    }

    break;
  }

  return resultado;
}
