// Servicio del CRM de interesados (FT-078).
// Coleccion separada del expediente del estudiante; solo admin lee y gestiona.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { estadoValido, normalizarInteresado } from '../utils/crmHelpers';
import { eliminarConversacionesDeInteresado } from './ConversacionesIAService';

export const RUTA_DATOS = 'artifacts/motoescuela-pro-v1/public/data';
export const COLECCION_INTERESADOS = 'interesadosCRM';

export async function crearInteresado(entrada = {}) {
  const { ok, datos, errores } = normalizarInteresado(entrada);
  if (!ok) return { ok: false, errores };

  try {
    const ref = await addDoc(collection(db, RUTA_DATOS, COLECCION_INTERESADOS), {
      ...datos,
      fecha: serverTimestamp(),
      consentimientoEn: serverTimestamp(),
      expiraEn: Timestamp.fromDate(datos.expiraEn),
    });
    return { ok: true, id: ref.id };
  } catch {
    return { ok: false, errores: ['guardado'] };
  }
}

export async function listarInteresados() {
  const snap = await getDocs(
    query(
      collection(db, RUTA_DATOS, COLECCION_INTERESADOS),
      orderBy('fecha', 'desc'),
      limit(100),
    ),
  );
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function actualizarInteresado(id, { estado, notas } = {}) {
  if (!id) return { ok: false, motivo: 'sin-id' };
  if (estado && !estadoValido(estado)) return { ok: false, motivo: 'estado-invalido' };
  const cambios = { actualizadoEn: serverTimestamp() };
  if (estado) cambios.estado = estado;
  if (typeof notas === 'string') cambios.notas = notas.trim().slice(0, 500);
  try {
    await updateDoc(doc(db, RUTA_DATOS, COLECCION_INTERESADOS, id), cambios);
    return { ok: true };
  } catch {
    return { ok: false, motivo: 'guardado' };
  }
}

export async function eliminarInteresado(id) {
  if (!id) return { ok: false, motivo: 'sin-id' };
  try {
    // Derecho de supresion: se borra tambien la metadata de conversacion asociada.
    await eliminarConversacionesDeInteresado(id);
    await deleteDoc(doc(db, RUTA_DATOS, COLECCION_INTERESADOS, id));
    return { ok: true };
  } catch {
    return { ok: false, motivo: 'eliminacion' };
  }
}
