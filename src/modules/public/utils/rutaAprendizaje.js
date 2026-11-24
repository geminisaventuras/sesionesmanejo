// @build: 2026-11-22 | id: FT-034-RUTA-APRENDIZAJE | desc: Derivación pura de la ruta pública de aprendizaje (sin Firestore).
//
// La ruta agrupa el catálogo real en tres etapas base:
//   1. Equilibrio
//   2. Sesiones básicas (bifurcación Automática / Sincrónica)
//   3. Práctica y refuerzo (Refuerzo Práctico)
// El resto de sesiones activas (equilibrio avanzado y nuevas) se exponen en
// `cursosExtra` para el bloque "Ver todas las sesiones".
//
// Reglas duras:
// - El orden de cursos sale de CURSO_SECUENCIA; fallback 99.
// - Los packs se ordenan por el mínimo orden de sus cursoIds, nunca por pack.orden.
// - No se inventan cursos, precios ni "Refuerzo": solo se muestra lo publicado.
// - El curso avanzado se reconoce por `tipoCurso: equilibrio_avanzado` o por
//   nombre "Equilibrio Avanzado" mientras el catálogo no tenga el tipo nuevo.
// - Función pura y determinista: no lee fechas, reloj, localStorage ni Firestore.

import { CURSO_SECUENCIA } from '../../../constants/cursoSecuencia.js';

export const ORDEN_FALLBACK = 99;

export const ETAPAS_RUTA = Object.freeze([
  {
    clave: 'equilibrio',
    numero: 1,
    titulo: 'Equilibrio',
    descripcion: 'Primer contacto con la moto: postura, control y confianza a baja velocidad.',
    tipo: 'curso'
  },
  {
    clave: 'basicas',
    numero: 2,
    titulo: 'Sesiones básicas',
    descripcion: 'Dos caminos válidos para empezar a rodar: elige tu tipo de vehículo.',
    tipo: 'bifurcacion'
  },
  {
    clave: 'practica',
    numero: 3,
    titulo: 'Práctica y refuerzo',
    descripcion: 'Consolida lo aprendido con sesiones de refuerzo y práctica supervisada.',
    tipo: 'curso'
  }
]);

const CLAVES_BASICAS = Object.freeze(['basico_auto', 'basico_sincro']);
const ETAPAS_POR_CLAVE = Object.freeze(
  ETAPAS_RUTA.reduce((acc, etapa) => ({ ...acc, [etapa.clave]: etapa }), {})
);

const ETAPA_POR_TIPO = Object.freeze({
  equilibrio: 'equilibrio',
  basico_auto: 'basicas',
  basico_sincro: 'basicas',
  general: 'practica',
  motero: 'practica',
  equilibrio_avanzado: 'equilibrio_avanzado'
});

