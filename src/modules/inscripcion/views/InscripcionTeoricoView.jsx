// @build: 2026-10-09 | id: INSCRIPCION-TEORICO-VIEW | desc: Orquestador de compra de módulos formativos (reutiliza Paso1 y Paso4, salta Paso3)
import { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { auth, db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AuthService } from '../../../services/AuthService';
import UsuarioService from '../../shared/services/UsuarioService';
import AccesoTeoricoService from '../../public/services/AccesoTeoricoService';
import { EmailService } from '../../shared/services/EmailService';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import { Button, Spinner } from '../../../components/UI';
import { Stepper } from '../components/Stepper';
import { Paso1DatosPersonales } from '../components/Paso1DatosPersonales';
import { Paso2Teorico } from '../components/Paso2Teorico';
import { Paso4Pago } from '../components/Paso4Pago';
import { FormularioSalud } from '../components/FormularioSalud';
import { CalendarioNacimiento } from '../components/CalendarioNacimiento';
import { ModalTerminos } from '../components/ModalTerminos';
import { validarPaso1, validarPaso4 } from '../../shared/schemas/validations';
import { ArrowRight, Check, Award, GraduationCap } from 'lucide-react';

const DEFAULT_FORM = {
  nombre: '', apellido: '', cedula: '', diaNac: '', mesNac: '', anoNac: '',
  sexo: '', estado: '', zona: '', correo: '', telefono: '', contactoEmergencia: '',
  pagoBanco: '', pagoTelefono: '', pagoCedula: '', pagoRef: '',
  condicionMedica: '', detalleCondicion: '', pin: ''
};

export function InscripcionTeoricoView() {
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = useContext(AppContext);
  const { showToast } = useToast();

  // cursoTeoricoId puede venir por location.state o por URL (fallback)
  const cursoTeoricoId = location.state?.cursoTeoricoId
    || location.pathname.split('/teorico/')[1]?.split('/')[0]
    || null;

  const cursoTeoricoCtx = useMemo(
    () => (ctx.cursosTeoricos || []).find(c => String(c.id) === String(cursoTeoricoId)) || null,
    [ctx.cursosTeoricos, cursoTeoricoId]
  );
  const [cursoTeoricoLocal, setCursoTeoricoLocal] = useState(null);
  const cursoTeorico = cursoTeoricoCtx || cursoTeoricoLocal;

  // Fallback: si el contexto no tiene el curso (ej: sin sesión), lo cargamos directo
  useEffect(() => {
    if (cursoTeoricoCtx || !cursoTeoricoId) return;
    let activo = true;
    const cargar = async () => {
      try {
        const snap = await getDoc(doc(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'cursosTeoricos', cursoTeoricoId));
        if (activo && snap.exists()) setCursoTeoricoLocal({ id: snap.id, ...snap.data() });
      } catch (e) {
        console.warn('[InscripcionTeoricoView] Error cargando curso:', e.code);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [cursoTeoricoCtx, cursoTeoricoId]);

  const [step, setStep] = useState('1');
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [pin, setPin] = useState(null);
  const [pinFinal, setPinFinal] = useState(null);
  const [mostrarPantallaExito, setMostrarPantallaExito] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mostrarFormularioSalud, setMostrarFormularioSalud] = useState(false);
  const [mostrarCalendarioNacimiento, setMostrarCalendarioNacimiento] = useState(false);
  const [tempFechaNacimiento, setTempFechaNacimiento] = useState({ dia: '', mes: '', ano: '' });
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const [mostrarDetallesPago, setMostrarDetallesPago] = useState(false);
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [captchaA] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [captchaB] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [captchaValue, setCaptchaValue] = useState('');

  const bootstrapDoneRef = useRef(false);

  const updateForm = useCallback((updates) => {
    setForm(prev => typeof updates === 'function' ? updates(prev) : { ...prev, ...updates });
  }, []);

  useEffect(() => {
    if (bootstrapDoneRef.current) return;
    if (!ctx.authReady) return;
    bootstrapDoneRef.current = true;

    if (!cursoTeoricoId) {
      showToast('Módulo formativo no especificado.', 'error');
      navigate('/teorico', { replace: true });
      return;
    }
    if (ctx.fbUser) setStep('4');
  }, [ctx.authReady, ctx.fbUser, cursoTeoricoId, navigate, showToast]);

  useEffect(() => {
    if (ctx.fbUser && !form.correo) updateForm({ correo: ctx.fbUser.email });
  }, [ctx.fbUser, form.correo, updateForm]);

  const precioCurso = Number(cursoTeorico?.precio) || 0;
  const tasaCobro = ctx.config?.monedaCobroClientes === 'USD' ? ctx.config?.tasaUSD : ctx.config?.tasaEUR;
  const precioFinalVES = (precioCurso * (Number(tasaCobro) || 1)).toFixed(2);

  const handleNext = async () => {
    if (step === '1') {
      const v = validarPaso1(form);
      if (!v.success) { showToast(Object.values(v.errores)[0] || 'Datos inválidos', 'error'); return; }

      if (!ctx.fbUser) {
        setIsSubmitting(true);
        const res = await AuthService.crearEstudiante(form.cedula, form.correo);
        setIsSubmitting(false);
        if (res.success) {
          const uidNuevo = res.data.user?.uid || auth.currentUser?.uid;
          // SSOT: guardar perfil en usuarios/{uid} (fire-and-forget)
          UsuarioService.guardarPerfil(uidNuevo, form.correo, form).catch((err) => {
            console.warn('[InscripcionTeoricoView] Error guardando perfil SSOT:', err);
          });
          setPin(res.data.pin);
          updateForm({ pin: res.data.pin });
          setStep('2');
        } else if (res.error.code === 'already-enrolled' || res.error.code === 'auth/email-already-in-use') {
          showToast('Ya tienes cuenta con ese correo. Ingresa con tu PIN.F', 'error');
          navigate('/login');
        } else if (res.error.code === 'duplicate-cedula') {
          showToast('Esta cédula ya está registrada.', 'error');
        } else {
          showToast(res.error.message || 'Error al crear la cuenta.', 'error');
        }
        return;
      }
      setStep('2');
      return;
    }

    if (step === '2') {
      if (!cursoTeorico) { showToast('Módulo no válido.', 'error'); return; }
      setStep('4');
      return;
    }

    if (step === '4') {
      const v = validarPaso4(form);
      if (!v.success) { showToast(Object.values(v.errores)[0] || 'Datos de pago inválidos', 'error'); return; }
      if (!terminosAceptados) { showToast('Debes aceptar los términos y condiciones.', 'error'); return; }
      if (captchaValue !== String(captchaA + captchaB)) {
        showToast('Captcha incorrecto.', 'error');
        setCaptchaValue('');
        return;
      }

      const uid = auth.currentUser?.uid;
      if (!uid) { showToast('Sesión no encontrada.', 'error'); return; }

      setIsSubmitting(true);
      const res = await AccesoTeoricoService.crearAcceso({
        userId: uid,
        cursoTeoricoId: cursoTeorico.id,
        precio: precioCurso,
        moneda: cursoTeorico.moneda || 'USD',
        metodoPagoId: 'pago_movil',
        pagoBanco: form.pagoBanco,
        pagoTelefono: form.pagoTelefono,
        pagoCedula: form.pagoCedula,
        pagoRef: form.pagoRef,
        esAccesoVitalicio: cursoTeorico.duracionAcceso === 'vida'
      });
      setIsSubmitting(false);

      if (res.success) {
        const pinParaMostrar = pin || form.pin || null;

        // FIX-TEORICO-LOGUEADO-PIN: usuario logueado sin PIN nuevo → redirect directo
        if (ctx.fbUser && !pinParaMostrar) {
          showToast('Compra registrada. Esperando aprobación del administrador.', 'info');
          navigate('/portal-reservas?tab=servicios', { replace: true });
          return;
        }

        // Email solo para usuarios NUEVOS (con PIN válido)
        if (form.correo && form.nombre && form.apellido && pinParaMostrar) {
          EmailService.enviarCorreoBienvenida({
            correo: form.correo,
            nombre: form.nombre,
            apellido: form.apellido,
            pin: pinParaMostrar
          }).catch(() => {});
        }

        // FIX-TEORICO-LOGUEADO-CTX: solo hidratar ctx.user para usuarios NUEVOS
        // (evita sobreescribir el perfil completo del logueado con 3 campos)
        if (!ctx.fbUser && ctx.setUser && uid) {
          ctx.setUser({
            role: 'estudiante',
            data: { nombre: form.nombre, apellido: form.apellido, cedula: form.cedula },
            uid
          });
        }

        setPinFinal(pinParaMostrar);
        setMostrarPantallaExito(true);
      } else {
        showToast(res.error || 'Error al registrar la compra.', 'error');
      }
    }
  };

  const handleBack = () => {
    if (step === '2') setStep('1');
    else if (step === '4') setStep(ctx.fbUser ? '1' : '2');
    else navigate('/teorico');
  };

  const handleIrAlPanel = () => {
    const uid = auth.currentUser?.uid;
    if (uid && ctx.setUser) {
      ctx.setUser({
        role: 'estudiante',
        data: {
          nombre: form.nombre || '',
          apellido: form.apellido || '',
          cedula: form.cedula || '',
          correo: form.correo || ''
        },
        uid
      });
    }
    navigate('/portal-reservas?tab=servicios', { replace: true });
  };

  if (mostrarPantallaExito) {
    return (
      <AppShell header={<DashboardHeader title="Compra registrada" showNotifications={false} />} bgColor="bg-white">
        <div className="flex flex-col items-center justify-center min-h-full p-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <Award size={48} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">¡Compra registrada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tu acceso se activará cuando el administrador apruebe el pago.
          </p>
          {pinFinal && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 mb-4 w-full max-w-xs">
              <p className="text-sm text-gray-600 mb-3">Tu PIN de acceso:</p>
              <p className="text-5xl font-black text-blue-600 tracking-[0.5rem] font-mono">{pinFinal}</p>
            </div>
          )}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 w-full max-w-xs">
            <p className="text-xs font-bold text-yellow-800">⚠️ Guarda este PIN. Lo usarás para ingresar a la app.</p>
          </div>
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 w-full max-w-xs text-left rounded">
            <p className="text-xs text-orange-800">
              <strong>Estado: Pendiente de validación.</strong><br/>
              Tu compra está en revisión. Una vez aprobada por el administrador, el módulo se activará en tu panel.
            </p>
          </div>
          <div className="w-full max-w-xs space-y-2">
            <Button onClick={handleIrAlPanel} variant="primary" icon={GraduationCap}>
              Ir a mi panel
            </Button>
            <Button onClick={() => navigate('/teorico')} variant="outline">
              Ver el catálogo
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!ctx.authReady || !cursoTeorico) {
    return (
      <AppShell bgColor="bg-white">
        <div className="flex items-center justify-center min-h-full">
          <Spinner message="Cargando..." />
        </div>
      </AppShell>
    );
  }

  const titulosPasos = { '1': 'Datos Personales', '2': 'Configurar', '4': 'Realizar Pago' };
  const stepNumerico = step === '4' ? 4 : parseInt(step);

  return (
    <AppShell
      header={
        <DashboardHeader
          title={titulosPasos[step] || 'Compra'}
          onBack={handleBack}
          onLogout={async () => { if (ctx.logoutUser) await ctx.logoutUser(); navigate('/'); }}
          showNotifications={false}
        />
      }
      footer={
        <div className="bg-white border-t p-4">
          <Button
            onClick={handleNext}
            icon={step === '4' ? Check : ArrowRight}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Procesando...' : step === '4' ? 'Confirmar Compra' : step === '2' ? 'Continuar a Pago' : 'Continuar'}
          </Button>
        </div>
      }
      bgColor="bg-white"
    >
      <div className="px-5 pt-2 pb-1 relative overflow-visible">
        <Stepper currentStep={stepNumerico} onStepClick={(s) => { if (s < stepNumerico) setStep(String(s)); }} />
      </div>
      <div className="px-5 pb-4">
        {step === '1' && (
          <Paso1DatosPersonales
            form={form}
            updateForm={updateForm}
            fbUser={ctx.fbUser}
            onOpenSalud={() => setMostrarFormularioSalud(true)}
            onOpenFechaNacimiento={() => {
              setTempFechaNacimiento({
                dia: form.diaNac || '01',
                mes: form.mesNac || String(new Date().getMonth() + 1).padStart(2, '0'),
                ano: form.anoNac || String(new Date().getFullYear())
              });
              setMostrarCalendarioNacimiento(true);
            }}
          />
        )}
        {step === '2' && <Paso2Teorico cursoTeorico={cursoTeorico} />}
        {step === '4' && (
          <Paso4Pago
            form={form}
            updateForm={updateForm}
            precioFinalVES={precioFinalVES}
            baseUSD={precioCurso}
            precioCurso={precioCurso}
            tasaCobro={tasaCobro}
            monedaCobroClientes={ctx.config?.monedaCobroClientes}
            config={ctx.config}
            desglosePrecio={() => [
              { label: 'Precio', value: '$' + precioCurso },
              { label: 'Total USD', value: '$' + precioCurso, bold: true }
            ]}
            lockId={null}
            step="4"
            lockTimer={null}
            mostrarDetallesPago={mostrarDetallesPago}
            onToggleDetalles={() => setMostrarDetallesPago(!mostrarDetallesPago)}
            captchaA={captchaA}
            captchaB={captchaB}
            captchaValue={captchaValue}
            onCaptchaChange={(e) => setCaptchaValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
            showToast={showToast}
            terminosAceptados={terminosAceptados}
            onToggleTerminos={() => setTerminosAceptados(!terminosAceptados)}
            onVerTerminos={() => setMostrarTerminos(true)}
            mostrarTerminos={mostrarTerminos}
            onCerrarTerminos={() => setMostrarTerminos(false)}
          />
        )}
      </div>

      {mostrarFormularioSalud && (
        <FormularioSalud form={form} updateForm={updateForm} onClose={() => setMostrarFormularioSalud(false)} />
      )}
      {mostrarCalendarioNacimiento && (
        <CalendarioNacimiento
          tempFechaNacimiento={tempFechaNacimiento}
          setTempFechaNacimiento={setTempFechaNacimiento}
          onConfirm={() => {
            updateForm({ diaNac: tempFechaNacimiento.dia, mesNac: tempFechaNacimiento.mes, anoNac: tempFechaNacimiento.ano });
            setMostrarCalendarioNacimiento(false);
          }}
          onClose={() => setMostrarCalendarioNacimiento(false)}
        />
      )}
      {mostrarTerminos && <ModalTerminos onClose={() => setMostrarTerminos(false)} />}
    </AppShell>
  );
}

export default InscripcionTeoricoView;
