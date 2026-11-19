// @build: 2026-11-19 | id: BUG2-CROSSCHECK-OCUPACION | desc: Lecturas acotadas del espejo de ocupacion y de locks temporales
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';

const LIMITE_DOCS = 200;
const MAX_FECHAS = 10;

function normalizarFechas(fechas = []) {
  return [...new Set((fechas || []).filter(Boolean))].slice(0, MAX_FECHAS);
}

async function consultarPorCampo(nombreColeccion, campo, fechas, limite) {
  const resultados = new Map();
  let truncado = false;

  const q = query(
    collection(db, nombreColeccion),
    where(campo, 'in', fechas),
    limit(limite + 1)
  );
  const snap = await getDocs(q);

  // limite + 1 permite detectar truncamiento sin traer toda la coleccion.
  if (snap.docs.length > limite) truncado = true;
  snap.docs.slice(0, limite).forEach(d => {
    resultados.set(d.id, { id: d.id, ...d.data() });
  });

  return { resultados, truncado };
}

// Espejo ocupacionConfirmada: cubre reservas cuyo D1 o D2 cae en las fechas objetivo.
export async function consultarOcupacionPorFechas(fechas, { limite = LIMITE_DOCS } = {}) {
  const fechasUnicas = normalizarFechas(fechas);
  if (fechasUnicas.length === 0) return { reservas: [], truncado: false };

  const [porFecha, porFecha2] = await Promise.all([
    consultarPorCampo('ocupacionConfirmada', 'fecha', fechasUnicas, limite),
    consultarPorCampo('ocupacionConfirmada', 'fecha2', fechasUnicas, limite)
  ]);

  const combinado = new Map([...porFecha.resultados, ...porFecha2.resultados]);
  return {
    reservas: Array.from(combinado.values()),
    truncado: porFecha.truncado || porFecha2.truncado
  };
}

// Coleccion viva de locks (lectura permitida a cualquier usuario autenticado por reglas).
export async function consultarLocksTemporalesPorFechas(fechas, { limite = LIMITE_DOCS } = {}) {
  const fechasUnicas = normalizarFechas(fechas);
  if (fechasUnicas.length === 0) return { locks: [], truncado: false };

  const { resultados, truncado } = await consultarPorCampo('ocupacionTemporal', 'fecha', fechasUnicas, limite);
  return { locks: Array.from(resultados.values()), truncado };
}
