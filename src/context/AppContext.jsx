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

  const auth = useAuthProvider(showToast);
  const cfg = useConfigProvider(auth.authReady,auth.fbUser);
  const isAdmin = auth.user?.role === 'admin';
  const firestore = useFirestoreProvider(auth.fbUser, auth.authReady, isAdmin, showToast, auth.user);

  useNotificationsProvider(
    firestore.reservas,
    isAdmin,
    auth.fbUser,
    firestore.instructores,
    firestore.saveNotificacion,
    firestore.prevReservasRef
  );

   const calcularBaseUSD = useCallback((sedeId, sabeBici, traeMoto, curso) => {
    const precioBaseCurso = Number(curso?.precioBase) || 0;
    let total = precioBaseCurso > 0 ? precioBaseCurso : (Number(cfg.config.precioBase) || 0);
    const s = firestore.sedes.find(x => String(x.id) === String(sedeId));
    if (s?.nombre === 'Guarenas') total += Number(cfg.config.recargoGuarenas) || 0;
    if (sabeBici === 'No') total += Number(cfg.config.recargoSinBici) || 0;
        if (traeMoto === 'Sí') total -= Number(cfg.config.descuentoMotoPropia) || 0;
    // A2.2-bis: suma el alquiler de moto si la escuela la provee y el alumno no la trae
    if (traeMoto !== 'Sí' && curso?.motoIncluida !== false) {
      total += Number(curso?.precioAlquilerMoto) || 0;
    }
    total -= Number(cfg.config.descuentoPromo) || 0;
    return total > 0 ? total : 0;
  }, [cfg.config, firestore.sedes]); 

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
    saveProveedorSeguro: firestore.saveProveedorSeguro,    
    motos: firestore.motos,
    saveMoto: firestore.saveMoto,
    metodosPago: firestore.metodosPago,
    saveMetodoPago: firestore.saveMetodoPago,
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