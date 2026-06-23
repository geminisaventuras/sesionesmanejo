// @build: 2026-06-22.REFACTOR | id: ESTADO-INSCRIPCION | desc: Hook de estado puro para el formulario de inscripción, paso actual y persistencia en sessionStorage.
import { useState, useCallback } from 'react';

const DEFAULT_FORM = {
  cursoId: '', sedeId: '', tipoMoto: '', horaId: '', fecha1: '', fecha2: '',
  nombre: '', apellido: '', cedula: '', diaNac: '', mesNac: '', anoNac: '',
  sexo: '', estado: '', zona: '', correo: '', telefono: '', contactoEmergencia: '',
  sabeBicicleta: '', traeMoto: 'No',
  pagoBanco: '', pagoTelefono: '', pagoCedula: '', pagoRef: '',
  condicionMedica: '', detalleCondicion: ''
};

export function useInscripcionState() {
  const [step, setStepState] = useState(() => {
    return sessionStorage.getItem('inscripcion_step') || '1';
  });

  const [form, setForm] = useState(() => {
    const saved = sessionStorage.getItem('inscripcion_form');
    return saved ? JSON.parse(saved) : { ...DEFAULT_FORM };
  });

  const [lockId, setLockId] = useState(() => {
    return sessionStorage.getItem('inscripcion_lockId') || null;
  });

  const [lockExpiresAt, setLockExpiresAtState] = useState(() => {
    const saved = sessionStorage.getItem('inscripcion_lockExpiresAt');
    return saved ? parseInt(saved) : null;
  });

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

  const limpiarSesion = useCallback(() => {
    sessionStorage.removeItem('inscripcion_step');
    sessionStorage.removeItem('inscripcion_form');
    sessionStorage.removeItem('inscripcion_lockId');
    sessionStorage.removeItem('inscripcion_lockExpiresAt');
    sessionStorage.removeItem('inscripcion_generatedPin');
  }, []);

  return {
    step, setStep,
    form, updateForm,
    lockId, updateLockId,
    lockExpiresAt, updateLockExpiresAt,
    limpiarSesion
  };
}