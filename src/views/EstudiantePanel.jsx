// @build: 2026-06-17.04-00-00 | id: PORTAL-MEJORAS | desc: Correcciones funcionales y rediseño visual compacto del Portal del Estudiante
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { useToast } from '../modules/shared/components/ToastProvider';
import AppShell from '../modules/shared/components/AppShell';
import { Button, ProgressBar, Spinner } from '../components/UI';
import { LogOut, AlertCircle, Check, Clock, Award, RefreshCw, MapPin, User, Calendar, BookOpen } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const formatearFechaNatural = (fechaStr) => {
  if (!fechaStr) return '';
  const [anio, mes, dia] = fechaStr.split('-');
  const fecha = new Date(anio, parseInt(mes)-1, dia);
  return DIAS_SEMANA[fecha.getDay()] + ' ' + parseInt(dia) + ' de ' + MESES[parseInt(mes)-1];
};

export const EstudiantePanel = () => {
  const { reservas, cursos, horarios, instructores, sedes, user, fbUser, saveReserva, logoutUser } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(true);
  const [localReserva, setLocalReserva] = useState(null);
  const [cursoDirecto, setCursoDirecto] = useState(null);
  const [busquedaCursoFallida, setBusquedaCursoFallida] = useState(false);

  if (!user || user.role !== 'estudiante') {
    navigate('/portal', { replace: true });
    return null;
  }

  const uid = fbUser?.uid || user?.uid;

  const reservaContext = reservas.find(r => {
    if (String(r.userId) !== String(uid)) return false;
    if (r.estadoPago === 'Aprobado' || r.estadoPago === 'Pendiente') return true;
    if (r.estadoPago === 'Rechazado') {
      if (r.expiraEn) return Date.now() < Number(r.expiraEn);
      if (r.rechazadoEn) return (Date.now() - r.rechazadoEn) / 60000 < 20;
    }
    return false;
  });

  useEffect(() => {
    if (!uid) { setIsSearching(false); return; }
    if (reservaContext) { setIsSearching(false); return; }
    
    const obtenerReserva = async () => {
      try {
        const reservasRef = collection(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'reservas');
        const q = query(reservasRef, where('userId', '==', String(uid)));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setLocalReserva({ id: snapshot.docs[0].id, ...docData });
        }
      } catch (e) {
        console.error('Error buscando reserva:', e);
      } finally {
        setIsSearching(false);
      }
    };
    obtenerReserva();
  }, [uid, reservaContext]);

  const buscarCurso = async () => {
    const reserva = reservaContext || localReserva;
    if (!reserva || !reserva.cursoId) {
      setBusquedaCursoFallida(true);
      return;
    }
    setBusquedaCursoFallida(false);
    try {
      const cursoRef = doc(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'cursos', String(reserva.cursoId));
      const cursoSnap = await getDoc(cursoRef);
      if (cursoSnap.exists()) {
        setCursoDirecto({ id: cursoSnap.id, ...cursoSnap.data() });
      } else {
        setCursoDirecto(null);
        setBusquedaCursoFallida(true);
      }
    } catch (e) {
      console.error('Error buscando curso:', e);
      setCursoDirecto(null);
      setBusquedaCursoFallida(true);
    }
  };

  useEffect(() => {
    buscarCurso();
  }, [reservaContext, localReserva]);

  if (isSearching) {
    return (
      <AppShell bgColor="bg-gray-50">
        <div className="flex items-center justify-center min-h-full">
          <Spinner message="Cargando tus datos..." />
        </div>
      </AppShell>
    );
  }

  const reservaActual = reservaContext || localReserva;
  if (!reservaActual) {
    return (
      <AppShell bgColor="bg-gray-50">
        <div className="flex flex-col items-center justify-center min-h-full p-6">
          <Award size={48} className="text-gray-400 mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Sin reservas activas</h2>
          <p className="text-sm text-gray-500 mb-4">No tienes ninguna reserva activa en este momento.</p>
          <Button onClick={() => { logoutUser(); navigate('/'); }} variant="outline">Volver al inicio</Button>
        </div>
      </AppShell>
    );
  }

  const cursoAsignado = cursoDirecto || cursos.find(c => String(c.id) === String(reservaActual.cursoId)) || { nombre: '', modulos: [] };
  const hor = horarios.find(h => String(h.id) === String(reservaActual.horaId));
  const inst = instructores.find(i => String(i.id) === String(reservaActual.instructorId));
  const sedeActual = sedes.find(s => String(s.id) === String(reservaActual.sedeId));
  const cantCompletados = Object.keys(reservaActual.modulosEstado || {}).length;
  const horaInicio = hor?.label ? hor.label.split('-')[0]?.trim() : '--:--';
  const horaFin = hor?.label ? hor.label.split('-')[1]?.trim() : '--:--';

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

  const header = (
    <div className="bg-white border-b px-5 py-3 flex items-center gap-3">
      <button type="button" onClick={handleLogout} className="p-2 bg-gray-100 rounded-full text-gray-500">
        <LogOut size={20} />
      </button>
      <h2 className="text-xl font-black text-gray-900 truncate">Hola, {reservaActual.nombre}</h2>
    </div>
  );

  return (
    <AppShell header={header} bgColor="bg-gray-50">
      <div className="p-4 space-y-3">
        {/* TARJETA DE BIENVENIDA COMPACTA */}
        <div className="rounded-xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={18} className="text-blue-200" />
              <p className="text-sm font-bold uppercase tracking-widest">{cursoAsignado.nombre || 'Curso'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-300" />
                <span className="font-bold">Sede: {sedeActual?.nombre || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-blue-300" />
                <span className="font-bold truncate">Inst: {inst ? inst.nombre : 'Asignando'}</span>
              </div>
            </div>

            <div className="bg-black/20 p-3 rounded-xl space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-blue-300" />
                <span className="font-bold">{formatearFechaNatural(reservaActual.fecha)}</span>
                <span className="text-blue-300">y</span>
                <span className="font-bold">{formatearFechaNatural(reservaActual.fecha2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-300" />
                <span className="font-bold">{horaInicio} - {horaFin}</span>
              </div>
            </div>
          </div>

          {/* Estado del Pago Integrado */}
          <div className={`px-4 py-3 flex items-center gap-3 ${
            reservaActual.estadoPago === 'Rechazado' ? 'bg-red-50' : 
            reservaActual.estadoPago === 'Pendiente' ? 'bg-orange-50' : 'bg-green-50'
          }`}>
            {reservaActual.estadoPago === 'Rechazado' ? <AlertCircle size={18} className="text-red-600" /> : 
             reservaActual.estadoPago === 'Pendiente' ? <AlertCircle size={18} className="text-orange-600" /> : 
             <Check size={18} className="text-green-600" />}
            <div className="flex-1">
              <p className={`text-xs font-bold ${
                reservaActual.estadoPago === 'Rechazado' ? 'text-red-700' : 
                reservaActual.estadoPago === 'Pendiente' ? 'text-orange-700' : 'text-green-700'
              }`}>
                {reservaActual.estadoPago === 'Rechazado' ? 'Pago Rechazado' : 
                 reservaActual.estadoPago === 'Pendiente' ? 'Pago Pendiente' : 'Pago Aprobado'}
              </p>
              <p className="text-[10px] text-gray-600">
                {reservaActual.estadoPago === 'Rechazado' ? 'Tienes 20 minutos para corregir la referencia' : 
                 reservaActual.estadoPago === 'Pendiente' ? 'Ref: ' + reservaActual.pagoRef : '¡Comienza tu curso!'}
              </p>
            </div>
            {reservaActual.estadoPago === 'Rechazado' && (
              <div className="flex gap-2">
                <input type="number" placeholder="Nueva Ref" className="w-16 p-1 rounded-lg border border-red-200 text-xs outline-none bg-white font-bold text-center" id="nuevaRef" maxLength="4" />
                <Button type="button" variant="dark" className="!py-1 !px-3 !text-[10px]" onClick={async () => {
                  const ref = document.getElementById('nuevaRef')?.value;
                  if (!ref || ref.length !== 4) return showToast('Debe tener 4 dígitos', 'error');
                  await saveReserva({ ...reservaActual, pagoRef: ref, estadoPago: 'Pendiente' });
                  showToast('Referencia enviada', 'success');
                }}>Actualizar</Button>
              </div>
            )}
          </div>
        </div>

        {/* AVANCE ACADÉMICO */}
        {cursoAsignado.nombre && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-sm">Avance Académico</h3>
              <span className="text-xs font-bold text-blue-600">{cantCompletados}/{cursoAsignado.modulos.length}</span>
            </div>
            <ProgressBar completados={cantCompletados} total={cursoAsignado.modulos.length} />
          </div>
        )}

        {/* MÓDULOS COMPACTOS */}
        <div className="space-y-1.5">
          {busquedaCursoFallida && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-center">
              <p className="text-xs text-yellow-800 mb-2">No se encontró el curso con ID: <strong>{reservaActual.cursoId || '(vacío)'}</strong></p>
              <Button onClick={buscarCurso} variant="outline" icon={RefreshCw} className="!py-1.5 !text-xs bg-white">Reintentar búsqueda</Button>
            </div>
          )}
          {!busquedaCursoFallida && cursoAsignado.nombre && cursoAsignado.modulos.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">El plan de estudios de este curso aún no ha sido configurado.</p>
          )}
          {cursoAsignado.modulos.map((mod, i) => {
            const dayDone = (reservaActual.modulosEstado || {})[mod];
            return (
              <div key={i} className={`bg-white p-3 rounded-xl shadow-sm border flex items-center gap-2 transition-all ${dayDone ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
                <div className={`p-1.5 rounded-full flex-shrink-0 ${dayDone ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {dayDone ? <Check size={14} /> : <Clock size={14} />}
                </div>
                <div className="flex-1">
                  <span className={`font-bold text-xs ${dayDone ? 'text-green-900' : 'text-gray-800'}`}>{mod}</span>
                  {dayDone && <p className="text-[10px] font-bold text-green-700">{dayDone}</p>}
                </div>
                <span className={`text-[10px] font-black uppercase ${dayDone ? 'text-green-600' : 'text-gray-400'}`}>{dayDone ? 'Superado' : 'Pendiente'}</span>
              </div>
            );
          })}
        </div>

        {reservaActual.estadoCurso === 'Aprobado' && (
          <Button variant="success" className="mt-3" icon={Award}>Descargar Certificado</Button>
        )}
      </div>
    </AppShell>
  );
};

export default EstudiantePanel;
