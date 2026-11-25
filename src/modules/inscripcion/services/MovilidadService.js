// @build: 2026-11-24 | id: MOVILIDAD-SERVICE-1 | desc: Solicitudes de movilidad y roster de prestadores (FT-058). Pago directo; la app no recibe dinero.

import { auth, db } from '../../../firebase';
import { emitirEvento } from '../../shared/services/NotificacionesEventos';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { puedeTransicionarMovilidad } from '../utils/movilidadHelpers.js';

const APP_ID = 'motoescuela-pro-v1';
const BASE = ['artifacts', APP_ID, 'public', 'data'];

const ordenarPorFecha = (a, b) => String(a.fechaSesion || '').localeCompare(String(b.fechaSesion || ''));

async function listarColeccion(nombre, filtros = [], tope = 100) {
  const restricciones = filtros.map(([campo, valor]) => where(campo, '==', valor));
  const q = restricciones.length > 0
    ? query(collection(db, ...BASE, nombre), ...restricciones, limit(tope))
    : query(collection(db, ...BASE, nombre), limit(tope));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function idSolicitud(reservaId, fechaSesion) {
  return `${reservaId}_${fechaSesion}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export const MovilidadService = {
  /**
   * Crea la solicitud ligada a una reserva. Es idempotente por reserva+fecha:
   * reintentar sobrescribe el mismo documento.
   */
  async crearSolicitud({
    userId,
    reservaId,
    childId = null,
    fechaSesion,
    sedeId,
    pin,
    direccion = '',
    distanciaKm,
    snapshot,
    autorizacion,
    nombreEstudiante = '',
    telefonoEstudiante = '',
    notas = '',
  }) {
    if (!userId) return { success: false, error: { code: 'auth-requerida', message: 'Inicia sesión para solicitar movilidad.' } };
    if (!reservaId || !fechaSesion || !sedeId) {
      return { success: false, error: { code: 'datos-incompletos', message: 'Faltan datos de la reserva.' } };
    }
    if (!snapshot?.montoUSD || !(snapshot.montoUSD > 0)) {
      return { success: false, error: { code: 'tarifa-invalida', message: 'No hay una tarifa de movilidad válida.' } };
    }

    const id = idSolicitud(reservaId, fechaSesion);
    try {
      await setDoc(doc(db, ...BASE, 'solicitudesMovilidad', id), {
        userId,
        reservaId,
        childId,
        fechaSesion,
        sedeId,
        pin,
        direccion,
        distanciaKm,
        tarifaSnapshot: snapshot,
        montoUSD: snapshot.montoUSD,
        montoVES: snapshot.montoVES,
        tasaFX: snapshot.tasaFX,
        estado: 'solicitada',
        prestadorId: null,
        autorizacion,
        nombreEstudiante,
        telefonoEstudiante,
        notas,
        codigoRecogida: String(Math.floor(1000 + Math.random() * 9000)),
        pagoDirecto: { confirmado: false, metodo: null, confirmadoEn: null },
        cambios: [],
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      });
      const actorUid = auth.currentUser?.uid || userId;
      if (actorUid) {
        void emitirEvento({
          tipo: 'movilidad_solicitud',
          entidadTipo: 'movilidad',
          entidadId: id,
          actorUid,
          token: 'nueva',
          datos: { movilidadId: id, reservaId },
        });
      }
      return { success: true, data: { id } };
    } catch (error) {
      // Sin PII: solo código y mensaje técnico para diagnosticar reglas/red.
      console.error('[MovilidadService] crearSolicitud:', error.code || 'error', error.message || '');
      return { success: false, error: { code: error.code || 'error', message: 'No pudimos registrar la solicitud de movilidad.' } };
    }
  },

  async obtenerSolicitud(id) {
    const snap = await getDoc(doc(db, ...BASE, 'solicitudesMovilidad', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async listarPorUsuario(userId) {
    const data = await listarColeccion('solicitudesMovilidad', [['userId', userId]]);
    return data.sort(ordenarPorFecha);
  },

  async listarPorPrestador(prestadorId) {
    const data = await listarColeccion('solicitudesMovilidad', [['prestadorId', prestadorId]]);
    return data.sort(ordenarPorFecha);
  },

  async listarTodas() {
    const data = await listarColeccion('solicitudesMovilidad');
    return data.sort(ordenarPorFecha);
  },

  async asignarPrestador(id, prestadorId) {
    if (!id || !prestadorId) return { success: false, error: { code: 'datos-incompletos' } };
    try {
      await updateDoc(doc(db, ...BASE, 'solicitudesMovilidad', id), {
        prestadorId,
        estado: 'asignada',
        actualizadoEn: serverTimestamp(),
      });
      const actorUid = auth.currentUser?.uid || null;
      if (actorUid) {
        void emitirEvento({
          tipo: 'movilidad_asignada',
          entidadTipo: 'movilidad',
          entidadId: id,
          actorUid,
          token: prestadorId,
          datos: { movilidadId: id },
        });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code || 'error' } };
    }
  },

  async actualizarEstado(id, estado, extra = {}) {
    const actual = await this.obtenerSolicitud(id);
    if (!actual) return { success: false, error: { code: 'no-encontrada' } };
    if (!puedeTransicionarMovilidad(actual.estado, estado)) {
      return { success: false, error: { code: 'transicion-invalida' } };
    }
    try {
      await updateDoc(doc(db, ...BASE, 'solicitudesMovilidad', id), {
        ...extra,
        estado,
        actualizadoEn: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code || 'error' } };
    }
  },

  async confirmarPagoDirecto(id, metodo = 'efectivo') {
    try {
      await updateDoc(doc(db, ...BASE, 'solicitudesMovilidad', id), {
        pagoDirecto: { confirmado: true, metodo, confirmadoEn: new Date().toISOString() },
        actualizadoEn: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code || 'error' } };
    }
  },

  async cancelar(id, motivo = '', quien = 'estudiante') {
    return this.actualizarEstado(id, 'cancelada', { motivoCancelacion: motivo, canceladaPor: quien });
  },

  async listarPrestadores() {
    const data = await listarColeccion('prestadoresMovilidad');
    return data.sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
  },

  /**
   * Busca prestadores potenciales solo entre el staff existente:
   * instructores y proveedores. No consulta `usuarios` (estudiantes): evita
   * cientos de lecturas innecesarias y que un estudiante reciba la capacidad
   * de movilidad por error. Firestore no busca por subcadena; se filtra en
   * cliente. Solo admin llega a este panel.
   */
  async buscarPrestadoresPotenciales(termino) {
    const t = String(termino || '').trim().toLowerCase();
    if (t.length < 2) return [];
    const [instructores, proveedores] = await Promise.all([
      listarColeccion('instructores', [], 200),
      listarColeccion('proveedores', [], 200),
    ]);
    const mapa = new Map();
    const agregar = (lista, tipo) => {
      for (const u of lista) {
        if (u.activo === false) continue;
        if (!mapa.has(u.id)) mapa.set(u.id, { ...u, tipo });
      }
    };
    agregar(instructores, 'Instructor');
    agregar(proveedores, 'Proveedor');
    return [...mapa.values()]
      .filter((u) => {
        const nombre = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
        const cedula = String(u.cedula || '').toLowerCase();
        const correo = String(u.correo || u.email || '').toLowerCase();
        return nombre.includes(t) || cedula.includes(t) || correo.includes(t);
      })
      .slice(0, 8);
  },

  async guardarPrestador({ uid, nombre, telefono, licenciaNumero, licenciaVence, zonas = [], activo = true }) {
    if (!uid) return { success: false, error: { code: 'uid-requerido' } };
    try {
      await setDoc(doc(db, ...BASE, 'prestadoresMovilidad', uid), {
        nombre: String(nombre || '').trim(),
        telefono: String(telefono || '').trim(),
        licenciaNumero: String(licenciaNumero || '').trim(),
        licenciaVence: String(licenciaVence || '').trim(),
        zonas,
        activo: activo === true,
        actualizadoEn: serverTimestamp(),
      }, { merge: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code || 'error' } };
    }
  },
};
