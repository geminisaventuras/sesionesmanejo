// @build: 2026-11-22 | id: T-049-ADMIN-CLAIM | desc: Admin reconocido por custom claim (UID), sin email hardcodeado
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
    if (!currentUser) return;
    const basePath = `artifacts/${APP_ID}/public/data`;

    try {
      // T-049: el rol admin vive en el custom claim `admin` del token.
      // No se consulta ni compara email. Si el token en caché aún no trae el
      // claim (p. ej. se acaba de asignar), se fuerza un refresh una vez.
      let tokenResult = await currentUser.getIdTokenResult().catch(() => null);
      if (tokenResult?.claims?.admin !== true) {
        tokenResult = await currentUser.getIdTokenResult(true).catch(() => tokenResult);
      }
      if (tokenResult?.claims?.admin === true) {
        setUser({ role: 'admin', data: { nombre: 'Administrador' }, uid: currentUser.uid });
        return;
      }

      // Rol de staff por UID (docId = uid). No se consulta por email para
      // evitar list/query sobre documentos privados con PII.
      const instSnap = await getDoc(doc(db, basePath, 'instructores', currentUser.uid));
      if (instSnap.exists()) {
        const instData = { id: instSnap.id, ...instSnap.data() };
        if (!instData.activo) {
          setUser(null);
          showToast('Tu cuenta de instructor está inactiva', 'error');
          return;
        }
        setUser({ role: 'instructor', data: instData, uid: currentUser.uid });
        return;
      }

      const provSnap = await getDoc(doc(db, basePath, 'proveedores', currentUser.uid));
      if (provSnap.exists()) {
        const provData = { id: provSnap.id, ...provSnap.data() };
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