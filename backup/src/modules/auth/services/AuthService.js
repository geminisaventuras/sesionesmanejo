// @build: 2026-06-22 | id: AUTHSERVICE-UPDATE-PASSWORD | desc: AuthService con updatePassword y validación isomórfica completa.
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  updatePassword
} from 'firebase/auth';
import { auth } from '../../shared/firebase/firebase';

export const AuthService = {
  async loginEstudiante(correo, pin) {
    if (!correo || !/^\d{6}$/.test(pin))
      return { success: false, error: { code: 'invalid-data', message: 'Correo o PIN inválido' } };
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, correo, pin);
      return { success: true, data: { user: userCredential.user } };
    } catch (error) {
      if (error.code === 'auth/user-not-found')
        return { success: false, error: { code: 'not-found', message: 'Estudiante no inscrito' } };
      if (error.code === 'auth/wrong-password')
        return { success: false, error: { code: 'wrong-pin', message: 'PIN incorrecto' } };
      if (error.code === 'auth/too-many-requests')
        return { success: false, error: { code: 'rate-limited', message: 'Demasiados intentos. Espera un momento.' } };
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async crearEstudiante(cedula, correo) {
    if (!cedula || !/^\d{6,10}$/.test(cedula))
      return { success: false, error: { code: 'invalid-cedula', message: 'Cédula inválida' } };
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
      return { success: false, error: { code: 'invalid-email', message: 'Correo inválido' } };
    
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const pin = String(array[0] % 900000 + 100000).padStart(6, '0');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, correo, pin);
      return { success: true, data: { user: userCredential.user, pin } };
    } catch (error) {
      if (error.code === 'auth/email-already-in-use')
        return { success: false, error: { code: 'already-enrolled', message: 'El estudiante ya está inscrito' } };
      if (error.code === 'auth/weak-password')
        return { success: false, error: { code: 'weak-pin', message: 'El PIN es demasiado débil' } };
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async loginConEmail(email, password) {
    if (!email || !password)
      return { success: false, error: { code: 'empty-fields', message: 'Completa todos los campos' } };
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, data: { user: userCredential.user } };
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password')
        return { success: false, error: { code: 'invalid-credentials', message: 'Correo o contraseña incorrectos' } };
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async loginConGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return { success: true, data: { user: result.user } };
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user')
        return { success: false, error: { code: 'popup-closed', message: 'Inicio de sesión cancelado' } };
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async updatePassword(user, newPassword) {
    if (!user) return { success: false, error: { code: 'no-user', message: 'Usuario no autenticado' } };
    if (!newPassword || !/^\d{6}$/.test(newPassword))
      return { success: false, error: { code: 'invalid-pin', message: 'El PIN debe tener 6 dígitos' } };
    try {
      await updatePassword(user, newPassword);
      return { success: true };
    } catch (error) {
      if (error.code === 'auth/requires-recent-login')
        return { success: false, error: { code: 'recent-login', message: 'Debes iniciar sesión nuevamente para cambiar tu PIN' } };
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
};