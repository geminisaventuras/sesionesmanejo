// @build: 2026-06-20 | id: FINAL | desc: Stepper 3D + DateSelector unificado + Calendario con lógica de negocio + ajustes visuales finales
import { useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { ReservaService } from '../services/ReservaService';
import { LockService } from '../services/LockService';
import { AuthService } from '../services/AuthService';
import ModalPIN from '../components/ModalPIN';
import ModalConfirmacion from '../modules/shared/components/ModalConfirmacion';
import { Button, Input, Select, Spinner } from '../components/UI';
import { useToast } from '../modules/shared/components/ToastProvider';
import AppShell from '../modules/shared/components/AppShell';
import DashboardHeader from '../modules/shared/components/DashboardHeader';
import { ChevronLeft, BookOpen, MapPin, Bike, Zap, User, Contact, Phone, CreditCard, Check, ArrowRight, Calendar, Clock, Hash, X, ChevronRight, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const MAX_DIAS_RESERVA = 30;
const LOCK_DURATION = 10 * 60 * 1000;

const ESTADOS_VZLA = ['Distrito Capital', 'Miranda', 'La Guaira', 'Aragua', 'Carabobo', 'Zulia', 'Táchira'];
const BANCOS = [
  'Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'Bancamiga', 'BNC', 'Tesoro',
  'BOD', 'Banplus', 'Banco Exterior', 'Banco Nacional de Crédito', 'Banco Caroní',
  'Sofitasa', 'Bancaribe', 'Mi Banco', 'Banco Activo', 'Banco Agrícola'
];
const SEXOS = ['Masculino', 'Femenino'];

const DEFAULT_FORM = {
  cursoId: '', sedeId: '', tipoMoto: '', horaId: '', fecha1: '', fecha2: '',
  nombre: '', apellido: '', cedula: '', diaNac: '', mesNac: '', anoNac: '',
  sexo: '', estado: '', zona: '', telefono: '', sabeBicicleta: '', traeMoto: 'No',
  pagoBanco: '', pagoTelefono: '', pagoCedula: '', pagoRef: ''
};

const formatearFechaNatural = (texto) => {
  if (!texto) return null;
  texto = texto.toLowerCase().trim();
  const hoy = new Date();
  if (texto.includes('hoy')) return hoy.toISOString().split('T')[0];
  if (texto.includes('mañana')) {
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    return manana.toISOString().split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  const fecha = new Date(texto);
  if (!isNaN(fecha.getTime())) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
};

const isPastBlock = (fecha, label, todayStr) => {
  if (fecha !== todayStr || !label) return false;
  try {
    const startStr = label.split('-')[0].trim();
    const parts = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!parts) return false;
    let hours = parseInt(parts[1], 10);
    const mins = parseInt(parts[2], 10);
    const modifier = parts[3].toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const blockTime = new Date();
    blockTime.setHours(hours, mins, 0, 0);
    return new Date() > blockTime;
  } catch (e) { return false; }
};

export const InscripcionView = () => {
  const { config, cursos, sedes, horarios, fbUser, authReady, setUser,
          getTodayStr, calcularBaseUSD, findAvailableResources, activeLocks,
          suscribirLocks, reservas, instructores, motos } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(() => {
    const saved = sessionStorage.getItem('inscripcion_step');
    return saved || '1';
  });
  const [form, setForm] = useState(() => {
    const saved = sessionStorage.getItem('inscripcion_form');
    return saved ? JSON.parse(saved) : { ...DEFAULT_FORM };
  });
  const [modalPIN, setModalPIN] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockId, setLockId] = useState(() => sessionStorage.getItem('inscripcion_lockId') || null);
  const generatedPinRef = useRef(null);
  const [generatedPin, setGeneratedPin] = useState(() => {
    const saved = sessionStorage.getItem('inscripcion_generatedPin');
    if (saved) generatedPinRef.current = saved;
    return saved || null;
  });
  useEffect(() => { if (generatedPin) generatedPinRef.current = generatedPin; }, [generatedPin]);

  const [isSelectingHorario, setIsSelectingHorario] = useState(false);
  const [selectingBlockId, setSelectingBlockId] = useState(null);
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaA, setCaptchaA] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [captchaB, setCaptchaB] = useState(() => Math.floor(Math.random() * 8) + 1);

  const [lockExpiresAt, setLockExpiresAt] = useState(() => {
    const saved = sessionStorage.getItem('inscripcion_lockExpiresAt');
    return saved ? parseInt(saved) : null;
  });
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [renovacionUsada, setRenovacionUsada] = useState(false);
  const [mostrarDetallesPago, setMostrarDetallesPago] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [modalLiberar, setModalLiberar] = useState(null);

  const locksSnapshotRef = useRef(activeLocks);
  const calendarioRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarioRef.current && !calendarioRef.current.contains(event.target)) {
        setMostrarCalendario(false);
      }
    };
    if (mostrarCalendario) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mostrarCalendario]);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const fecha2Calc = form.fecha1
    ? (() => {
        const d = new Date(form.fecha1 + 'T12:00:00');
        d.setDate(d.getDate()+1);
        return d.toISOString().split('T')[0];
      })()
    : '';

  const baseUSD = calcularBaseUSD(form.sedeId, form.sabeBicicleta, form.traeMoto);
  const tasaCobro = config.monedaCobroClientes === 'USD' ? config.tasaUSD : config.tasaEUR;
  const precioFinalVES = (baseUSD * (Number(tasaCobro) || 1)).toFixed(2);

  const fechaNacimiento = (form.diaNac && form.mesNac && form.anoNac)
    ? `${form.anoNac}-${String(form.mesNac).padStart(2, '0')}-${String(form.diaNac).padStart(2, '0')}`
    : '';

  const esMayorDeEdad = () => {
    if (!form.diaNac || !form.mesNac || !form.anoNac) return false;
    const hoy = new Date();
    const nac = new Date(fechaNacimiento + 'T12:00:00');
    if (isNaN(nac.getTime())) return false;
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 18;
  };

  const desglosePrecio = () => {
    const partes = [];
    partes.push(`Base: $${config.precioBase || 0}`);
    if (form.sedeId && (sedes||[]).find(s => String(s.id) === String(form.sedeId))?.nombre === 'Guarenas') {
      partes.push(`Sede Guarenas: +$${config.recargoGuarenas || 0}`);
    }
    if (form.sabeBicicleta === 'No') {
      partes.push(`Recargo sin Bici: +$${config.recargoSinBici || 0}`);
    }
    if (form.traeMoto === 'Sí') {
      partes.push(`Descuento trae Moto: -$${config.descuentoMotoPropia || 0}`);
    }
    return partes;
  };

  const regenerateCaptcha = () => {
    setCaptchaA(Math.floor(Math.random() * 8) + 1);
    setCaptchaB(Math.floor(Math.random() * 8) + 1);
    setCaptchaValue('');
  };

  useEffect(() => {
    if (cursos && cursos.length > 0 && !form.cursoId) {
      setForm(prev => ({ ...prev, cursoId: cursos[0].id }));
    }
  }, [cursos]);

  useEffect(() => {
    sessionStorage.setItem('inscripcion_step', step);
    sessionStorage.setItem('inscripcion_form', JSON.stringify(form));
    if (lockId) sessionStorage.setItem('inscripcion_lockId', lockId);
    else sessionStorage.removeItem('inscripcion_lockId');
    if (generatedPin) sessionStorage.setItem('inscripcion_generatedPin', generatedPin);
    else sessionStorage.removeItem('inscripcion_generatedPin');
    if (lockExpiresAt) sessionStorage.setItem('inscripcion_lockExpiresAt', lockExpiresAt.toString());
    else sessionStorage.removeItem('inscripcion_lockExpiresAt');
  }, [step, form, lockId, generatedPin, lockExpiresAt]);

  const limpiarSesionInscripcion = useCallback(() => {
    sessionStorage.removeItem('inscripcion_step');
    sessionStorage.removeItem('inscripcion_form');
    sessionStorage.removeItem('inscripcion_lockId');
    sessionStorage.removeItem('inscripcion_generatedPin');
    sessionStorage.removeItem('inscripcion_lockExpiresAt');
  }, []);

  useEffect(() => {
    if (lockId && form.horaId && step !== '4') {
      LockService.liberarLock(lockId).catch(() => {});
      setLockId(null);
      setLockExpiresAt(null);
      setTiempoRestante(null);
      setForm(prev => ({ ...prev, horaId: '' }));
    }
  }, [form.fecha1]);

  useEffect(() => {
    if (!lockExpiresAt) { setTiempoRestante(null); return; }
    const actualizarContador = () => {
      const restante = lockExpiresAt - Date.now();
      if (restante <= 0) {
        setTiempoRestante(0);
        if (lockId) {
          LockService.liberarLock(lockId).catch(() => {});
          setLockId(null);
          setLockExpiresAt(null);
          setTiempoRestante(null);
          setForm(prev => ({ ...prev, horaId: '' }));
          showToast('Tu tiempo ha expirado. El horario ha sido liberado.', 'error');
        }
        return;
      }
      setTiempoRestante(restante);
    };
    actualizarContador();
    const interval = setInterval(actualizarContador, 1000);
    return () => clearInterval(interval);
  }, [lockExpiresAt]);

  useEffect(() => {
    let unsubscribe;
    if (form.fecha1) unsubscribe = suscribirLocks(form.fecha1);
    return () => { if (unsubscribe) unsubscribe(); };
  }, [form.fecha1, suscribirLocks]);

  // Cálculo de días disponibles
  const diasDisponibles = useMemo(() => {
    if (!form.sedeId || !form.tipoMoto) return [];
    const today = getTodayStr();
    const dias = [];
    const cursor = new Date(today + 'T12:00:00');
    const fin = new Date(maxDate + 'T12:00:00');

    while (cursor <= fin) {
      const fechaStr = cursor.toISOString().split('T')[0];
      const d2 = new Date(cursor);
      d2.setDate(d2.getDate() + 1);
      const fecha2Candidate = d2.toISOString().split('T')[0];

      const hayAlguno = (horarios || []).filter(h => h.activo && !h.isLunch).some(bloque => {
        if (fechaStr < today || isPastBlock(fechaStr, bloque.label, today)) return false;
        try {
          const res = findAvailableResources({
            fecha1: fechaStr,
            fecha2: fecha2Candidate,
            horaId: bloque.id,
            sedeId: form.sedeId,
            tipoMoto: form.tipoMoto,
            traeMoto: form.traeMoto,
            activeLockIds: (activeLocks || []).map(l => l.id)
          });
          const conflictoReserva = reservas.some(r => {
            if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
            if (String(r.horaId) !== String(bloque.id)) return false;
            return r.fecha === fechaStr || r.fecha === fecha2Candidate || r.fecha2 === fechaStr || r.fecha2 === fecha2Candidate;
          });
          return !!res && !conflictoReserva;
        } catch (e) {
          return false;
        }
      });
      dias.push({ fecha: fechaStr, disponible: hayAlguno });
      cursor.setDate(cursor.getDate() + 1);
    }
    return dias;
  }, [form.sedeId, form.tipoMoto, form.traeMoto, activeLocks, reservas, maxDate, getTodayStr, findAvailableResources, horarios]);

  useEffect(() => {
    if (step === '3' && form.sedeId && form.tipoMoto && !form.fecha1) {
      const firstAvail = diasDisponibles.find(d => d.disponible);
      if (firstAvail) {
        setForm(prev => ({ ...prev, fecha1: firstAvail.fecha }));
      } else {
        setForm(prev => ({ ...prev, fecha1: '' }));
      }
    }
  }, [step, form.sedeId, form.tipoMoto, diasDisponibles]);

  const bloques = useMemo(() => {
    if (!form.fecha1 || !form.sedeId || !form.tipoMoto) return [];
    if (!instructores?.length || !motos?.length) return [];

    const locksSource = isSelectingHorario ? locksSnapshotRef.current : activeLocks;
    const todayStr = getTodayStr();
    const hor = (horarios||[]).filter(h => h.activo).sort((a,b) => a.id.localeCompare(b.id));
    const blocks = hor.map(b => {
      if (b.id === selectingBlockId) return { ...b, disponible: true, ocupado: false, seleccionando: true };
      if (lockId && form.horaId === b.id) return { ...b, disponible: true, ocupado: false, restaurado: true };
      if (b.isLunch) return { ...b, disponible: false, reason: 'ALMUERZO' };
      if (form.fecha1 < todayStr || isPastBlock(form.fecha1, b.label, todayStr)) return { ...b, disponible: false, reason: 'CERRADO' };

      const res = findAvailableResources({
        fecha1: form.fecha1, fecha2: fecha2Calc, horaId: b.id,
        sedeId: form.sedeId, tipoMoto: form.tipoMoto, traeMoto: form.traeMoto,
        activeLockIds: (locksSource||[]).map(l => l.id)
      });
      const conflictoReserva = reservas.some(r => {
        if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
        if (String(r.horaId) !== String(b.id)) return false;
        return r.fecha === form.fecha1 || r.fecha === fecha2Calc || r.fecha2 === form.fecha1 || r.fecha2 === fecha2Calc;
      });
      const estaOcupadoPorLock = locksSource.some(l => l.id.startsWith(`${form.fecha1}_${b.id}`) && l.id !== lockId);
      const estaOcupado = estaOcupadoPorLock || conflictoReserva;
      const tieneRecursos = !!res && !estaOcupado;
      const disponibilidadFinal = tieneRecursos || (form.traeMoto === 'Sí' && res?.instructorId && !estaOcupado);
      return { ...b, disponible: disponibilidadFinal, instructorId: res?.instructorId, motoAsignar: res?.motoAsignadaId, ocupado: estaOcupado };
    });
    return blocks;
  }, [form.fecha1, form.sedeId, form.tipoMoto, form.traeMoto, activeLocks, lockId, form.horaId, getTodayStr, reservas, instructores, motos, horarios, fecha2Calc, findAvailableResources, selectingBlockId, isSelectingHorario]);

  const buscarProximaFechaDisponible = async () => {
    try {
      const basePath = 'artifacts/motoescuela-pro-v1/public/data';
      const today = getTodayStr();
      const hasta = new Date();
      hasta.setDate(hasta.getDate() + MAX_DIAS_RESERVA);
      const hastaStr = hasta.toISOString().split('T')[0];

      const locksRef = collection(db, 'locks');
      const locksQ = query(locksRef, where('fecha', '>=', today), where('fecha', '<=', hastaStr));
      const locksSnap = await getDocs(locksQ);

      const reservasRef = collection(db, basePath, 'reservas');
      const reservasQ = query(reservasRef, where('fecha', '>=', today), where('fecha', '<=', hastaStr));
      const reservasSnap = await getDocs(reservasQ);

      const ocupacionCache = {};
      locksSnap.docs.forEach(doc => {
        const lock = doc.data();
        if (lock.fecha && lock.horaId) ocupacionCache[`${lock.fecha}_${lock.horaId}`] = true;
      });
      reservasSnap.docs.forEach(doc => {
        const res = doc.data();
        if (res.estadoPago === 'Pendiente' || res.estadoPago === 'Aprobado') {
          if (res.fecha && res.horaId) ocupacionCache[`${res.fecha}_${res.horaId}`] = true;
          if (res.fecha2 && res.horaId) ocupacionCache[`${res.fecha2}_${res.horaId}`] = true;
        }
      });

      const hor = (horarios||[]).filter(h => h.activo && !h.isLunch);
      let inicioBusqueda = new Date(form.fecha1 + 'T12:00:00');
      if (isNaN(inicioBusqueda.getTime())) inicioBusqueda = new Date(today + 'T12:00:00');
      inicioBusqueda.setDate(inicioBusqueda.getDate() + 1);
      let fechaIter = inicioBusqueda;
      const fin = new Date(hastaStr + 'T12:00:00');

      while (fechaIter <= fin) {
        const fechaStr = fechaIter.toISOString().split('T')[0];
        if (fechaStr !== form.fecha1) {
          const hayDisponible = hor.some(b => {
            const key = `${fechaStr}_${b.id}`;
            return !ocupacionCache[key] && !isPastBlock(fechaStr, b.label, today);
          });
          if (hayDisponible) return fechaStr;
        }
        fechaIter.setDate(fechaIter.getDate() + 1);
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleSelectHorario = async (bloque) => {
    if (lockId && form.horaId === bloque.id) {
      setModalLiberar({ bloque });
      return;
    }
    if (isSelectingHorario) return;
    if (!fbUser) { showToast('Espera un momento, estamos preparando todo...', 'error'); return; }
    if (!bloque.instructorId || (form.traeMoto !== 'Sí' && !bloque.motoAsignar)) {
      showToast('Este bloque no tiene recursos asignados. Intenta con otro horario.', 'error'); return;
    }
    locksSnapshotRef.current = activeLocks;
    setIsSelectingHorario(true);
    setSelectingBlockId(bloque.id);
    if (lockId && !renovacionUsada) { await LockService.liberarLock(lockId).catch(() => {}); }
    const motoId = bloque.motoAsignar || 'sinmoto';
    const instructorId = bloque.instructorId || 'sininst';
    const nuevoLockId = `${form.fecha1}_${bloque.id}_${instructorId}_${motoId}`;
    const result = await LockService.crearLock(nuevoLockId, fbUser.uid, {
      fecha: form.fecha1, horaId: bloque.id, instructorId: bloque.instructorId, motoAsignadaId: bloque.motoAsignar
    });
    if (result.success) {
      setLockId(nuevoLockId);
      setForm(prev => ({ ...prev, horaId: bloque.id, instructorId: bloque.instructorId, motoAsignadaId: bloque.motoAsignar }));
      setLockExpiresAt(Date.now() + LOCK_DURATION);
      setRenovacionUsada(false);
      showToast('Horario seleccionado. Tienes 10 minutos para completar el pago.', 'success');
    } else {
      showToast(result.error.message || 'No se pudo bloquear el horario', 'error');
    }
    setIsSelectingHorario(false);
    setSelectingBlockId(null);
  };

  const handleLiberarHorario = async () => {
    if (!lockId) { setModalLiberar(null); return; }
    try {
      await LockService.liberarLock(lockId);
      setLockId(null);
      setLockExpiresAt(null);
      setTiempoRestante(null);
      setForm(prev => ({ ...prev, horaId: '' }));
      setRenovacionUsada(false);
      showToast('Horario liberado. Puedes seleccionar otro.', 'success');
    } catch (error) {
      showToast('Error al liberar el horario', 'error');
    }
    setModalLiberar(null);
  };

  const handleRenovarLock = async () => {
    if (!lockId || renovacionUsada) return;
    setRenovacionUsada(true);
    locksSnapshotRef.current = activeLocks;
    setIsSelectingHorario(true);
    setSelectingBlockId(form.horaId);
    const result = await LockService.crearLock(lockId, fbUser.uid, { fecha: form.fecha1, horaId: form.horaId });
    if (result.success) {
      setLockExpiresAt(Date.now() + LOCK_DURATION);
      showToast('Tiempo renovado. Tienes 10 minutos adicionales.', 'success');
    } else {
      showToast(result.error.message || 'No se pudo renovar el tiempo', 'error');
    }
    setIsSelectingHorario(false);
    setSelectingBlockId(null);
  };

  const handlePinConfirmado = async () => {
    if (!modalPIN || !lockId) {
      showToast('Error: No se encontró el bloqueo del horario.', 'error'); setModalPIN(null); return;
    }
    setModalPIN(null);
    setIsSubmitting(true);
    const result = await ReservaService.crearReserva(
      { ...form, userId: fbUser.uid, fecha: form.fecha1, fecha2: fecha2Calc, fechaNacimiento }, lockId
    );
    setIsSubmitting(false);
    if (result.success) {
      limpiarSesionInscripcion();
      showToast('¡Inscripción completada! Bienvenido a tu panel.', 'success');
      setUser({ role: 'estudiante', data: { nombre: form.nombre, apellido: form.apellido, cedula: form.cedula }, uid: fbUser.uid });
      navigate('/portal-reservas');
    } else {
      showToast(result.error.message || 'Error al crear la reserva', 'error');
    }
  };

  const handleNext = async () => {
    if (step === '1') {
      if (!form.nombre || !form.cedula) { showToast('Completa los datos personales', 'error'); return; }
      if (!esMayorDeEdad()) { showToast('Debes ser mayor de 18 años para inscribirte', 'error'); return; }
      if (fbUser && generatedPinRef.current) { setStep('2'); return; }
      if (fbUser && !generatedPinRef.current) {
        await AuthService.logout();
        setGeneratedPin(null);
        generatedPinRef.current = null;
        showToast('Se ha reiniciado tu sesión. Por favor, ingresa tus datos de nuevo.', 'error');
        return;
      }
      setIsSubmitting(true);
      const result = await AuthService.crearEstudiante(form.cedula);
      setIsSubmitting(false);
      if (!result.success) { showToast(result.error.message, 'error'); return; }
      generatedPinRef.current = result.data.pin;
      setGeneratedPin(result.data.pin);
      setStep('2'); return;
    }
    if (step === '2') {
      if (!form.cursoId || !(cursos||[]).some(c => String(c.id) === String(form.cursoId))) { showToast('Selecciona un curso válido', 'error'); return; }
      if (!form.sedeId || !form.tipoMoto) { showToast('Selecciona sede y tipo de moto', 'error'); return; }
      if (!form.sabeBicicleta) { showToast('Indica si sabes andar en bicicleta', 'error'); return; }
      if (!fbUser) { showToast('Preparando disponibilidad...', 'error'); return; }
      setStep('3'); return;
    }
    if (step === '3') {
      if (!fbUser) { showToast('Preparando todo...', 'error'); return; }
      if (!form.fecha1) { showToast('Selecciona una fecha', 'error'); return; }
      const hayAlgunBloque = bloques.some(b => b.disponible && !b.isLunch);
      if (!hayAlgunBloque) {
        showToast('La fecha seleccionada no tiene horarios disponibles. Elige otra.', 'error');
        return;
      }
      if (!form.horaId || !lockId) { showToast('Selecciona un horario primero', 'error'); return; }
      if (!lockId.startsWith(form.fecha1 + '_')) {
        showToast('El horario seleccionado no corresponde a esta fecha.', 'error');
        setLockId(null); setLockExpiresAt(null); setForm(prev => ({ ...prev, horaId: '' })); return;
      }
      setLockExpiresAt(Date.now() + LOCK_DURATION);
      setStep('4'); return;
    }
    if (step === '4') {
      if (!form.pagoBanco || !form.pagoTelefono || !form.pagoCedula || !form.pagoRef) {
        showToast('Completa los datos de pago', 'error'); return;
      }
      if (captchaValue !== String(captchaA + captchaB)) {
        regenerateCaptcha();
        showToast('Resultado incorrecto. Intenta de nuevo.', 'error'); return;
      }
      setModalPIN({ pin: generatedPinRef.current || generatedPin, userId: fbUser.uid });
    }
  };

  const handleBack = () => {
    if (step === '2') { setStep('1'); }
    else if (step === '3') { setStep('2'); }
    else if (step === '4') { setStep('3'); }
    else { navigate('/'); }
  };

  if (!authReady) return <Spinner message="Cargando..." />;

  const cursoActual = (cursos||[]).find(c => c.id === form.cursoId);
  const sedeActual = (sedes||[]).find(s => String(s.id) === String(form.sedeId));
  const stepNum = (step === '1') ? 1 : (step === '2') ? 2 : (step === '3') ? 3 : 4;
  const recursosListos = instructores?.length > 0 && motos?.length > 0;

  const Stepper = ({ currentStep }) => {
    const totalSteps = 4;
    const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100 + '%';
    return (
      <div className="relative flex items-center justify-between w-full max-w-xs mx-auto py-2">
        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-200 transform -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-1.5 bg-blue-600 transform -translate-y-1/2 z-10 transition-all duration-500"
          style={{ width: progressWidth }}
        />
        {[1,2,3,4].map(i => {
          const isCurrent = i === currentStep;
          const isCompleted = i < currentStep;
          const isFuture = i > currentStep;
          let circleClass = "relative z-20 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all";
          if (isCurrent) {
            circleClass += " w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-700 border-2 border-blue-300 shadow-xl";
          } else if (isCompleted) {
            circleClass += " bg-blue-600 text-white";
          } else {
            circleClass += " border-2 border-gray-300 bg-white text-gray-500";
          }
          return (
            <div key={i} className={circleClass}>
              {isCurrent ? (
                <Bike size={22} className="text-white" />
              ) : (
                i
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const fechasMostradas = useMemo(() => {
    const today = getTodayStr();
    const list = [];
    const cursor = new Date(today + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      const fechaStr = cursor.toISOString().split('T')[0];
      const info = diasDisponibles.find(d => d.fecha === fechaStr);
      list.push({
        fecha: fechaStr,
        disponible: info ? info.disponible : false,
        label: cursor.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [getTodayStr, diasDisponibles]);

  const CalendarioFlotante = () => {
    const diasEnMes = useMemo(() => {
      const year = mesCalendario.getFullYear();
      const month = mesCalendario.getMonth();
      const primerDia = new Date(year, month, 1);
      const ultimoDia = new Date(year, month + 1, 0);
      const dias = [];
      const primerDiaSemana = primerDia.getDay();
      const inicioSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
      for (let i = 0; i < inicioSemana; i++) {
        dias.push(null);
      }
      for (let d = 1; d <= ultimoDia.getDate(); d++) {
        const fecha = new Date(year, month, d);
        const fechaStr = fecha.toISOString().split('T')[0];
        const info = diasDisponibles.find(dd => dd.fecha === fechaStr);
        dias.push({ dia: d, fecha: fechaStr, disponible: info ? info.disponible : false });
      }
      return dias;
    }, [mesCalendario, diasDisponibles]);

    const cambiarMes = (delta) => {
      setMesCalendario(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const hoy = getTodayStr();

    const handleSeleccionarFecha = (fecha) => {
      setForm(prev => ({ ...prev, fecha1: fecha }));
      setMostrarCalendario(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/30 backdrop-blur-sm" onClick={() => setMostrarCalendario(false)}>
        <div
          ref={calendarioRef}
          className="bg-white rounded-xl border border-gray-200 shadow-2xl p-3 w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <button onClick={() => cambiarMes(-1)} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-gray-700 text-sm capitalize">
              {mesCalendario.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => cambiarMes(1)} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-500 mb-1">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {diasEnMes.map((diaInfo, idx) => {
              if (!diaInfo) return <div key={`empty-${idx}`} />;
              const { dia, fecha, disponible } = diaInfo;
              const esPasado = fecha < hoy;
              const esSeleccionado = form.fecha1 === fecha;
              const fueraDeRango = fecha < hoy || fecha > maxDate;
              const sePuedeSeleccionar = !esPasado && !fueraDeRango && disponible;

              return (
                <button
                  key={fecha}
                  disabled={!sePuedeSeleccionar}
                  onClick={() => handleSeleccionarFecha(fecha)}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                    esSeleccionado ? 'bg-blue-600 text-white' :
                    sePuedeSeleccionar ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100' :
                    'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  {dia}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between items-center">
            <button
              onClick={async () => {
                const proxima = await buscarProximaFechaDisponible();
                if (proxima) {
                  setForm(prev => ({ ...prev, fecha1: proxima }));
                  const nuevaFecha = new Date(proxima + 'T12:00:00');
                  setMesCalendario(new Date(nuevaFecha.getFullYear(), nuevaFecha.getMonth(), 1));
                  setMostrarCalendario(false);
                } else {
                  showToast('No hay fechas disponibles en el rango.', 'error');
                }
              }}
              className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100"
            >
              <ArrowRight size={12} /> Próxima disponible
            </button>
            <div className="flex gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-100 border border-green-300 rounded"></span> Libre</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-gray-100 border border-gray-200 rounded"></span> Ocupado</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LockTimerFlotante = () => {
    if (tiempoRestante === null) return null;
    const isExpired = tiempoRestante <= 0;
    const total = LOCK_DURATION;
    const restante = Math.max(tiempoRestante, 0);
    const pct = (restante / total) * 100;
    const circumference = 2 * Math.PI * 28;
    const offset = circumference - (pct / 100) * circumference;
    const minutes = Math.floor(restante / 60000);
    const seconds = Math.floor((restante % 60000) / 1000);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const isUrgent = restante < 60000;
    return (
      <div className="fixed top-32 right-4 z-40 flex flex-col items-center gap-2">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle cx="32" cy="32" r="28" fill="none" stroke={isUrgent ? '#dc2626' : '#f59e0b'} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-linear" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-black ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>{timeStr}</span>
          </div>
        </div>
        {isExpired && !renovacionUsada && (
          <button onClick={handleRenovarLock} className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-red-700 shadow-lg">Renovar</button>
        )}
        {isExpired && renovacionUsada && (
          <span className="text-xs text-red-600 font-bold bg-white px-2 py-1 rounded-full shadow">Agotado</span>
        )}
      </div>
    );
  };

  return (
    <AppShell header={
      <DashboardHeader
        nombre={form.nombre || 'Inscripción'}
        role="estudiante"
        onLogout={() => { limpiarSesionInscripcion(); navigate('/'); }}
      >
        <div className="flex items-center gap-3 w-full">
          <button onClick={handleBack} className="p-2 bg-white/10 rounded-full">
            <ChevronLeft size={20} className="text-white" />
          </button>
          <span className="text-sm font-bold text-white truncate">{form.nombre || 'Inscripción'}</span>
          <div className="flex-1" />
          <button onClick={() => { limpiarSesionInscripcion(); navigate('/'); }} className="p-2 bg-white/10 rounded-full">
            <X size={20} className="text-white" />
          </button>
        </div>
      </DashboardHeader>
    } footer={
      <div className="bg-white border-t p-4">
        <Button onClick={handleNext} icon={step === '4' ? Check : ArrowRight} disabled={isSubmitting || (step === '3' && !fbUser) || (step === '3' && lockId && !form.horaId)}>
          {isSubmitting ? 'Procesando...' : step === '4' ? 'Confirmar y Enviar Pago' : step === '3' ? 'Continuar a Pago' : step === '2' ? 'Continuar a Horario' : 'Continuar'}
        </Button>
      </div>
    } bgColor="bg-white">
      <div className="px-5 pt-2 pb-1">
        <Stepper currentStep={stepNum} />
      </div>

      <div className="px-5 pb-4">
        {step === '1' && (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-lg">Datos Personales</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombres" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} icon={User} />
              <Input label="Apellidos" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} icon={User} />
              <Input label="Cédula" type="tel" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value.replace(/\D/g,'').slice(0,10)})} icon={Contact} />
              <div className="mb-2">
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1 flex items-center gap-1">
                  <Calendar size={14} className="text-gray-500" /> Fecha de Nac.
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Día" maxLength="2"
                    value={form.diaNac} onChange={e => { let val = e.target.value.replace(/\D/g, ''); if (val > 31) val = '31'; setForm({ ...form, diaNac: val }); }}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-1 text-center text-sm outline-none" />
                  <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Mes" maxLength="2"
                    value={form.mesNac} onChange={e => { let val = e.target.value.replace(/\D/g, ''); if (val > 12) val = '12'; setForm({ ...form, mesNac: val }); }}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-1 text-center text-sm outline-none" />
                  <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Año" maxLength="4"
                    value={form.anoNac} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 4); setForm({ ...form, anoNac: val }); }}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-1 text-center text-sm outline-none" />
                </div>
              </div>
              <Input label="Teléfono" type="tel" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value.replace(/\D/g,'').slice(0,11)})} icon={Phone} />
              <Select label="Sexo" options={SEXOS} value={form.sexo} onChange={e => setForm({...form, sexo: e.target.value})} />
              <Select label="Estado" options={ESTADOS_VZLA} value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} icon={MapPin} />
              <Input label="Zona" value={form.zona} onChange={e => setForm({...form, zona: e.target.value})} icon={MapPin} placeholder="Ej: Petare" />
            </div>
          </div>
        )}

        {step === '2' && (
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-lg">Configurar Clase</h3>
            {cursos && cursos.length > 0 ? (
              <Select label="Curso" options={(cursos||[]).filter(c=>c.activo)} value={form.cursoId} onChange={e => setForm({...form, cursoId: e.target.value})} icon={BookOpen} />
            ) : (
              <div className="mb-4 text-left w-full">
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Curso</label>
                <div className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-400 flex items-center gap-2">
                  <BookOpen size={20} /> <span>Cargando cursos...</span>
                </div>
              </div>
            )}
            <Select label="Sede" options={(sedes||[]).filter(s=>s.activo)} value={form.sedeId} onChange={e => setForm({...form, sedeId: e.target.value})} icon={MapPin} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Tipo de Moto" options={['Automática','Sincrónica']} value={form.tipoMoto} onChange={e => setForm({...form, tipoMoto: e.target.value})} icon={Zap} />
              <Select label="¿Trae moto?" options={['No','Sí']} value={form.traeMoto} onChange={e => setForm({...form, traeMoto: e.target.value})} icon={Bike} />
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-300">
              <Select label="¿Sabe andar en bicicleta?" options={['Sí','No']} value={form.sabeBicicleta} onChange={e => setForm({...form, sabeBicicleta: e.target.value})} icon={Bike} />
              {form.sabeBicicleta === 'No' && (
                <p className="text-xs text-amber-800 font-bold mt-0.5">
                  Recargo por instrucción especial: +${config.recargoSinBici || 0} USD
                </p>
              )}
            </div>
          </div>
        )}
{step === '3' && (
  <div className="flex flex-col h-full space-y-2">
    {/* Bloque unificado: tarjeta + fechas + botón */}
    <div className="bg-blue-600 text-white rounded-xl shadow-lg overflow-hidden">
      {/* Datos del curso y sede */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-blue-200" />
            <span className="font-bold">{cursoActual?.nombre || 'Curso'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-blue-200" />
            <span className="font-bold truncate">{sedeActual?.nombre || 'Sede'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-blue-200" />
            <span className="font-bold">{form.tipoMoto}</span>
          </div>
          <div className="flex items-center gap-2">
            <Bike size={20} className="text-blue-200" />
            <span className="font-bold">{form.traeMoto === 'Sí' ? 'Moto propia' : 'Moto escuela'}</span>
          </div>
        </div>

        {/* Etiqueta de fechas */}
        <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-blue-400/40">
  <Calendar size={16} className="text-blue-200" />
  <span className="text-xs font-bold text-center">Fechas con Horas disponibles</span>
</div>
      </div>

      {/* Cinta de fechas (sin separación) */}
      <div className="grid grid-cols-7 bg-blue-700/50 border-t border-blue-400/30">
        {fechasMostradas.map(({ fecha, label, disponible }) => {
          const isSelected = form.fecha1 === fecha;
          return (
            <button
              key={fecha}
              onClick={() => setForm(prev => ({ ...prev, fecha1: fecha }))}
              disabled={!disponible}
              className={`py-2 text-xs font-semibold transition-colors border-r border-blue-400/30 last:border-r-0 ${
                isSelected
                  ? 'bg-white text-blue-600'
                  : disponible
                  ? 'bg-blue-500/30 text-white hover:bg-blue-400/40'
                  : 'bg-blue-800/30 text-blue-200/50 cursor-not-allowed'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Botón "Ver calendario completo" pegado */}
      <button
        onClick={() => setMostrarCalendario(true)}
        className="w-full py-2 text-xs font-medium text-blue-100 bg-blue-700/60 hover:bg-blue-700/80 transition-colors border-t border-blue-400/30"
      >
        Ver calendario completo
      </button>
    </div>

    {/* Bloques de horarios (sin cambios) */}
    {!fbUser ? (
      <div className="flex-1 flex items-center justify-center">
        <Spinner message="Cargando horarios..." />
      </div>
    ) : !recursosListos ? (
      <div className="flex-1 flex items-center justify-center"><Spinner message="Cargando instructores y motos..." /></div>
    ) : (
      <div className="flex-1 mt-2">
        <div className="grid gap-1.5">
          {bloques.map(b => {
            const isSelectingThis = selectingBlockId === b.id;
            return (
              <button key={b.id} disabled={!b.disponible || b.isLunch || isSelectingHorario || !fbUser}
                onClick={() => handleSelectHorario(b)}
                className={`w-full py-3 px-2 rounded-lg border-2 text-left transition-colors duration-200 ${
                  isSelectingThis ? 'bg-blue-50 border-blue-500 text-blue-800' :
                  b.isLunch ? 'bg-gray-100 border-gray-200 opacity-60' :
                  b.ocupado ? 'bg-gray-50 border-gray-300 text-gray-400' :
                  !b.disponible ? 'bg-gray-50 border-gray-200 opacity-60' :
                  form.horaId === b.id ? 'bg-blue-100 border-blue-500 text-blue-800 ring-2 ring-blue-300' :
                  'bg-white border-gray-200 hover:border-blue-300 cursor-pointer'
                }`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs">{b.label}</span>
                  {isSelectingThis ? (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black">Procesando...</span>
                  ) : (
                    <>
                      {b.isLunch && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black">ALMUERZO</span>}
                      {b.reason === 'CERRADO' && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black">CERRADO</span>}
                      {b.ocupado && <span className="text-[10px] bg-gray-100 text-slate-400 px-1.5 py-0.5 rounded font-black">OCUPADO</span>}
                      {!b.disponible && !b.ocupado && !b.isLunch && b.reason !== 'CERRADO' && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black">NO DISP.</span>}
                      {b.disponible && !b.ocupado && form.horaId === b.id && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black">SELECCIONADO</span>}
                      {b.disponible && !b.ocupado && form.horaId !== b.id && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-black">DISPONIBLE</span>}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>
)}

        {step === '4' && (
          <div className="space-y-1.5">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2"><CreditCard size={18} /> Realizar Pago</h3>
            <div className="rounded-xl border border-blue-100 shadow-sm overflow-hidden flex flex-col mt-2">
              <div className="bg-blue-600 text-white p-4 flex gap-4">
                <div className="flex-1 border-r border-blue-400/50 pr-4">
                  <p className="text-[10px] text-blue-100 uppercase tracking-wider mb-1">Total a Cancelar</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold">Bs.</span>
                    <span className="text-3xl font-bold">{precioFinalVES}</span>
                  </div>
                  <div className="text-[10px] text-blue-100 mt-2">
                    <p>Base: USD {baseUSD}</p>
                    <p>Tasa {config.monedaCobroClientes || 'EUR'}: {config.monedaCobroClientes === 'USD' ? config.tasaUSD : config.tasaEUR}</p>
                  </div>
                </div>
                <div className="flex-1 text-[10px] text-blue-100 flex flex-col justify-center">
                  <p className="text-white font-medium mb-1 uppercase">Desglose</p>
                  {desglosePrecio().map((linea, i) => (
                    <p key={i} className="leading-tight">{linea}</p>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setMostrarDetallesPago(!mostrarDetallesPago)}
                className="bg-blue-50/50 w-full px-4 py-2.5 flex items-center justify-between text-blue-700 text-xs font-medium border-t border-blue-100 transition-colors hover:bg-blue-50"
              >
                <div className="flex items-center gap-2">
                  {mostrarDetallesPago ? <EyeOff size={16} /> : <Eye size={16} />}
                  {mostrarDetallesPago ? 'Ocultar Datos de Pago Móvil' : 'Ver Datos de Pago Móvil'}
                </div>
                {mostrarDetallesPago ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </button>
              {mostrarDetallesPago && (
                <div className="bg-white p-4 border-t border-blue-100 text-xs text-gray-600">
                  <p className="font-semibold text-gray-800 mb-1">PAGO MÓVIL ESCUELA</p>
                  <p>Banco: {config?.pagoMovilEscuela?.banco || '—'}</p>
                  <p>Telf: {config?.pagoMovilEscuela?.telefono || '—'}</p>
                  <p>CI: {config?.pagoMovilEscuela?.cedula || '—'}</p>
                </div>
              )}
            </div>
            <div className="w-full mt-2">
              <Select label="Banco Emisor" options={BANCOS} value={form.pagoBanco} onChange={e => setForm({...form, pagoBanco: e.target.value})} icon={CreditCard} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Teléfono Origen" type="tel" value={form.pagoTelefono} onChange={e => setForm({...form, pagoTelefono: e.target.value.replace(/\D/g,'').slice(0,11)})} icon={Phone} placeholder="04141234567" />
              <Input label="Cédula Titular" type="tel" value={form.pagoCedula} onChange={e => setForm({...form, pagoCedula: e.target.value.replace(/\D/g,'').slice(0,10)})} icon={Contact} />
            </div>
            <Input label="Últimos 4 dígitos Ref." type="tel" value={form.pagoRef} onChange={e => setForm({...form, pagoRef: e.target.value.replace(/\D/g,'').slice(0,4)})} icon={Hash} placeholder="8452" />
            <div className="flex items-center justify-end gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
              <p className="text-xs font-bold text-blue-700 whitespace-nowrap">Escriba el resultado</p>
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-blue-700">{captchaA} + {captchaB} =</p>
                <input
                  type="tel"
                  value={captchaValue}
                  onChange={e => setCaptchaValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="?"
                  className="w-12 bg-white border border-blue-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {mostrarCalendario && <CalendarioFlotante />}

      {modalLiberar && (
        <ModalConfirmacion
          titulo="Liberar horario"
          mensaje="¿Deseas liberar este horario? Si lo haces, deberás seleccionar otro bloque para continuar."
          onConfirm={handleLiberarHorario}
          onCancel={() => setModalLiberar(null)}
        />
      )}

      {lockId && step === '4' && <LockTimerFlotante />}
      {modalPIN && <ModalPIN pin={modalPIN.pin} onConfirm={handlePinConfirmado} />}
    </AppShell>
  );
};