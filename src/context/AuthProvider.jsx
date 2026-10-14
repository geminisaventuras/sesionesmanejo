// @build: 2026-06-22 | id: AUTH-PROVIDER-BLINDADO | desc: Admin reconocido por email sin depender de documento en Firestore
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthService } from '../services/AuthService';

const APP_ID = 'motoescuela-pro-v1';
const BASE_PATH = ['artifacts', APP_ID, 'public', 'data'];

export function useAuthProvider(showToast) {
  const [fbUser, setFbUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [autoLoginData, setAutoLoginData] = useState(null);

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

      if (email === 'armandoaventurasve@gmail.com') {
        setUser({ role: 'admin', data: { nombre: 'Administrador' }, uid: currentUser.uid });
        return;
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

      // SSOT: leer perfil completo de usuarios/{uid}
      let perfilData = {};
      try {
        const perfilSnap = await getDoc(doc(db, basePath, 'usuarios', currentUser.uid));
        if (perfilSnap.exists()) {
          perfilData = perfilSnap.data();
        }
      } catch (perfilErr) {
        console.warn('[AuthProvider] No se pudo leer usuarios/{uid}:', perfilErr.code);
      }
      setUser({ role: 'estudiante', data: perfilData, uid: currentUser.uid });

    } catch (e) {
      // Error restaurando rol
    }
  }, [showToast]);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange((currentUser) => {
      setFbUser(currentUser);
      if (currentUser) {
        restoreUserRole(currentUser).finally(() => setAuthReady(true));
      } else {
        setUser(null);
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, [restoreUserRole]);

  // FIX-REALTIME-SSOT: escuchar cambios del perfil en tiempo real.
  // Cuando el admin aprueba un pack o cambia métricas, el estudiante se actualiza sin F5.
  useEffect(() => {
    if (!fbUser?.uid || user?.role !== 'estudiante') return;
    const unsub = onSnapshot(
      doc(db, ...BASE_PATH, 'usuarios', fbUser.uid),
      (snap) => {
        if (snap.exists()) {
          setUser(prev => prev ? { ...prev, data: snap.data() } : prev);
        }
      },
      (err) => console.warn('[AuthProvider] onSnapshot usuarios:', err.code)
    );
    return () => unsub();
  }, [fbUser?.uid, user?.role]);

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
    const res = await AuthService.logout();
    if (res.success) { setUser(null); }
    else showToast(res.error.message, 'error');
  }, [showToast]);

  return {
    fbUser, authReady, user, setUser, autoLoginData, setAutoLoginData,
    loginWithGoogle, loginWithEmail, loginEstudiante, crearEstudiante, logoutUser
  };
}