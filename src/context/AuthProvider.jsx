// @build: 2026-06-22 | id: AUTH-LOGOUT-ROBUSTO | desc: Cierre de sesión a prueba de fallos, limpia estado local siempre
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthService } from '../services/AuthService';

const APP_ID = 'motoescuela-pro-v1';

export function useAuthProvider(showToast) {
  const [fbUser, setFbUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [autoLoginData, setAutoLoginData] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const restoreUserRole = useCallback(async (currentUser) => {
    if (!currentUser || !currentUser.email) return;
    const email = currentUser.email.toLowerCase();
    const basePath = `artifacts/${APP_ID}/public/data`;

    try {
      const adminDocRef = doc(db, basePath, 'admins', 'admin1');
      const adminSnap = await getDoc(adminDocRef);
      if (adminSnap.exists()) {
        const adminData = adminSnap.data();
        if (adminData.email === email) {
          setUser({ role: 'admin', data: adminData, uid: currentUser.uid });
          return;
        }
      }

      const instQuery = query(collection(db, basePath, 'instructores'), where('email', '==', email));
      const instSnap = await getDocs(instQuery);
      if (!instSnap.empty) {
        const instData = instSnap.docs[0].data();
        if (!instData.activo) {
          setUser(null);
          showToast('Tu cuenta de instructor está inactiva', 'error');
          return;
        }
        setUser({ role: 'instructor', data: instData, uid: currentUser.uid });
        return;
      }

      const provQuery = query(collection(db, basePath, 'proveedores'), where('email', '==', email));
      const provSnap = await getDocs(provQuery);
      if (!provSnap.empty) {
        const provData = provSnap.docs[0].data();
        if (!provData.activo) {
          setUser(null);
          showToast('Tu cuenta de proveedor está inactiva', 'error');
          return;
        }
        setUser({ role: 'proveedor', data: provData, uid: currentUser.uid });
        return;
      }

      const cedulaEstudiante = currentUser.email?.split('@')[0] || '';
      setUser({ role: 'estudiante', data: { cedula: cedulaEstudiante }, uid: currentUser.uid });

    } catch (e) {
      // Error restaurando rol
    }
  }, [showToast]);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange((currentUser) => {
      if (loggingOut) return; // Ignorar cambios durante el logout manual
      setFbUser(currentUser);
      if (currentUser) {
        restoreUserRole(currentUser).finally(() => setAuthReady(true));
      } else {
        setUser(null);
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, [restoreUserRole, loggingOut]);

  const loginWithGoogle = useCallback(async () => {
    const res = await AuthService.loginConGoogle();
    if (!res.success) showToast(res.error.message, 'error');
    return res;
  }, [showToast]);

  const loginWithEmail = useCallback(async (email, password) => {
    const res = await AuthService.loginConEmail(email, password);
    if (!res.success) showToast(res.error.message, 'error');
    return res;
  }, [showToast]);

  const loginEstudiante = useCallback(async (correo, pin) => {
    const res = await AuthService.loginEstudiante(correo, pin);
    if (!res.success) showToast(res.error.message, 'error');
    return res;
  }, [showToast]);

  const crearEstudiante = useCallback(async (cedula, correo) => {
    const res = await AuthService.crearEstudiante(cedula, correo);
    if (!res.success) showToast(res.error.message, 'error');
    return res;
  }, [showToast]);

  const logoutUser = useCallback(async () => {
    setLoggingOut(true);
    try {
      await AuthService.logout();
    } catch (error) {
      console.warn('Error al cerrar sesión en Firebase:', error);
    } finally {
      setUser(null);
      setFbUser(null);
      setAutoLoginData(null);
      setLoggingOut(false);
      setAuthReady(true);
      showToast('Has cerrado sesión correctamente', 'success');
    }
  }, [showToast]);

  return {
    fbUser, authReady, user, setUser, autoLoginData, setAutoLoginData,
    loginWithGoogle, loginWithEmail, loginEstudiante, crearEstudiante, logoutUser
  };
}