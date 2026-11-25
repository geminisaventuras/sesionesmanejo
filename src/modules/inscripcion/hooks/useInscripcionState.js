// @build: 2026-11-20 | id: ESTADO-INSCRIPCION | desc: Estado del formulario + flujo persistido para recargas idempotentes.
import { useState, useCallback } from 'react';

export const FLOW_STORAGE_KEY = 'inscripcion_flow';

const DEFAULT_FORM = {
  cursoId: '', sedeId: '', tipoMoto: '', horaId: '', fecha1: '', fecha2: '',
  nombre: '', apellido: '', cedula: '', diaNac: '', mesNac: '', anoNac: '',
  sexo: '', estado: '', estadoId: '', municipio: '', municipioId: '', ciudad: '', ciudadId: '', zona: '', correo: '', telefono: '', contactoEmergencia: '',
  sabeBicicleta: '', traeMoto: 'No',
  // FT-058: movilidad opcional cuando el estudiante trae su propia moto.
  movilidadSolicitada: false, movilidadPin: null, movilidadDireccion: '',
  movilidadDistanciaKm: null, movilidadMontoUSD: null, movilidadMontoVES: null,
  movilidadSnapshot: null, movilidadAutorizacion: false,
  pagoBanco: '', pagoTelefono: '', pagoCedula: '', pagoRef: '',
  condicionMedica: '', detalleCondicion: ''
};

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};

export const crearFlowId = () =>
  `flow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const leerFlowInicial = () => {
  const guardado = parseJson(sessionStorage.getItem(FLOW_STORAGE_KEY), null);
  if (guardado?.flowId) return guardado;

  // Compatibilidad con sesiones abiertas antes de este cambio. Si hay un
  // paso 2-4 guardado, lo tratamos como flujo activo para no perderlo al
  // desplegar esta versión.
  const step = sessionStorage.getItem('inscripcion_step');
  const form = parseJson(sessionStorage.getItem('inscripcion_form'), null);
  if (step && step !== '1' && form && Object.keys(form).length > 0) {
    const adoptado = {
      flowId: crearFlowId(),
      origen: 'restaurado',
      step,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(adoptado));
    return adoptado;
  }
  return null;
};

export function useInscripcionState() {
  const [flow, setFlowState] = useState(leerFlowInicial);

  const [step, setStepState] = useState(() => {
    return sessionStorage.getItem('inscripcion_step') || flow?.step || '1';
  });

  const [form, setForm] = useState(() => {
    const saved = sessionStorage.getItem('inscripcion_form');
    const parsed = parseJson(saved, { ...DEFAULT_FORM });
    const base = { ...DEFAULT_FORM, ...parsed };
    // El flag de recompra pertenece al flujo. Antes se forzaba a false en
    // cada recarga y se perdía la intención del usuario.
    if (flow?.esRecompra === true) base.esRecompra = true;
    if (flow?.esReintento === true) base.esReintento = true;
    if (flow?.esPack === true) base.esPack = true;
    if (flow?.packId) base.packId = flow.packId;
    return base;
  });

  const [lockId, setLockId] = useState(() => {
    return sessionStorage.getItem('inscripcion_lockId') || null;
  });

  const [lockExpiresAt, setLockExpiresAtState] = useState(() => {
    const saved = sessionStorage.getItem('inscripcion_lockExpiresAt');
    return saved ? parseInt(saved, 10) : null;
  });

  const updateFlow = useCallback((updates) => {
    setFlowState(prev => {
      const next = typeof updates === 'function'
        ? updates(prev)
        : { ...(prev || {}), ...updates };
      if (!next?.flowId) {
        sessionStorage.removeItem(FLOW_STORAGE_KEY);
        return null;
      }
      const persistido = { ...next, updatedAt: Date.now() };
      sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(persistido));
      return persistido;
    });
  }, []);

  const limpiarFlow = useCallback(() => {
    sessionStorage.removeItem(FLOW_STORAGE_KEY);
    setFlowState(null);
  }, []);

  const setStep = useCallback((newStep) => {
    setStepState(newStep);
    sessionStorage.setItem('inscripcion_step', newStep);
  }, []);

  const updateForm = useCallback((updates) => {
    setForm(prev => {
      const nuevo = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      sessionStorage.setItem('inscripcion_form', JSON.stringify(nuevo));
      return nuevo;
    });
  }, []);

  const updateLockId = useCallback((id) => {
    setLockId(id);
    if (id) sessionStorage.setItem('inscripcion_lockId', id);
    else sessionStorage.removeItem('inscripcion_lockId');
  }, []);

  const updateLockExpiresAt = useCallback((ts) => {
    setLockExpiresAtState(ts);
    if (ts) sessionStorage.setItem('inscripcion_lockExpiresAt', ts.toString());
    else sessionStorage.removeItem('inscripcion_lockExpiresAt');
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...DEFAULT_FORM });
    sessionStorage.removeItem('inscripcion_form');
  }, []);

  const limpiarSesion = useCallback(() => {
    sessionStorage.removeItem('inscripcion_step');
    sessionStorage.removeItem('inscripcion_form');
    sessionStorage.removeItem('inscripcion_lockId');
    sessionStorage.removeItem('inscripcion_lockExpiresAt');
    sessionStorage.removeItem('inscripcion_generatedPin');
    // LOCK-INVALIDATION-SSOT-V1: limpiar snapshot del contexto del lock.
    sessionStorage.removeItem('inscripcion_lock_context');
    sessionStorage.removeItem(FLOW_STORAGE_KEY);
    setFlowState(null);
  }, []);

  return {
    step, setStep,
    form, updateForm, resetForm,
    lockId, updateLockId,
    lockExpiresAt, updateLockExpiresAt,
    limpiarSesion,
    flow, updateFlow, limpiarFlow
  };
}