function textoNormalizado(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function esCursoEquilibrioAvanzado(curso) {
  if (!curso || typeof curso !== 'object') return false;
  if (curso.tipoCurso === 'equilibrio_avanzado') return true;
  return curso.tipoCurso === 'general' && textoNormalizado(curso.nombre).includes('equilibrio avanzado');
}

/**
 * Etapa base del curso. El avanzado y los tipos no clasificados van a `extra`
 * (bloque "Ver todas las sesiones"), no a la etapa 3.
 */
export function etapaDeCurso(curso) {
  if (esCursoEquilibrioAvanzado(curso)) return 'extra';
  if (curso?.tipoCurso === 'general' || curso?.tipoCurso === 'motero') return 'practica';
  return ETAPA_POR_TIPO[curso?.tipoCurso] || 'extra';
}

export function ordenDeCurso(curso) {
  return Number(CURSO_SECUENCIA[curso?.tipoCurso]?.orden) || ORDEN_FALLBACK;
}

export function etapaDeTipoCurso(tipoCurso) {
  return ETAPA_POR_TIPO[tipoCurso] || 'practica';
}

function textoComparable(valor) {
  return String(valor == null ? '' : valor).trim();
}

function compararCursos(a, b) {
  const diferenciaOrden = ordenDeCurso(a) - ordenDeCurso(b);
  if (diferenciaOrden !== 0) return diferenciaOrden;
  return textoComparable(a?.nombre).localeCompare(textoComparable(b?.nombre), 'es', {
    sensitivity: 'base'
  });
}

function normalizarCursos(cursos) {
  const vistos = new Set();
  return (Array.isArray(cursos) ? cursos : []).filter((curso) => {
    if (!curso || typeof curso !== 'object') return false;
    if (curso.id == null) return true;
    const id = String(curso.id);
    if (vistos.has(id)) return false;
    vistos.add(id);
    return true;
  });
}

function construirCarriles(cursos) {
  return CLAVES_BASICAS.map((tipoCurso) => ({
    tipoCurso,
    etiqueta: CURSO_SECUENCIA[tipoCurso]?.tipoMotoFijo || tipoCurso,
    cursos: cursos.filter((curso) => curso.tipoCurso === tipoCurso)
  }));
}

function etapasCubiertasPorCursos(cursos) {
  const claves = cursos.map((curso) => etapaDeCurso(curso));
  return ETAPAS_RUTA.map((etapa) => etapa.clave).filter((clave) => claves.includes(clave));
}

function normalizarPack(pack, cursosPorId) {
  const idsOriginales = Array.isArray(pack.cursoIds) ? pack.cursoIds : [];
  const ids = [];
  const vistos = new Set();

  // Guard: un pack con IDs repetidos no debe duplicar sesiones ni precio.
  // Se conserva el primer ID y su posición original.
  for (const id of idsOriginales) {
    if (id == null) continue;
    const clave = String(id).trim();
    if (!clave || vistos.has(clave)) continue;
    vistos.add(clave);
    ids.push(id);
  }

  const cursos = ids
    .map((id) => cursosPorId.get(String(id).trim()))
    .filter(Boolean);

  const ordenes = cursos.map(ordenDeCurso);
  const ordenMinimo = ordenes.length > 0 ? Math.min(...ordenes) : ORDEN_FALLBACK;
  const etapasCubiertas = etapasCubiertasPorCursos(cursos);

  return {
    ...pack,
    cursoIds: ids,
    cursos,
    ordenMinimo,
    etapasCubiertas,
    cubreRutaCompleta: ETAPAS_RUTA.every((etapa) => etapasCubiertas.includes(etapa.clave)),
    totalSesiones: cursos.length
  };
}

function compararPacks(a, b) {
  const diferenciaOrden = a.ordenMinimo - b.ordenMinimo;
  if (diferenciaOrden !== 0) return diferenciaOrden;

  const diferenciaCantidad = (a.cursoIds?.length || 0) - (b.cursoIds?.length || 0);
  if (diferenciaCantidad !== 0) return diferenciaCantidad;

  return textoComparable(a?.nombre).localeCompare(textoComparable(b?.nombre), 'es', {
    sensitivity: 'base'
  });
}

/**
 * Construye la ruta visible a partir del catálogo real.
 *
 * @param {object[]} cursos Cursos públicos activos.
 * @param {object[]} packs Packs públicos activos.
 * @returns {{
 *   etapas: object[],
 *   packs: object[],
 *   totalCursos: number,
 *   catalogoVacio: boolean
 * }}
 */
export function construirRutaAprendizaje(cursos = [], packs = []) {
  const cursosNormalizados = normalizarCursos(cursos);
  const cursosPorId = new Map(
    cursosNormalizados
      .filter((curso) => curso.id != null)
      .map((curso) => [String(curso.id), curso])
  );

  const cursosEquilibrio = cursosNormalizados
    .filter((curso) => curso.tipoCurso === 'equilibrio')
    .sort(compararCursos);

  const cursosBasicos = cursosNormalizados
    .filter((curso) => CLAVES_BASICAS.includes(curso.tipoCurso))
    .sort(compararCursos);

  const cursosPractica = cursosNormalizados
    .filter((curso) => etapaDeCurso(curso) === 'practica')
    .sort(compararCursos);

  const cursosExtra = cursosNormalizados
    .filter((curso) => etapaDeCurso(curso) === 'extra')
    .sort(compararCursos);

  const etapas = [
    {
      ...ETAPAS_POR_CLAVE.equilibrio,
      cursos: cursosEquilibrio,
      carriles: []
    },
    {
      ...ETAPAS_POR_CLAVE.basicas,
      cursos: cursosBasicos,
      carriles: construirCarriles(cursosBasicos)
    },
    {
      ...ETAPAS_POR_CLAVE.practica,
      cursos: cursosPractica,
      carriles: []
    }
  ];

  const packsNormalizados = (Array.isArray(packs) ? packs : [])
    .filter((pack) => pack && typeof pack === 'object')
    .map((pack) => normalizarPack(pack, cursosPorId))
    .sort(compararPacks);

  return {
    etapas,
    cursosExtra,
    packs: packsNormalizados,
    totalCursos: cursosNormalizados.length,
    catalogoVacio: cursosNormalizados.length === 0
  };
}
