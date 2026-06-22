// @build: 2026-06-21.FASE3 | id: FASE3-COMPOSITOR | desc: AppContext refactorizado como compositor de hooks especializados
import React, { useState, useCallback, useMemo } from 'react';
import { AppContext } from './AppContextValue';
import { useAuthProvider } from './AuthProvider';
import { useConfigProvider } from './ConfigProvider';
import { useFirestoreProvider } from './FirestoreProvider';
import { useNotificationsProvider } from './NotificationsProvider';

export const AppProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // 1. Autenticación
  const auth = useAuthProvider(showToast);

  // 2. Configuración (depende de authReady)
  const cfg = useConfigProvider(auth.authReady);

  // 3. Datos Firestore (depende de fbUser, authReady, isAdmin, showToast, user)
  const isAdmin = auth.user?.role === 'admin';
  const firestore = useFirestoreProvider(auth.fbUser, auth.authReady, isAdmin, showToast, auth.user);

  // 4. Notificaciones automáticas (depende de reservas, isAdmin, fbUser, instructores)
  useNotificationsProvider(
    firestore.reservas,
    isAdmin,
    auth.fbUser,
    firestore.instructores,
    firestore.saveNotificacion,
    firestore.prevReservasRef
  );

  // 5. calcularBaseUSD (depende de config y sedes)
  const calcularBaseUSD = useCallback((sedeId, sabeBici, traeMoto) => {
    let total = Number(cfg.config.precioBase) || 0;
    const s = firestore.sedes.find(x => String(x.id) === String(sedeId));
    if (s?.nombre === 'Guarenas') total += Number(cfg.config.recargoGuarenas) || 0;
    if (sabeBici === 'No') total += Number(cfg.config.recargoSinBici) || 0;
    if (traeMoto === 'Sí') total -= Number(cfg.config.descuentoMotoPropia) || 0;
    total -= Number(cfg.config.descuentoPromo) || 0;
    return total > 0 ? total : 0;
  }, [cfg.config, firestore.sedes]);

  // 6. Construir contextValue (API idéntica a la anterior)
  const contextValue = useMemo(() => ({
    config: cfg.config,
    saveConfig: cfg.saveConfig,
    sedes: firestore.sedes,
    saveSede: firestore.saveSede,
    horarios: firestore.horarios,
    saveHorario: firestore.saveHorario,
    cursos: firestore.cursos,
    saveCurso: firestore.saveCurso,
    instructores: firestore.instructores,
    saveInstructor: firestore.saveInstructor,
    handleSaveInstructorSeguro: firestore.handleSaveInstructorSeguro,
    proveedores: firestore.proveedores,
    saveProveedor: firestore.saveProveedorSeguro,
    motos: firestore.motos,
    saveMoto: firestore.saveMoto,
    reservas: firestore.reservas,
    saveReserva: firestore.saveReserva,
    movimientos: firestore.movimientos,
    saveMovimiento: firestore.saveMovimiento,
    admins: firestore.admins,
    saveAdmin: firestore.saveAdmin,
    notifications: firestore.notifications,
    markNotificationRead: firestore.markNotificationRead,
    user: auth.user,
    setUser: auth.setUser,
    toast,
    showToast,
    autoLoginData: auth.autoLoginData,
    setAutoLoginData: auth.setAutoLoginData,
    fbUser: auth.fbUser,
    authReady: auth.authReady,
    loginWithGoogle: auth.loginWithGoogle,
    loginWithEmail: auth.loginWithEmail,
    loginEstudiante: auth.loginEstudiante,
    crearEstudiante: auth.crearEstudiante,
    logoutUser: auth.logoutUser,
    activeLocks: firestore.activeLocks,
    suscribirLocks: firestore.suscribirLocks,
    getTodayStr: firestore.getTodayStr,
    isReservaActiva: firestore.isReservaActiva,
    isReservationConflict: firestore.isReservationConflict,
    findAvailableResources: firestore.findAvailableResources,
    calcularBaseUSD,
    createStaffUser: firestore.createStaffUser,
    seedDatabase: firestore.seedDatabase,
    cleanExpiredLocks: firestore.cleanExpiredLocks
  }), [cfg, firestore, auth, toast, showToast, calcularBaseUSD]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};