// @build: 2026-06-22.REFACTOR | id: ORQUESTADOR-CORREGIDO | desc: Orquestador con bifurcación de ModalPIN (paso 1 vs paso 4).
import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { ReservaService } from '../../../services/ReservaService';
import { LockService } from '../../../services/LockService';
import { AuthService } from '../../../services/AuthService';
import ModalPIN from '../../../components/ModalPIN';
import ModalConfirmacion from '../../shared/components/ModalConfirmacion';
import { Button, Spinner } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import { useInscripcionState } from '../hooks/useInscripcionState';
import { useDisponibilidad } from '../hooks/useDisponibilidad';
import { Paso1DatosPersonales } from '../components/Paso1DatosPersonales';
import { Paso2Configuracion } from '../components/Paso2Configuracion';
import { Paso3Horario } from '../components/Paso3Horario';
import { Paso4Pago } from '../components/Paso4Pago';
import { Stepper } from '../components/Stepper';
import { CalendarioFlotante } from '../components/CalendarioFlotante';
import { FormularioSalud } from '../components/FormularioSalud';
import { CalendarioNacimiento } from '../components/CalendarioNacimiento';
import { LockTimerFlotante } from '../components/LockTimerFlotante';
import { ModalExpiracion } from '../components/ModalExpiracion';
import { ArrowRight, Check } from 'lucide-react';

const LOCK_DURATION = 10 * 60 * 1000;
const MAX_REINTENTOS_EXPIRACION = 3;

