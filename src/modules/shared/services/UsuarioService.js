// @build: 2026-10-09 | id: USUARIO-SERVICE | desc: SSOT del perfil del usuario (colección usuarios/{uid})
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

const APP_ID = 'motoescuela-pro-v1';
const buildRef = (uid) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'usuarios', uid);

const ESTADOS_METRICAS = ['pendientes', 'activos', 'en_progreso', 'pausados', 'completados', 'cancelados', 'rechazados', 'vencidos'];
const crearContadoresVacios = () => ESTADOS_METRICAS.reduce((acc, e) => ({ ...acc, [e]: 0 }), {});
const crearMetricasVacias = () => ({
  totales: crearContadoresVacios(),
  porServicio: {}
});

export const UsuarioService = {
  // Guarda/actualiza el perfil del usuario (idempotente con merge:true).
  // Se llama al completar el Paso 1 en cualquier flujo de registro.
  async guardarPerfil(uid, correo, form) {
    if (!uid || !correo) return { success: false, error: 'Faltan parámetros' };
    try {
      const ref = buildRef(uid);
      const snap = await getDoc(ref);
      const fechaNacimiento = (form.diaNac && form.mesNac && form.anoNac)
        ? `${form.anoNac}-${String(form.mesNac).padStart(2, '0')}-${String(form.diaNac).padStart(2, '0')}`
        : null;

      const payload = {
        uid: String(uid),
        correo: String(correo).toLowerCase(),
        cedula: String(form.cedula || ''),
        nombre: form.nombre || '',
        apellido: form.apellido || '',
        telefono: form.telefono || '',
        contactoEmergencia: form.contactoEmergencia || '',
        fechaNacimiento,
        sexo: form.sexo || '',
        estado: form.estado || '',
        zona: form.zona || '',
        condicionMedica: form.condicionMedica || '',
        detalleCondicion: form.detalleCondicion || '',
        updatedAt: Timestamp.now()
      };

      if (!snap.exists()) {
        // Crear: agregar campos de creación
        payload.createdAt = Timestamp.now();
        payload.capacidades = {
          sesionesPracticas: false,
          modulosTeoricos: false,
          recursosGratuitos: true,
          mecanica: false,
          motolavado: false,
          productos: false
        };
        payload.contadores = {
          reservasActivas: 0,
          reservasCompletadas: 0,
          accesosTeoricosActivos: 0
        };
        payload.metricas = crearMetricasVacias();
      }

      await setDoc(ref, payload, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('[UsuarioService] Error guardando perfil:', error);
      return { success: false, error: error.message };
    }
  },

  // Lee el perfil del usuario (o null si no existe).
  async obtenerPerfil(uid) {
    if (!uid) return { success: false, error: 'Falta uid' };
    try {
      const snap = await getDoc(buildRef(uid));
      return { success: true, data: snap.exists() ? { id: snap.id, ...snap.data() } : null };
    } catch (error) {
      console.error('[UsuarioService] Error obteniendo perfil:', error);
      return { success: false, error: error.message };
    }
  }
};

export default UsuarioService;
