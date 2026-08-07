import { createContext } from 'react';

export const AppContext = createContext({
  config: {}, sedes: [], horarios: [], cursos: [],
  instructores: [], proveedores: [], motos: [],
  reservas: [], movimientos: [], admins: [],
  user: null, toast: null, autoLoginData: null,
  fbUser: null, authReady: false, activeLocks: [],
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  loginEstudiante: async () => {},
  crearEstudiante: async () => {},
  logoutUser: async () => {},
  suscribirLocks: () => {},
  getTodayStr: () => '', isReservaActiva: () => false,
  isReservationConflict: () => false, findAvailableResources: () => null,
  calcularBaseUSD: () => 0, showToast: () => {},
  setUser: () => {}, setAutoLoginData: () => {},
  saveConfig: async () => {}, saveSede: async () => {},
  saveHorario: async () => {}, saveCurso: async () => {},
  saveInstructor: async () => {}, saveProveedor: async () => {},
  saveMoto: async () => {}, saveReserva: async () => {},
  saveMovimiento: async () => {}, saveAdmin: async () => {}
});
