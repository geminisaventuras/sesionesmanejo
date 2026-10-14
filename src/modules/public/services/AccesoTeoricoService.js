// @build: 2026-10-09 | id: ACCESO-TEORICO-SERVICE | desc: Servicio de compra y aprobación de accesos a módulos formativos
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const APP_ID = 'motoescuela-pro-v1';
const COLL = `artifacts/${APP_ID}/public/data/accesosTeoricos`;

// NOTA: el campo `precio` es el precio congelado al momento de la compra (FIX-036).
// La regla Firestore exige `precio > 0` para create. No renombrar a precioCongelado.

export const AccesoTeoricoService = {
  // Busca el acceso activo (Aprobado > Pendiente > otro) de un usuario a un curso.
  async obtenerAcceso(userId, cursoTeoricoId) {
    if (!userId || !cursoTeoricoId) return { success: false, error: 'Faltan parámetros' };
    try {
      const ref = collection(db, COLL);
      const q = query(
        ref,
        where('userId', '==', String(userId)),
        where('cursoTeoricoId', '==', String(cursoTeoricoId))
      );
      const snap = await getDocs(q);
      if (snap.empty) return { success: true, data: null };
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const aprobado = docs.find(d => d.estadoPago === 'Aprobado');
      const pendiente = docs.find(d => d.estadoPago === 'Pendiente');
      return { success: true, data: aprobado || pendiente || docs[0] };
    } catch (error) {
      console.error('[AccesoTeoricoService] Error obteniendo:', error);
      return { success: false, error: error.message };
    }
  },

  // Devuelve todos los accesos aprobados de un usuario.
  async obtenerAccesosAprobados(userId) {
    if (!userId) return { success: false, error: 'Falta userId' };
    try {
      const ref = collection(db, COLL);
      const q = query(ref, where('userId', '==', String(userId)), where('estadoPago', '==', 'Aprobado'));
      const snap = await getDocs(q);
      return { success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
    } catch (error) {
      console.error('[AccesoTeoricoService] Error obteniendo aprobados:', error);
      return { success: false, error: error.message };
    }
  },

  // Crea un acceso standalone en estado Pendiente.
  async crearAcceso({
    userId, cursoTeoricoId, precio, moneda,
    metodoPagoId, pagoBanco, pagoTelefono, pagoCedula, pagoRef,
    esAccesoVitalicio
  }) {
    if (!userId || !cursoTeoricoId) return { success: false, error: 'Faltan parámetros' };
    if (!precio || Number(precio) <= 0) return { success: false, error: 'Precio inválido' };

    try {
      // Pre-check doble compra
      const existente = await this.obtenerAcceso(userId, cursoTeoricoId);
      if (existente.success && existente.data) {
        if (existente.data.estadoPago === 'Aprobado') {
          return { success: false, error: 'Ya tienes acceso a este módulo formativo.' };
        }
        if (existente.data.estadoPago === 'Pendiente') {
          return { success: false, error: 'Ya tienes una compra pendiente de aprobación.' };
        }
        // FIX-T2.3: si fue rechazado, el usuario debe CORREGIR, no recomprar
        if (existente.data.estadoPago === 'Rechazado') {
          return { success: false, error: 'Tu pago anterior fue rechazado. Corrige la referencia para continuar.' };
        }
      }

      const newRef = doc(collection(db, COLL));
      const payload = {
        id: newRef.id,
        userId: String(userId),
        cursoTeoricoId: String(cursoTeoricoId),
        estadoPago: 'Pendiente',
        precio: Number(precio),
        moneda: moneda || 'USD',
        origen: 'standalone',
        packReservaId: null,
        metodoPagoId: metodoPagoId || null,
        pagoBanco: pagoBanco || null,
        pagoTelefono: pagoTelefono || null,
        pagoCedula: pagoCedula || null,
        pagoRef: pagoRef || null,
        comisionInstructor: 0,
        comisionProveedor: 0,
        esAccesoVitalicio: esAccesoVitalicio !== false,
        fechaCompra: Timestamp.now(),
        aprobadoEn: null,
        rechazadoEn: null,
        motivoRechazo: null,
        // FIX-T2.3: inicialización explícita (MAMBA: no confiar en fallback para campos que participan en validaciones)
        intentosCorreccion: 0,
        historialRechazos: [],
        vencimiento: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(newRef, payload);
      return { success: true, data: payload };
    } catch (error) {
      console.error('[AccesoTeoricoService] Error creando:', error);
      return { success: false, error: error.message };
    }
  },

  // Aprueba un acceso. Batch atómico: acceso + capacidad en usuarios/{uid} + notificación.
  async aprobarAcceso(accesoId, userId, cursoTeoricoId, esVitalicio = true, duracionDias = 30) {
    if (!accesoId || !userId) return { success: false, error: 'Faltan parámetros' };
    try {
      const batch = writeBatch(db);
      const accesoRef = doc(db, COLL, accesoId);
      const userRef = doc(db, `artifacts/${APP_ID}/public/data/usuarios`, userId);

      const aprobadoEn = Timestamp.now();
      let vencimiento = null;
      if (!esVitalicio) {
        vencimiento = Timestamp.fromMillis(Date.now() + duracionDias * 24 * 60 * 60 * 1000);
      }

      batch.update(accesoRef, {
        estadoPago: 'Aprobado',
        aprobadoEn,
        vencimiento,
        updatedAt: aprobadoEn
      });

      // Capacidades (si el doc usuarios existe)
      try {
        const uSnap = await getDoc(userRef);
        if (uSnap.exists()) {
          batch.update(userRef, {
            'capacidades.modulosTeoricos': true,
            updatedAt: aprobadoEn
          });
        }
      } catch (_) { /* si falla la lectura, seguimos */ }

      // Notificación al estudiante
      const notifRef = doc(collection(db, `artifacts/${APP_ID}/public/data/notificaciones`));
      batch.set(notifRef, {
        userId: String(userId),
        tipo: 'acceso_teorico_aprobado',
        mensaje: 'Tu compra de módulo formativo fue aprobada. ¡Ya puedes acceder!',
        cursoTeoricoId,
        leida: false,
        createdAt: aprobadoEn,
        emisorId: 'sistema'
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('[AccesoTeoricoService] Error aprobando:', error);
      return { success: false, error: error.message };
    }
  },

  // FIX-T2.1: 'Rechazado' (antes 'Pendiente') + intentosCorreccion + historialRechazos[].
  // Read-then-write obligatorio: writeBatch no permite leer, y necesitamos
  // el historial actual + intentos actuales antes de escribir.
  // 'cancelar' NO incrementa intentos (es cancelación, no rechazo para corrección).
  async rechazarAcceso(accesoId, userId, cursoTeoricoId, tipo = 'rechazar', motivo = '') {
    if (!accesoId) return { success: false, error: 'Falta accesoId' };
    try {
      const accesoRef = doc(db, COLL, accesoId);

      // FIX-T2.1: leer primero (read-then-write)
      const snap = await getDoc(accesoRef);
      if (!snap.exists()) return { success: false, error: 'Acceso no encontrado' };
      const data = snap.data();

      const batch = writeBatch(db);
      const ahora = Timestamp.now();
      const historialActual = Array.isArray(data.historialRechazos) ? data.historialRechazos : [];

      if (tipo === 'cancelar') {
        const historialNuevo = [...historialActual, {
          tipo: 'cancelacion',
          motivo: motivo || 'Cancelado por el administrador',
          rechazadoEn: ahora.toMillis(),
          rechazadoPor: 'admin'
        }];
        batch.update(accesoRef, {
          estadoPago: 'Cancelado',
          rechazadoEn: ahora,
          motivoRechazo: motivo || 'Cancelado por el administrador',
          historialRechazos: historialNuevo,
          updatedAt: ahora
        });
      } else {
        const intentosActuales = Number(data.intentosCorreccion) || 0;
        const motivoFinal = motivo || 'La referencia del pago no coincide';
        const historialNuevo = [...historialActual, {
          tipo: 'rechazo',
          motivo: motivoFinal,
          rechazadoEn: ahora.toMillis(),
          rechazadoPor: 'admin'
        }];
        batch.update(accesoRef, {
          estadoPago: 'Rechazado',
          rechazadoEn: ahora,
          motivoRechazo: motivoFinal,
          intentosCorreccion: intentosActuales + 1,
          historialRechazos: historialNuevo,
          updatedAt: ahora
        });
      }

      // FIX-T2.8: invalidar cache de metricas del estudiante (trigger SSOT).
      // Sin esto, la card del panel del usuario muestra estado viejo hasta 60s.
      const userRef = doc(db, `artifacts/${APP_ID}/public/data/usuarios`, userId);
      batch.update(userRef, { updatedAt: ahora });

      // Notificación
      const notifRef = doc(collection(db, `artifacts/${APP_ID}/public/data/notificaciones`));
      batch.set(notifRef, {
        userId: String(userId || ''),
        tipo: tipo === 'cancelar' ? 'acceso_teorico_cancelado' : 'acceso_teorico_rechazado',
        mensaje: tipo === 'cancelar'
          ? `Tu compra del módulo fue cancelada. Motivo: ${motivo || 'no especificado'}`
          : `Tu compra del módulo fue rechazada. Motivo: ${motivo || 'no especificado'}`,
        cursoTeoricoId,
        leida: false,
        createdAt: ahora,
        emisorId: 'sistema'
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('[AccesoTeoricoService] Error rechazando:', error);
      return { success: false, error: error.message };
    }
  },

  // FIX-T2.2: Corrección de referencia por el estudiante. Transición Rechazado → Pendiente.
  // El estudiante solo escribe pagoRef + estadoPago + updatedAt (permitidos en regla).
  // NO escribe motivoRechazo, rechazadoEn, historialRechazos ni intentosCorreccion.
  // El incremento de intentos lo hace el ADMIN al rechazar (no el estudiante al corregir).
  async corregirReferenciaPago(accesoId, nuevaRef) {
    if (!accesoId || !nuevaRef || nuevaRef.length !== 4) {
      return { success: false, error: 'Argumentos inválidos' };
    }
    try {
      const accesoRef = doc(db, COLL, accesoId);
      const snap = await getDoc(accesoRef);
      if (!snap.exists()) return { success: false, error: 'Acceso no encontrado' };
      const data = snap.data();

      // Validación de transición (misma que exige la regla Firestore)
      if (data.estadoPago !== 'Rechazado') {
        return { success: false, error: 'El acceso no está en estado Rechazado' };
      }

      // Freno táctico: bloquear si ya agotó los intentos
      const intentos = Number(data.intentosCorreccion) || 0;
      if (intentos >= 3) {
        return { success: false, error: 'Has alcanzado el límite de intentos. Contacta al administrador.' };
      }

      const batch = writeBatch(db);
      const ahora = Timestamp.now();
      batch.update(accesoRef, {
        pagoRef: nuevaRef,
        estadoPago: 'Pendiente',
        updatedAt: ahora
      });

      // FIX-T2.8-bis: invalidar cache de metricas del estudiante (trigger SSOT).
      // Mismo patrón que rechazarAcceso. El usuario corrige → la card se actualiza sin F5.
      if (data.userId) {
        const userRef = doc(db, `artifacts/${APP_ID}/public/data/usuarios`, data.userId);
        batch.update(userRef, { updatedAt: ahora });
      }

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('[AccesoTeoricoService] Error corrigiendo:', error);
      return { success: false, error: error.message };
    }
  }
};

export default AccesoTeoricoService;
