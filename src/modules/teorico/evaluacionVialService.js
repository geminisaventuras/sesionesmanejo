// Reto Vial (ruta /evaluacion): persistencia del último resultado y del historial de intentos.
// Anónimos no escriben en Firestore; la vista usa localStorage para ellos.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';

const APP_ID = 'motoescuela-pro-v1';
const COLECCION = 'evaluacionesViales';
const MODOS_VALIDOS = ['integral', 'ley_ve', 'tecnica_msf', 'reintento'];
const TIPOS_INTENTO = ['practica', 'diagnostico'];
const MAX_INTENTOS_HISTORIAL = 50;

// Etiquetas fijas por modo: el cliente no escribe texto libre (FT-053).
export const ETIQUETAS_MODO = {
  integral: 'Diagnóstico Integral',
  ley_ve: 'Legislación Vial Venezolana',
  tecnica_msf: 'Técnicas de Manejo (MSF)',
  reintento: 'Repaso de Preguntas Falladas',
};

export const etiquetaModo = (modo) => ETIQUETAS_MODO[modo] || 'Reto Vial';

const refEvaluacion = (uid) =>
  doc(db, 'artifacts', APP_ID, 'public', 'data', COLECCION, String(uid));

const refIntentos = (uid) =>
  collection(db, 'artifacts', APP_ID, 'public', 'data', COLECCION, String(uid), 'intentos');

const acotarEntero = (valor, min, max) => {
  const numero = Math.round(Number(valor) || 0);
  return Math.min(max, Math.max(min, numero));
};

export async function cargarEvaluacionVial(uid) {
  if (!uid) return null;
  const snap = await getDoc(refEvaluacion(uid));
  return snap.exists() ? snap.data() : null;
}

// Historial append-only: un documento por intento, del más reciente al más antiguo.
export async function cargarHistorialEvaluacionVial(uid, maximo = 10) {
  if (!uid) return [];
  const tope = Math.min(
    MAX_INTENTOS_HISTORIAL,
    Math.max(1, Math.round(Number(maximo) || 10))
  );
  const q = query(refIntentos(uid), orderBy('fecha', 'desc'), limit(tope));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function guardarEvaluacionVial(uid, datos = {}) {
  if (!uid) return null;

  const modo = MODOS_VALIDOS.includes(datos.modo) ? datos.modo : 'integral';
  const tipoIntento = TIPOS_INTENTO.includes(datos.tipoIntento)
    ? datos.tipoIntento
    : 'practica';
  const porcentaje = acotarEntero(datos.porcentaje, 0, 100);
  const total = acotarEntero(datos.total, 1, 40);
  const aciertos = acotarEntero(datos.aciertos, 0, total);
  const payload = {
    userId: String(uid),
    porcentaje,
    modo,
    rachaMaxima: acotarEntero(datos.rachaMaxima, 0, 100),
    tiempoSegundos: acotarEntero(datos.tiempoSegundos, 0, 86400),
  };

  return runTransaction(db, async (tx) => {
    const ref = refEvaluacion(uid);
    const snap = await tx.get(ref);
    const previos = snap.exists() ? Number(snap.data().intentos) || 0 : 0;
    const mejorPrevio = snap.exists() ? Number(snap.data().mejorDiagnostico) || 0 : 0;
    const intento = previos + 1;
    // Solo el intento de diagnóstico (examen integral) cuenta para el mejor puntaje.
    const mejorDiagnostico =
      tipoIntento === 'diagnostico' ? Math.max(mejorPrevio, porcentaje) : mejorPrevio;

    // Resumen (último resultado) + intento histórico en la misma transacción.
    tx.set(ref, {
      ...payload,
      tipoIntento,
      mejorDiagnostico,
      intentos: intento,
      actualizadoEn: serverTimestamp(),
    });
    tx.set(doc(refIntentos(uid), String(intento)), {
      ...payload,
      tipoIntento,
      intento,
      aciertos,
      total,
      fecha: serverTimestamp(),
    });
    return { ...payload, tipoIntento, intento, aciertos, total, mejorDiagnostico };
  });
}
