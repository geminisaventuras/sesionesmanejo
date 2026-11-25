// Servicio de metadata de conversaciones IA (T-148).
// Solo guarda actividad (inicio, turnos, pagina, derivacion), sin transcripcion.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { normalizarConversacion, normalizarMensaje } from '../utils/conversacionesHelpers';

export const RUTA_DATOS = 'artifacts/motoescuela-pro-v1/public/data';
export const COLECCION_CONVERSACIONES = 'conversacionesIA';
export const SUBCOLECCION_MENSAJES = 'mensajes';

export async function crearConversacion(entrada = {}) {
  const { ok, datos, errores } = normalizarConversacion(entrada);
  if (!ok) return { ok: false, errores };

  try {
    const ref = await addDoc(collection(db, RUTA_DATOS, COLECCION_CONVERSACIONES), {
      ...datos,
      inicioEn: serverTimestamp(),
      ultimoMensajeEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
      expiraEn: Timestamp.fromDate(datos.expiraEn),
    });
    return { ok: true, id: ref.id };
  } catch {
    return { ok: false, errores: ['guardado'] };
  }
}

export async function registrarTurno(id, { pagina, derivacionWhatsapp = false } = {}) {
  if (!id) return { ok: false, motivo: 'sin-id' };
  const cambios = {
    turnos: increment(1),
    ultimoMensajeRol: 'asistente',
    ultimoMensajeEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  };
  const rutaPagina = String(pagina ?? '').trim().slice(0, 120);
  if (rutaPagina) cambios.pagina = rutaPagina;
  if (derivacionWhatsapp) cambios.derivacionWhatsapp = true;
  try {
    await updateDoc(doc(db, RUTA_DATOS, COLECCION_CONVERSACIONES, id), cambios);
    return { ok: true };
  } catch {
    return { ok: false, motivo: 'guardado' };
  }
}

export async function listarConversaciones() {
  const snap = await getDocs(
    query(
      collection(db, RUTA_DATOS, COLECCION_CONVERSACIONES),
      orderBy('ultimoMensajeEn', 'desc'),
      limit(100),
    ),
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

// Transcripcion para auditoria (solo admin la lee). No se usa en el chat publico.
export async function guardarMensaje(conversacionId, entrada = {}) {
  if (!conversacionId) return { ok: false, motivo: 'sin-id' };
  const { ok, datos, errores } = normalizarMensaje(entrada);
  if (!ok) return { ok: false, errores };

  try {
    await addDoc(
      collection(db, RUTA_DATOS, COLECCION_CONVERSACIONES, conversacionId, SUBCOLECCION_MENSAJES),
      { ...datos, creadoEn: serverTimestamp() },
    );
    return { ok: true };
  } catch {
    return { ok: false, motivo: 'guardado' };
  }
}

export async function listarMensajes(conversacionId) {
  if (!conversacionId) return [];
  const snap = await getDocs(
    query(
      collection(db, RUTA_DATOS, COLECCION_CONVERSACIONES, conversacionId, SUBCOLECCION_MENSAJES),
      orderBy('creadoEn', 'asc'),
      limit(200),
    ),
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function eliminarMensajesDeConversacion(conversacionId) {
  if (!conversacionId) return { ok: false, motivo: 'sin-id' };
  try {
    const snap = await getDocs(
      collection(db, RUTA_DATOS, COLECCION_CONVERSACIONES, conversacionId, SUBCOLECCION_MENSAJES),
    );
    await Promise.all(snap.docs.map((item) => deleteDoc(item.ref)));
    return { ok: true, eliminados: snap.size };
  } catch {
    return { ok: false, motivo: 'eliminacion' };
  }
}

export async function eliminarConversacion(id) {
  if (!id) return { ok: false, motivo: 'sin-id' };
  try {
    await eliminarMensajesDeConversacion(id);
    await deleteDoc(doc(db, RUTA_DATOS, COLECCION_CONVERSACIONES, id));
    return { ok: true };
  } catch {
    return { ok: false, motivo: 'eliminacion' };
  }
}

export async function eliminarConversacionesDeInteresado(interesadoId) {
  if (!interesadoId) return { ok: false, motivo: 'sin-id' };
  try {
    const snap = await getDocs(
      query(
        collection(db, RUTA_DATOS, COLECCION_CONVERSACIONES),
        where('interesadoId', '==', interesadoId),
      ),
    );
    await Promise.all(snap.docs.map(async (item) => {
      await eliminarMensajesDeConversacion(item.id);
      await deleteDoc(item.ref);
    }));
    return { ok: true, eliminadas: snap.size };
  } catch {
    return { ok: false, motivo: 'eliminacion' };
  }
}
