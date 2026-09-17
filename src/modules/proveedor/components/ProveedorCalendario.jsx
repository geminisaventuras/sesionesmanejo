import { useState, useEffect, useContext, useMemo } from 'react';
import { useToast } from '../../shared/components/ToastProvider';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import { Trash2, Plus } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useProveedorBloqueos } from '../../../hooks/useProveedorBloqueos';
import ProveedorMiniCalendario from './ProveedorMiniCalendario';

const ProveedorCalendario = () => {
  const { user, motos } = useContext(AppContext);
  const { showToast } = useToast();
const { bloqueos, loading, invalidarCache, recargar } = useProveedorBloqueos(user?.uid);
const [ocupacionConfirmada, setOcupacionConfirmada] = useState([]);

useEffect(() => {
  if (!user?.uid) {
    setOcupacionConfirmada([]);
    return;
  }
  let activo = true;
  const cargarOcupacion = async () => {
    try {
      const q = query(
        collection(db, 'ocupacionConfirmada'),
        where('proveedorId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      if (!activo) return;
      setOcupacionConfirmada(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('[ProveedorCalendario] Error cargando ocupación:', error);
      if (activo) setOcupacionConfirmada([]);
    }
  };
  cargarOcupacion();
  return () => { activo = false; };
}, [user?.uid]);  

  const [bloqueosDia, setBloqueosDia] = useState([]);
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [motoId, setMotoId] = useState('ALL');
  const [mesActual, setMesActual] = useState(new Date());

  const misMotos = useMemo(() => (motos || []).filter(m => String(m.proveedorId) === String(user?.uid)), [motos, user?.uid]);

  const misReservasActivas = useMemo(() => {
    return (ocupacionConfirmada || []).filter(r => {
      if (r.estadoPago === 'Cancelado') return false;
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      return r.proveedorId === user?.uid;
    });
  }, [ocupacionConfirmada, user?.uid]);

  useEffect(() => {
    if (!fecha) {
      setBloqueosDia([]);
      return;
    }
    const q = query(collection(db, 'bloqueosGlobales'), where('fecha', '==', fecha));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBloqueosDia(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [fecha]);

   const handleCrear = async () => {
    if (!fecha || !horaInicio || !horaFin) {
      showToast('Completa todos los campos', 'error');
      return;
    }
    await addDoc(collection(db, 'bloqueosGlobales'), {
      proveedorId: user.uid,
      motoId,
      fecha,
      horaInicio,
      horaFin,
      createdAt: new Date()
    });
    showToast('Bloqueo creado', 'success');
    invalidarCache();
    await recargar();
  };
   const handleEliminar = async (id) => {
    await deleteDoc(doc(db, 'bloqueosGlobales', id));
    showToast('Bloqueo eliminado', 'success');
    invalidarCache();
    await recargar();
  };

  const handleClickDia = (dia) => {
    const fechaISO = dia.toISOString().split('T')[0];
    setFecha(fechaISO);
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Cargando calendario...</div>;
  }

  return (
    <div className="space-y-4">
      <ProveedorMiniCalendario
        bloqueos={bloqueos}
        reservas={misReservasActivas}
        mesActual={mesActual}
        onFechaClick={handleClickDia}
      />

      <h2 className="text-lg font-black text-gray-900 uppercase">Crear Bloqueo</h2>
      <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full bg-gray-50 border rounded-xl py-2 px-3" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Inicio</label>
            <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="w-full bg-gray-50 border rounded-xl py-2 px-3" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Fin</label>
            <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="w-full bg-gray-50 border rounded-xl py-2 px-3" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Moto</label>
          <select value={motoId} onChange={e => setMotoId(e.target.value)} className="w-full bg-gray-50 border rounded-xl py-2 px-3">
            <option value="ALL">Todas mis motos</option>
            {misMotos.map(m => <option key={m.id} value={m.id}>{m.marca} {m.modelo}</option>)}
          </select>
        </div>
        <Button onClick={handleCrear} icon={Plus}>Crear Bloqueo</Button>
      </div>
      <div>
        <h3 className="font-bold text-gray-700 mb-2">Bloqueos del día {fecha}</h3>
        {bloqueosDia.length === 0 && <p className="text-sm text-gray-500">No hay bloqueos para esta fecha.</p>}
        {bloqueosDia.map(b => (
          <div key={b.id} className="bg-white p-3 rounded-xl border mb-2 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold">{b.horaInicio} - {b.horaFin}</p>
              <p className="text-xs text-gray-500">Moto: {b.motoId === 'ALL' ? 'Todas' : misMotos.find(m => m.id === b.motoId)?.marca || b.motoId}</p>
            </div>
            <button onClick={() => handleEliminar(b.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProveedorCalendario;
