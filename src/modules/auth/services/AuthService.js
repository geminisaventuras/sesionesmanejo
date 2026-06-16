// @build: 2026-06-17.16-00-00 | id: B55-CLEAN | desc: Eliminadas funciones de autenticación anónima (código muerto)
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../../shared/firebase/firebase';

export const AuthService = {
  async loginEstudiante(cedula, pin) {
    if (!cedula || !/^\d{6,10}$/.test(cedula))
      return { success: false, error: { code: 'invalid-cedula', message: 'Cédula inválida' } };
    if (!pin || !/^\d{6}$/.test(pin))
      return { success: false, error: { code: 'invalid-pin', message: 'PIN inválido (6 dígitos)' } };
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, `${cedula}@motoescuela.local`, pin);
      return { success: true, data: { user: userCredential.user } };
    } catch (error) {
      if (error.code === 'auth/user-not-found')
        return { success: false, error: { code: 'not-found', message: 'Estudiante no inscrito' } };
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async crearEstudiante(cedula) {
    if (!cedula || !/^\d{6,10}$/.test(cedula))
      return { success: false, error: { code: 'invalid-cedula', message: 'Cédula inválida' } };
    
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const pin = String(array[0] % 900000 + 100000).padStart(6, '0');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, `${cedula}@motoescuela.local`, pin);
      return { success: true, data: { user: userCredential.user, pin } };
    } catch (error) {
      if (error.code === 'auth/email-already-in-use')
        return { success: false, error: { code: 'already-enrolled', message: 'El estudiante ya está inscrito' } };
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
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async loginConGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return { success: true, data: { user: result.user } };
    } catch (error) {
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

  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
};
