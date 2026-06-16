// @build: 2026-06-18.03-30-00 | id: SISTEMA | desc: EstudiantePanel refactorizado con AppShell y useToast
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { useToast } from '../modules/shared/components/ToastProvider';
import AppShell from '../modules/shared/components/AppShell';
import { Button, ProgressBar, Spinner } from '../components/UI';
import { LogOut, AlertCircle, Check, Clock, Award, RefreshCw } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

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
  const reservaContext = reservas.find(r => String(r.userId) === String(uid) && r.estadoPago !== 'Rechazado');

  useEffect(() => {
    if (!uid) return;
    if (reservaContext) {
      setIsSearching(false);
      return;
    }
    const obtenerReserva = async () => {
      try {
        const reservasRef = collection(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'reservas');
        const q = query(reservasRef, where('userId', '==', String(uid)));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setLocalReserva(snapshot.docs[0].data());
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
      <div className="p-5">
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden mb-6">
          <p className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-1">{cursoAsignado.nombre || 'Curso'}</p>
          <h3 className="text-2xl font-black mb-4">{sedes.find(s => String(s.id) === String(reservaActual.sedeId))?.nombre || 'Sede'} - Moto {reservaActual.tipoMoto}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm bg-black/20 p-4 rounded-2xl mb-4">
            <div><span className="block text-blue-300 text-xs">Día 1</span><span className="font-bold">{reservaActual.fecha1}</span></div>
            <div><span className="block text-blue-300 text-xs">Día 2</span><span className="font-bold">{reservaActual.fecha2}</span></div>
            <div className="col-span-2 flex justify-between">
              <div><span className="block text-blue-300 text-xs">Hora Inicio</span><span className="font-bold">{horaInicio}</span></div>
              <div className="text-right"><span className="block text-blue-300 text-xs">Hora Fin</span><span className="font-bold">{horaFin}</span></div>
            </div>
          </div>
          <p className="text-xs text-blue-200"><span className="inline mr-1 mb-0.5">✔</span>Instructor: {inst ? inst.nombre : 'Asignando'}</p>
        </div>

        {reservaActual.estadoPago === 'Rechazado' && (
          <div className="bg-red-100 border border-red-200 p-4 rounded-2xl flex flex-col gap-3 mb-6 shadow-sm">
            <div className="flex gap-3 items-start">
              <AlertCircle className="text-red-600 mt-1 flex-shrink-0" size={24} />
              <div><h4 className="font-bold text-red-900">Pago Rechazado</h4><p className="text-sm text-red-800">No pudimos validar tu referencia. Tienes 20 minutos para corregirla antes de perder el cupo.</p></div>
            </div>
            <div className="w-full flex gap-2 mt-2">
              <input type="number" placeholder="Nueva Ref" className="flex-1 p-2 rounded-xl border border-red-200 text-sm outline-none bg-white font-bold text-center" id="nuevaRef" maxLength="4" />
              <Button type="button" variant="dark" className="!w-auto !py-2 !px-4 !text-xs" onClick={async () => {
                const ref = document.getElementById('nuevaRef').value;
                if (ref.length !== 4) return showToast('Debe tener 4 dígitos', 'error');
                await saveReserva({ ...reservaActual, pagoRef: ref, estadoPago: 'Pendiente' });
                showToast('Referencia enviada', 'success');
              }}>Actualizar</Button>
            </div>
          </div>
        )}

        {reservaActual.estadoPago === 'Pendiente' && (
          <div className="bg-orange-100 border border-orange-200 p-4 rounded-2xl flex gap-3 mb-6 items-start shadow-sm">
            <AlertCircle className="text-orange-600 mt-1 flex-shrink-0" size={24} />
            <div><h4 className="font-bold text-orange-900">Validando Pago</h4><p className="text-sm text-orange-800">Verificando tu transferencia (Ref: {reservaActual.pagoRef}). El cupo está apartado.</p></div>
          </div>
        )}

        {reservaActual.estadoPago === 'Aprobado' && (
          <div className="bg-green-100 border border-green-200 p-4 rounded-2xl flex gap-3 mb-6 items-start shadow-sm">
            <Check className="text-green-600 mt-1 flex-shrink-0" size={24} />
            <div><h4 className="font-bold text-green-900">Pago Aprobado</h4><p className="text-sm text-green-800">Tu pago ha sido validado. ¡Comienza tu curso!</p></div>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Avance Académico</h3>
          <ProgressBar completados={cantCompletados} total={cursoAsignado.modulos.length} />
        </div>

        <div className="space-y-3">
          {busquedaCursoFallida && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl text-center">
              <p className="text-sm text-yellow-800 mb-2">No se encontró el curso con ID: <strong>{reservaActual.cursoId || '(vacío)'}</strong></p>
              <p className="text-xs text-yellow-700 mb-3">Esto puede deberse a que el curso fue eliminado o a que la reserva se creó antes de la corrección del flujo de registro.</p>
              <Button onClick={buscarCurso} variant="outline" icon={RefreshCw} className="!py-2 !text-xs bg-white">Reintentar búsqueda</Button>
            </div>
          )}
          {!busquedaCursoFallida && cursoAsignado.nombre && cursoAsignado.modulos.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">El plan de estudios de este curso aún no ha sido configurado. Pronto estará disponible.</p>
          )}
          {cursoAsignado.modulos.map((mod, i) => {
            const dayDone = (reservaActual.modulosEstado || {})[mod];
            return (
              <div key={i} className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-3 transition-all ${dayDone ? 'border-green-200 bg-green-50' : 'border-gray-100 opacity-80'}`}>
                <div className={`p-2 rounded-full flex-shrink-0 ${dayDone ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {dayDone ? <Check size={16} /> : <Clock size={16} />}
                </div>
                <div className="flex-1">
                  <span className={`font-bold text-sm ${dayDone ? 'text-green-900' : 'text-gray-800'}`}>{mod}</span>
                  {dayDone && <p className="text-[10px] font-bold text-green-700 mt-0.5">Superado en: {dayDone}</p>}
                </div>
                <span className={`text-[10px] font-black uppercase ${dayDone ? 'text-green-600' : 'text-gray-400'}`}>{dayDone ? 'Superado' : 'Pendiente'}</span>
              </div>
            );
          })}
        </div>

        {reservaActual.estadoCurso === 'Aprobado' && (
          <Button variant="success" className="mt-6" icon={Award}>Descargar Certificado</Button>
        )}
      </div>
    </AppShell>
  );
};

export default EstudiantePanel;