export const InscripcionView = () => {
  const ctx = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    step, setStep,
    form, updateForm,
    lockId, updateLockId,
    lockExpiresAt, updateLockExpiresAt,
    limpiarSesion
  } = useInscripcionState();

  const [modalPIN, setModalPIN] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelectingHorario, setIsSelectingHorario] = useState(false);
  const [selectingBlockId, setSelectingBlockId] = useState(null);
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaA, setCaptchaA] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [captchaB, setCaptchaB] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [renovacionUsada, setRenovacionUsada] = useState(false);
  const [mostrarDetallesPago, setMostrarDetallesPago] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [modalLiberar, setModalLiberar] = useState(null);
  const [mostrarCalendarioNacimiento, setMostrarCalendarioNacimiento] = useState(false);
  const [tempFechaNacimiento, setTempFechaNacimiento] = useState({ dia: '', mes: '', ano: '' });
  const [mostrarFormularioSalud, setMostrarFormularioSalud] = useState(false);
  const [lockExpirado, setLockExpirado] = useState(false);
  const [reintentosExpiracion, setReintentosExpiracion] = useState(0);
  const [mostrarModalExpiracion, setMostrarModalExpiracion] = useState(false);

  const locksSnapshotRef = useRef(ctx.activeLocks);
  const calendarioRef = useRef(null);
  const generatedPinRef = useRef(null);
  const [generatedPin, setGeneratedPin] = useState(() => {
    return sessionStorage.getItem('inscripcion_generatedPin') || null;
  });

  useEffect(() => { if (generatedPin) generatedPinRef.current = generatedPin; }, [generatedPin]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarioRef.current && !calendarioRef.current.contains(event.target)) {
        setMostrarCalendario(false);
      }
    };
    if (mostrarCalendario) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mostrarCalendario]);

  useEffect(() => {
    if (!lockExpiresAt) {
      setTiempoRestante(null);
      setLockExpirado(false);
      setMostrarModalExpiracion(false);
      return;
    }
    const actualizarContador = () => {
      const restante = lockExpiresAt - Date.now();
      if (restante <= 0) {
        setTiempoRestante(0);
        if (!lockExpirado) {
          setLockExpirado(true);
          setMostrarModalExpiracion(true);
        }
        return;
      }
      setTiempoRestante(restante);
    };
    actualizarContador();
    const interval = setInterval(actualizarContador, 1000);
    return () => clearInterval(interval);
  }, [lockExpiresAt, lockExpirado]);

  useEffect(() => {
    if (lockId && form.horaId && step !== '4') {
      LockService.liberarLock(lockId).catch(() => {});
      updateLockId(null);
      updateLockExpiresAt(null);
      setTiempoRestante(null);
      updateForm({ horaId: '' });
    }
  }, [form.fecha1]);

  const { diasDisponibles, bloques, fecha2Calc, maxDate, buscarProximaFechaDisponible, cargando } = useDisponibilidad({
    form, selectingBlockId, lockId,
    instructores: ctx.instructores, motos: ctx.motos,
    reservas: ctx.reservas, horarios: ctx.horarios,
    activeLocks: ctx.activeLocks, isSelectingHorario, locksSnapshotRef,
    getTodayStr: ctx.getTodayStr
  });

  const baseUSD = ctx.calcularBaseUSD(form.sedeId, form.sabeBicicleta, form.traeMoto);
  const tasaCobro = ctx.config.monedaCobroClientes === 'USD' ? ctx.config.tasaUSD : ctx.config.tasaEUR;
  const precioFinalVES = (baseUSD * (Number(tasaCobro) || 1)).toFixed(2);
  const fechaNacimiento = (form.diaNac && form.mesNac && form.anoNac) ? `${form.anoNac}-${String(form.mesNac).padStart(2,'0')}-${String(form.diaNac).padStart(2,'0')}` : '';

  const handlePinConfirmado = useCallback(async () => {
    if (!modalPIN || !lockId) {
      showToast('Error: No se encontró el bloqueo del horario.', 'error');
      setModalPIN(null);
      return;
    }
    setModalPIN(null);
    setIsSubmitting(true);
    const result = await ReservaService.crearReserva({
      ...form, userId: ctx.fbUser.uid, fecha: form.fecha1, fecha2: fecha2Calc,
      fechaNacimiento, pagoTotalMoneda: baseUSD, pagoTotalVES: parseFloat(precioFinalVES)
    }, lockId);
    setIsSubmitting(false);
    if (result.success) {
      limpiarSesion();
      showToast('¡Inscripción completada! Bienvenido a tu panel.', 'success');
      ctx.setUser({ role: 'estudiante', data: { nombre: form.nombre, apellido: form.apellido, cedula: form.cedula }, uid: ctx.fbUser.uid });
      navigate('/portal-reservas');
    } else {
      showToast(result.error.message || 'Error al crear la reserva', 'error');
    }
  }, [modalPIN, lockId, form, ctx.fbUser, fecha2Calc, fechaNacimiento, baseUSD, precioFinalVES, limpiarSesion, showToast, ctx.setUser, navigate]);

  const handleSelectHorario = useCallback(async (bloque) => {
    if (lockId && form.horaId === bloque.id) { setModalLiberar({ bloque }); return; }
    if (isSelectingHorario) return;
    if (!ctx.fbUser) { showToast('Espera un momento...', 'error'); return; }
    if (!bloque.instructorId || (form.traeMoto !== 'Sí' && !bloque.motoAsignadaId)) {
      showToast('Este bloque no tiene recursos asignados.', 'error'); return;
    }
    locksSnapshotRef.current = ctx.activeLocks;
    setIsSelectingHorario(true); setSelectingBlockId(bloque.id);
    if (lockId && !renovacionUsada) { await LockService.liberarLock(lockId).catch(() => {}); }
    const motoId = bloque.motoAsignadaId || 'sinmoto';
    const instructorId = bloque.instructorId || 'sininst';
    const nuevoLockId = `${form.fecha1}_${bloque.id}_${instructorId}_${motoId}`;
    const result = await LockService.crearLock(nuevoLockId, ctx.fbUser.uid, {
      fecha: form.fecha1, horaId: bloque.id, instructorId: bloque.instructorId, motoAsignadaId: bloque.motoAsignadaId
    });
    if (result.success) {
      updateLockId(nuevoLockId);
      updateForm({ horaId: bloque.id, instructorId: bloque.instructorId, motoAsignadaId: bloque.motoAsignadaId });
      updateLockExpiresAt(Date.now() + LOCK_DURATION);
      setLockExpirado(false); setReintentosExpiracion(0); setRenovacionUsada(false);
      showToast('Horario seleccionado. Tienes 10 minutos para completar el pago.', 'success');
    } else {
      showToast(result.error.message || 'No se pudo bloquear el horario', 'error');
    }
    setIsSelectingHorario(false); setSelectingBlockId(null);
  }, [lockId, form, ctx.fbUser, ctx.activeLocks, isSelectingHorario, renovacionUsada, updateLockId, updateForm, updateLockExpiresAt, showToast]);

  const handleRenovarLock = useCallback(async () => {
    if (!lockId || renovacionUsada) return;
    setRenovacionUsada(true);
    const result = await LockService.crearLock(lockId, ctx.fbUser.uid, { fecha: form.fecha1, horaId: form.horaId });
    if (result.success) {
      updateLockExpiresAt(Date.now() + LOCK_DURATION);
      showToast('Tiempo renovado. Tienes 10 minutos adicionales.', 'success');
    } else {
      showToast(result.error.message || 'No se pudo renovar el tiempo', 'error');
    }
  }, [lockId, renovacionUsada, ctx.fbUser, form.fecha1, form.horaId, updateLockExpiresAt, showToast]);

  const handleLiberarHorario = useCallback(async () => {
    if (!lockId) { setModalLiberar(null); return; }
    try {
      await LockService.liberarLock(lockId);
      updateLockId(null); updateLockExpiresAt(null); setTiempoRestante(null);
      updateForm({ horaId: '' }); setRenovacionUsada(false);
      showToast('Horario liberado. Puedes seleccionar otro.', 'success');
    } catch (error) {
      showToast('Error al liberar el horario', 'error');
    }
    setModalLiberar(null);
  }, [lockId, updateLockId, updateLockExpiresAt, updateForm, showToast]);

  const handleSeleccionarBloqueDesdeExpiracion = useCallback(async () => {
    const nuevoReintentos = reintentosExpiracion + 1;
    setReintentosExpiracion(nuevoReintentos);
    if (lockId) { await LockService.liberarLock(lockId).catch(() => {}); }
    updateLockId(null); updateLockExpiresAt(null); setTiempoRestante(null);
    setLockExpirado(false); setMostrarModalExpiracion(false);
    updateForm({ horaId: '' });
    if (nuevoReintentos >= MAX_REINTENTOS_EXPIRACION) {
      showToast('Has excedido el límite de intentos. Debes salir del sistema.', 'error');
      if (ctx.logoutUser) await ctx.logoutUser();
      limpiarSesion();
      navigate('/');
      return;
    }
    showToast('Selecciona un nuevo horario.', 'info');
    setStep('3');
  }, [reintentosExpiracion, lockId, ctx.logoutUser, limpiarSesion, navigate, showToast, setStep, updateLockId, updateLockExpiresAt, updateForm]);

  const handleSalirDesdeExpiracion = useCallback(async () => {
    if (lockId) { await LockService.liberarLock(lockId).catch(() => {}); }
    setMostrarModalExpiracion(false);
    limpiarSesion();
    if (ctx.logoutUser) await ctx.logoutUser();
    navigate('/');
  }, [lockId, limpiarSesion, ctx.logoutUser, navigate]);

  const handleNext = async () => {
    if (step === '1') {
      if (!ctx.fbUser) {
        setIsSubmitting(true);
        const result = await AuthService.crearEstudiante(form.cedula, form.correo);
        setIsSubmitting(false);
        if (result.success) {
          generatedPinRef.current = result.data.pin;
          setGeneratedPin(result.data.pin);
          sessionStorage.setItem('inscripcion_generatedPin', result.data.pin);
          setModalPIN({ pin: result.data.pin });
        } else if (result.error.code === 'auth/email-already-in-use' || result.error.code === 'already-enrolled') {
          showToast('Este correo ya está registrado. Si olvidaste tu PIN, contacta al administrador.', 'error');
        } else {
          showToast(result.error.message, 'error');
        }
        return;
      }
      setStep('2'); return;
    }
    if (step === '2') { setStep('3'); return; }
    if (step === '3') {
      if (!form.horaId || !lockId) { showToast('Selecciona un horario', 'error'); return; }
      updateLockExpiresAt(Date.now() + LOCK_DURATION);
      setLockExpirado(false);
      setStep('4'); return;
    }
    if (step === '4') {
      if (lockExpirado) { showToast('El tiempo expiró. Debes seleccionar un nuevo horario.', 'error'); return; }
      if (captchaValue !== String(captchaA + captchaB)) {
        setCaptchaA(Math.floor(Math.random() * 8) + 1);
        setCaptchaB(Math.floor(Math.random() * 8) + 1);
        setCaptchaValue('');
        showToast('Resultado incorrecto', 'error'); return;
      }
      setModalPIN({ pin: generatedPinRef.current || generatedPin });
    }
  };

  const handleBack = () => {
    if (step === '2') setStep('1');
    else if (step === '3') setStep('2');
    else if (step === '4') setStep('3');
    else navigate('/');
  };

  if (!ctx.authReady) return <Spinner message="Cargando..." />;

  const titulosPasos = { '1': 'Datos Personales', '2': 'Configurar Clase', '3': 'Fechas y Horarios', '4': 'Realizar Pago' };

  return (
    <AppShell header={
      <DashboardHeader 
        title={titulosPasos[step] || 'Inscripción'} 
        onBack={handleBack}
        onLogout={async () => { limpiarSesion(); if (ctx.logoutUser) await ctx.logoutUser(); navigate('/'); }}
        showNotifications={false}
      />
    } footer={
      <div className="bg-white border-t p-4">
        <Button onClick={handleNext} icon={step === '4' ? Check : ArrowRight} disabled={isSubmitting || (step === '3' && !form.horaId) || (step === '4' && lockExpirado)}>
          {isSubmitting ? 'Procesando...' : step === '4' ? 'Confirmar y Enviar Pago' : step === '3' ? 'Continuar a Pago' : step === '2' ? 'Continuar a Horario' : 'Continuar'}
        </Button>
      </div>
    } bgColor="bg-white">
      <div className="px-5 pt-2 pb-1 relative overflow-visible">
        <Stepper currentStep={parseInt(step)} onStepClick={(s) => { if (s < parseInt(step)) setStep(String(s)); }} />
      </div>

      <div className="px-5 pb-4">
        {step === '1' && <Paso1DatosPersonales form={form} updateForm={updateForm} onOpenSalud={() => setMostrarFormularioSalud(true)} onOpenFechaNacimiento={() => { setTempFechaNacimiento({ dia: form.diaNac || '01', mes: form.mesNac || String(new Date().getMonth() + 1).padStart(2, '0'), ano: form.anoNac || String(new Date().getFullYear()) }); setMostrarCalendarioNacimiento(true); }} />}
        {step === '2' && <Paso2Configuracion form={form} updateForm={updateForm} cursos={ctx.cursos} sedes={ctx.sedes} recargoSinBici={ctx.config.recargoSinBici} />}
        {step === '3' && <Paso3Horario form={form} updateForm={updateForm} diasDisponibles={diasDisponibles} bloques={bloques} onSelectHorario={handleSelectHorario} onMostrarCalendario={() => setMostrarCalendario(true)} isSelectingHorario={isSelectingHorario} selectingBlockId={selectingBlockId} fbUser={ctx.fbUser} lockId={lockId} recursosListos={ctx.instructores?.length > 0 && ctx.motos?.length > 0} showToast={showToast} cargando={cargando} />}
        {step === '4' && <Paso4Pago form={form} updateForm={updateForm} precioFinalVES={precioFinalVES} baseUSD={baseUSD} tasaCobro={tasaCobro} monedaCobroClientes={ctx.config.monedaCobroClientes} config={ctx.config} desglosePrecio={() => [ { label: 'Precio', value: `$${ctx.config.precioBase || 0}` }, { label: 'Recargo Sede', value: `+$${ctx.config.recargoGuarenas || 0}` }, { label: 'Recargo sin Bici', value: `+$${ctx.config.recargoSinBici || 0}` }, { label: 'Descuento Moto', value: `-$${ctx.config.descuentoMotoPropia || 0}` }, { label: 'Total USD', value: `$${baseUSD}`, bold: true } ]} lockId={lockId} step={step} lockTimer={<LockTimerFlotante tiempoRestante={tiempoRestante} renovacionUsada={renovacionUsada} onRenovarLock={handleRenovarLock} />} mostrarDetallesPago={mostrarDetallesPago} onToggleDetalles={() => setMostrarDetallesPago(!mostrarDetallesPago)} captchaA={captchaA} captchaB={captchaB} captchaValue={captchaValue} onCaptchaChange={(e) => setCaptchaValue(e.target.value.replace(/\D/g, '').slice(0, 2))} showToast={showToast} />}
      </div>

      {mostrarCalendario && <CalendarioFlotante ref={calendarioRef} form={form} updateForm={updateForm} diasDisponibles={diasDisponibles} maxDate={maxDate} mesCalendario={mesCalendario} setMesCalendario={setMesCalendario} onClose={() => setMostrarCalendario(false)} buscarProximaFechaDisponible={buscarProximaFechaDisponible} showToast={showToast} />}
      {mostrarFormularioSalud && <FormularioSalud form={form} updateForm={updateForm} onClose={() => setMostrarFormularioSalud(false)} />}
      {mostrarCalendarioNacimiento && <CalendarioNacimiento tempFechaNacimiento={tempFechaNacimiento} setTempFechaNacimiento={setTempFechaNacimiento} onConfirm={() => { updateForm({ diaNac: tempFechaNacimiento.dia, mesNac: tempFechaNacimiento.mes, anoNac: tempFechaNacimiento.ano }); setMostrarCalendarioNacimiento(false); }} onClose={() => setMostrarCalendarioNacimiento(false)} />}

      {/* ✅ CORRECCIÓN: Bifurcación de ModalPIN según el paso */}
      {modalPIN && (
        <ModalPIN 
          pin={modalPIN.pin} 
          onConfirm={() => {
            if (step === '1') {
              // Modo Acuse de Recibo (Paso 1)
              setModalPIN(null);
              setStep('2');
            } else {
              // Modo Confirmación Final (Paso 4)
              handlePinConfirmado();
            }
          }} 
        />
      )}

      {modalLiberar && <ModalConfirmacion titulo="Liberar horario" mensaje="¿Deseas liberar este horario? Si lo haces, deberás seleccionar otro bloque para continuar." onConfirm={handleLiberarHorario} onCancel={() => setModalLiberar(null)} />}
      {mostrarModalExpiracion && <ModalExpiracion reintentosExpiracion={reintentosExpiracion} maxReintentos={MAX_REINTENTOS_EXPIRACION} onSeleccionarBloque={handleSeleccionarBloqueDesdeExpiracion} onSalirSistema={handleSalirDesdeExpiracion} />}
    </AppShell>
  );
};
