import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { ReservaService } from '../services/ReservaService';
import { LockService } from '../services/LockService';
import ModalPIN from '../components/ModalPIN';
import { Button, Input, Select, Spinner } from '../components/UI';
import { ChevronLeft, BookOpen, MapPin, Bike, Zap, User, Hash, Phone, Map, CreditCard, Check, ArrowRight, AlertCircle, Calendar, Clock } from 'lucide-react';

const ESTADOS_VZLA = ['Distrito Capital', 'Miranda', 'La Guaira', 'Aragua', 'Carabobo', 'Zulia', 'Táchira'];
const BANCOS = ['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'Bancamiga', 'BNC', 'Tesoro'];
const SEXOS = ['Masculino', 'Femenino'];

export const InscripcionView = () => {
  const { config, cursos, sedes, horarios, showToast, fbUser, authReady,
          crearEstudiante, getTodayStr, calcularBaseUSD, findAvailableResources, activeLocks, suscribirLocks } = useContext(AppContext);
  const navigate = useNavigate();
  const [step, setStep] = useState('1a');
  const [form, setForm] = useState({ cursoId: (cursos||[])[0]?.id || '', sedeId: '', tipoMoto: '', horaId: '', fecha1: '', fecha2: '', nombre: '', apellido: '', cedula: '', diaNac: '', mesNac: '', anoNac: '', sexo: '', estado: '', zona: '', telefono: '', sabeBicicleta: '', traeMoto: 'No', pagoBanco: '', pagoTelefono: '', pagoCedula: '', pagoRef: '' });
  const [modalPIN, setModalPIN] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockId, setLockId] = useState(null);
  const [bloques, setBloques] = useState([]);
  const [isSelectingHorario, setIsSelectingHorario] = useState(false);
  const [localMsg, setLocalMsg] = useState(null);

  const showLocalMsg = (msg, type = 'success') => {
    setLocalMsg({ msg, type });
    setTimeout(() => setLocalMsg(null), 4000);
  };

  const fecha2Calc = form.fecha1 ? (() => { const d = new Date(form.fecha1 + 'T12:00:00'); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })() : '';
  const baseUSD = calcularBaseUSD(form.sedeId, form.sabeBicicleta, form.traeMoto);
  const precioFinalVES = (baseUSD * (Number(config.tasaEUR) || 1)).toFixed(2);

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
      partes.push(`Recargo Guarenas: +$${config.recargoGuarenas || 0}`);
    }
    if (form.sabeBicicleta === 'No') {
      partes.push(`Recargo sin Bici: +$${config.recargoSinBici || 0}`);
    }
    if (form.traeMoto === 'Sí') {
      partes.push(`Descuento trae Moto: -$${config.descuentoMotoPropia || 0}`);
    }
    return partes;
  };

  useEffect(() => {
    let unsubscribe;
    if (form.fecha1) unsubscribe = suscribirLocks(form.fecha1);
    return () => { if (unsubscribe) unsubscribe(); };
  }, [form.fecha1, suscribirLocks]);

  useEffect(() => {
    if (!form.fecha1 || !form.sedeId || !form.tipoMoto) { setBloques([]); return; }
    const hor = (horarios||[]).filter(h => h.activo).sort((a,b) => a.id.localeCompare(b.id));
    const blocks = hor.map(b => {
      const res = findAvailableResources({ fecha1: form.fecha1, fecha2: fecha2Calc, horaId: b.id, sedeId: form.sedeId, tipoMoto: form.tipoMoto, traeMoto: form.traeMoto, activeLockIds: activeLocks.map(l => l.id) });
      const estaOcupado = activeLocks.some(l => l.id.startsWith(`${form.fecha1}_${b.id}`) && l.id !== lockId);
      return { ...b, disponible: !!res && !estaOcupado, instructorId: res?.instructorId, motoAsignar: res?.motoAsignadaId, ocupado: estaOcupado };
    });
    setBloques(blocks);
  }, [form.fecha1, form.sedeId, form.tipoMoto, form.traeMoto, activeLocks, lockId]);

  const handleSelectHorario = async (bloque) => {
    if (isSelectingHorario) return;
    setIsSelectingHorario(true);
    if (lockId) { await LockService.liberarLock(lockId).catch(() => {}); }
    const nuevoLockId = `${form.fecha1}_${bloque.id}`;
    const result = await LockService.crearLock(nuevoLockId, fbUser.uid, { fecha: form.fecha1, horaId: bloque.id, instructorId: bloque.instructorId, motoAsignadaId: bloque.motoAsignar });
    if (result.success) { setLockId(nuevoLockId); setForm(prev => ({ ...prev, horaId: bloque.id })); showLocalMsg('Horario seleccionado. Continúa con tus datos.', 'success'); }
    else { showLocalMsg(result.error.message || 'No se pudo bloquear el horario', 'error'); }
    setIsSelectingHorario(false);
  };

  const handlePinConfirmado = async () => {
    if (!modalPIN || !lockId) { showLocalMsg('Error: No se encontró el bloqueo del horario. Selecciona de nuevo.', 'error'); setModalPIN(null); return; }
    const { userId } = modalPIN;
    setModalPIN(null);
    setIsSubmitting(true);
    const result = await ReservaService.crearReserva({ ...form, userId, fecha: form.fecha1, fecha2: fecha2Calc, fechaNacimiento }, lockId);
    setIsSubmitting(false);
    if (result.success) { showLocalMsg('¡Inscripción completada con éxito!', 'success'); setLockId(null); navigate('/portal'); }
    else { showLocalMsg(result.error.message || 'Error al crear la reserva', 'error'); }
  };

  const getStepNumber = (s) => {
    if (s === '1a' || s === '1b') return 1;
    if (s === '2') return 2;
    if (s === '3') return 3;
    return 1;
  };

  const handleNext = async () => {
    if (step === '1a') {
      if (!form.cursoId || !form.sedeId || !form.fecha1 || !form.tipoMoto) { showLocalMsg('Completa todos los campos', 'error'); return; }
      if (bloques.length === 0) { showLocalMsg('No hay horarios disponibles para esta configuración', 'error'); return; }
      setStep('1b');
      return;
    }
    if (step === '1b') {
      if (!form.horaId || !lockId) { showLocalMsg('Selecciona un horario primero', 'error'); return; }
      if (!lockId.startsWith(form.fecha1 + '_')) {
        showLocalMsg('El horario seleccionado no corresponde a esta fecha. Selecciona de nuevo.', 'error');
        setLockId(null);
        setForm(prev => ({ ...prev, horaId: '' }));
        return;
      }
      setStep('2');
      return;
    }
    if (step === '2') {
      if (!form.nombre || !form.cedula) { showLocalMsg('Completa los datos personales', 'error'); return; }
      if (!esMayorDeEdad()) { showLocalMsg('Debes ser mayor de 18 años para inscribirte', 'error'); return; }
      setStep('3');
      return;
    }
    if (step === '3') {
      setIsSubmitting(true);
      const result = await crearEstudiante(form.cedula);
      if (!result.success) { setIsSubmitting(false); showLocalMsg(result.error.message, 'error'); return; }
      setModalPIN({ pin: result.data.pin, userId: result.data.user.uid });
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === '1b') { setStep('1a'); }
    else if (step === '2') { setStep('1b'); }
    else if (step === '3') { setStep('2'); }
    else { navigate('/'); }
  };

  if (!authReady) return <Spinner message="Cargando..." />;

  const cursoActual = (cursos||[]).find(c => c.id === form.cursoId);
  const sedeActual = (sedes||[]).find(s => String(s.id) === String(form.sedeId));
  const stepNum = getStepNumber(step);

  // Barra de progreso tipo motocicleta
  const ProgressBar = () => (
    <div className="px-5 pt-4 pb-2">
      <div className="relative flex items-center justify-between">
        {/* Pista de fondo */}
        <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-gray-200 rounded-full transform -translate-y-1/2 z-0" />
        {/* Pista coloreada según progreso */}
        <div
          className="absolute top-1/2 left-4 h-1.5 bg-blue-600 rounded-full transform -translate-y-1/2 z-10 transition-all duration-500"
          style={{ width: `${((stepNum - 1) / 2) * 100}%` }}
        />
        {/* Ícono de motocicleta */}
        <div
          className="relative z-20 transition-all duration-500"
          style={{ left: `${((stepNum - 1) / 2) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <Bike size={18} className="text-white" />
          </div>
        </div>
        {/* Puntos de paso */}
        <div className="absolute top-1/2 left-4 right-4 flex justify-between transform -translate-y-1/2 z-20 pointer-events-none">
          {[1,2,3].map(i => (
            <div key={i} className={`w-3 h-3 rounded-full border-2 ${stepNum >= i ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-dvh flex flex-col relative max-w-md mx-auto shadow-xl">
      {localMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold text-white ${localMsg.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            {localMsg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            {localMsg.msg}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 p-5 border-b bg-white z-10">
        <button onClick={handleBack} className="p-2 bg-gray-50 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black uppercase">Inscripción</h2>
      </div>

      <ProgressBar />

      <div className="flex-1 overflow-y-auto px-5 pb-20">
        {step === '1a' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Configurar Clase</h3>
            <Select label="Curso" options={(cursos||[]).filter(c=>c.activo)} value={form.cursoId} onChange={e => setForm({...form, cursoId: e.target.value})} icon={BookOpen} />
            <Select label="Sede" options={(sedes||[]).filter(s=>s.activo)} value={form.sedeId} onChange={e => setForm({...form, sedeId: e.target.value})} icon={MapPin} />
            <Input label="Fecha (Día 1)" type="date" value={form.fecha1} onChange={e => setForm({...form, fecha1: e.target.value})} min={getTodayStr()} icon={Calendar} />
            <Select label="¿Trae moto?" options={['No','Sí']} value={form.traeMoto} onChange={e => setForm({...form, traeMoto: e.target.value})} icon={Bike} />
            <Select label="Tipo de Moto" options={['Automática','Sincrónica']} value={form.tipoMoto} onChange={e => setForm({...form, tipoMoto: e.target.value})} icon={Zap} />
          </div>
        )}

        {step === '1b' && (
          <div className="flex flex-col h-full">
            {/* Tarjetón resumen */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={22} className="text-blue-600" />
                <h3 className="font-black text-lg text-blue-900">{cursoActual?.nombre || 'Curso'}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-gray-500" />
                  <span className="font-bold text-gray-700 truncate">{sedeActual?.nombre || 'Sede'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-500" />
                  <span className="font-bold text-gray-700">{form.fecha1}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-gray-500" />
                  <span className="font-bold text-gray-700">{form.tipoMoto}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Bike size={14} className="text-gray-500" />
                  <span className="font-bold text-gray-700">{form.traeMoto === 'Sí' ? 'Moto propia' : 'Moto escuela'}</span>
                </div>
              </div>
            </div>

            <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2"><Clock size={20} /> Selecciona tu Horario</h3>
            <div className="grid gap-2 flex-1">
              {bloques.map(b => (
                <button key={b.id} disabled={!b.disponible || b.isLunch || isSelectingHorario} onClick={() => handleSelectHorario(b)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    b.isLunch ? 'bg-gray-100 border-gray-200 opacity-60' :
                    b.ocupado ? 'bg-red-50 border-red-400 text-red-700' :
                    !b.disponible ? 'bg-gray-50 border-gray-200 opacity-60' :
                    form.horaId === b.id ? 'bg-blue-50 border-blue-500 text-blue-800' :
                    'bg-white border-gray-200 hover:border-blue-300 cursor-pointer'
                  }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">{b.label}</span>
                    {b.isLunch && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-1 rounded font-black">ALMUERZO</span>}
                    {b.ocupado && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-black">OCUPADO</span>}
                    {!b.disponible && !b.ocupado && !b.isLunch && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-black">NO DISPONIBLE</span>}
                    {b.disponible && !b.ocupado && form.horaId === b.id && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-black">SELECCIONADO</span>}
                    {b.disponible && !b.ocupado && form.horaId !== b.id && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded font-black">DISPONIBLE</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === '2' && (
          <div className="space-y-2 [&_.mb-4]:mb-2">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombres" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} icon={User} />
              <Input label="Apellidos" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} icon={User} />
              <Input label="Cédula" type="tel" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value.replace(/\D/g,'').slice(0,10)})} icon={Hash} />
              <div className="mb-2">
                <label className="block text-sm font-bold text-gray-700 mb-1 ml-1 flex items-center gap-1">
                  <Calendar size={14} className="text-gray-500" />
                  Fecha de Nac.
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Día" maxLength="2"
                    value={form.diaNac} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 2); setForm({ ...form, diaNac: val }); }}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-1 text-center text-sm outline-none transition-all" />
                  <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Mes" maxLength="2"
                    value={form.mesNac} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 2); setForm({ ...form, mesNac: val }); }}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-1 text-center text-sm outline-none transition-all" />
                  <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Año" maxLength="4"
                    value={form.anoNac} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 4); setForm({ ...form, anoNac: val }); }}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-1 text-center text-sm outline-none transition-all" />
                </div>
              </div>
              <Input label="Teléfono" type="tel" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value.replace(/\D/g,'').slice(0,11)})} icon={Phone} />
              <Select label="Sexo" options={SEXOS} value={form.sexo} onChange={e => setForm({...form, sexo: e.target.value})} />
              <Select label="Estado" options={ESTADOS_VZLA} value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} />
              <Input label="Zona" value={form.zona} onChange={e => setForm({...form, zona: e.target.value})} icon={Map} />
            </div>
            {form.diaNac && form.mesNac && form.anoNac && (
              <p className={`text-xs font-bold -mt-1 ${esMayorDeEdad() ? 'text-green-600' : 'text-red-600'}`}>
                {esMayorDeEdad() ? '✅ Mayor de edad' : '❌ Debes ser mayor de 18 años'}
              </p>
            )}
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
              <Select label="¿Sabe andar en bicicleta?" options={['Sí','No']} value={form.sabeBicicleta} onChange={e => setForm({...form, sabeBicicleta: e.target.value})} icon={Bike} />
              {form.sabeBicicleta === 'No' && (
                <p className="text-xs text-orange-700 font-bold mt-1">
                  Recargo por instrucción especial: +${config.recargoSinBici || 0} USD
                </p>
              )}
            </div>
          </div>
        )}

        {step === '3' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2"><CreditCard size={20} /> Realizar Pago</h3>
            <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg">
              <p className="text-sm opacity-80 mb-1">Total a Cancelar (Pago Móvil)</p>
              <h4 className="text-4xl font-black">Bs. {precioFinalVES}</h4>
              <p className="text-sm opacity-80">Base: USD {baseUSD} (Tasa EUR BCV: {config.tasaEUR})</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Desglose del precio</p>
              {desglosePrecio().map((linea, i) => (
                <p key={i} className="text-xs text-gray-700">{linea}</p>
              ))}
            </div>
            <Select label="Banco Emisor" options={BANCOS} value={form.pagoBanco} onChange={e => setForm({...form, pagoBanco: e.target.value})} icon={CreditCard} />
            <Input label="Teléfono Origen" type="tel" value={form.pagoTelefono} onChange={e => setForm({...form, pagoTelefono: e.target.value.replace(/\D/g,'').slice(0,11)})} icon={Phone} />
            <Input label="Cédula Titular" type="tel" value={form.pagoCedula} onChange={e => setForm({...form, pagoCedula: e.target.value.replace(/\D/g,'').slice(0,10)})} icon={Hash} />
            <Input label="Últimos 4 dígitos de la Referencia" type="tel" value={form.pagoRef} onChange={e => setForm({...form, pagoRef: e.target.value.replace(/\D/g,'').slice(0,4)})} icon={Hash} />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t p-4 z-20">
        <Button onClick={handleNext} icon={step === '3' ? Check : ArrowRight} disabled={isSubmitting}>
          {isSubmitting ? 'Procesando...' : step === '3' ? 'Confirmar y Enviar Pago' : step === '1b' ? 'Continuar a Datos' : 'Continuar'}
        </Button>
      </div>
      {modalPIN && <ModalPIN pin={modalPIN.pin} onConfirm={handlePinConfirmado} />}
    </div>
  );
};
