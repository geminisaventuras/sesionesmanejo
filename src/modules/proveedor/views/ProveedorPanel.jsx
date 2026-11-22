import { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Spinner } from '../../../components/UI';
import { LogOut, Bike, DollarSign, Activity, Clock, Calendar, BookOpen, AlertTriangle } from 'lucide-react';
import ProveedorMotos from '../components/ProveedorMotos';
import ProveedorCalendario from '../components/ProveedorCalendario';
import ProveedorActividad from '../components/ProveedorActividad';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { construirAsignacionesProveedor } from '../../shared/utils/finanzasHelpers';
import { DeudasProveedorService } from '../../shared/services/DeudasProveedorService';
import ModalCobrarDeuda from '../../admin/finance/ModalCobrarDeuda';
import { formatearMonto } from '../../shared/utils/currency';
const ProveedorPanel = () => {
  const { user, motos, config, isReservaActiva, logoutUser } = useContext(AppContext);
const [ocupacionConfirmada, setOcupacionConfirmada] = useState([]);
const [ocupacionReposicion, setOcupacionReposicion] = useState([]);
const [deudasProveedor, setDeudasProveedor] = useState([]);
const [solicitudesPago, setSolicitudesPago] = useState([]);
const [deudaPago, setDeudaPago] = useState(null);
const [cargandoOcupacion, setCargandoOcupacion] = useState(true);

useEffect(() => {
  if (!user?.uid) {
    setOcupacionConfirmada([]);
    setOcupacionReposicion([]);
    setCargandoOcupacion(false);
    return;
  }

  // D2-FINANZAS: el proveedor de reposición también debe ver la reserva y su D2.
  setCargandoOcupacion(true);
  const base = collection(db, 'ocupacionConfirmada');
  const q1 = query(base, where('proveedorId', '==', user.uid), limit(500));
  const q2 = query(base, where('proveedorReposicionId', '==', user.uid), limit(500));
  let cargadas = 0;

  const marcarCargada = () => {
    cargadas += 1;
    if (cargadas >= 2) setCargandoOcupacion(false);
  };

  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      setOcupacionConfirmada(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      marcarCargada();
    },
    (error) => {
      console.error('[ProveedorPanel] Error en onSnapshot proveedorId:', error);
      setOcupacionConfirmada([]);
      marcarCargada();
    }
  );

  const unsub2 = onSnapshot(
    q2,
    (snapshot) => {
      setOcupacionReposicion(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      marcarCargada();
    },
    (error) => {
      console.error('[ProveedorPanel] Error en onSnapshot proveedorReposicionId:', error);
      setOcupacionReposicion([]);
      marcarCargada();
    }
  );

  return () => {
    unsub1();
    unsub2();
  };
}, [user?.uid]);

useEffect(() => {
  if (!user?.uid) {
    setDeudasProveedor([]);
    return () => {};
  }
  return DeudasProveedorService.suscribirDeudasProveedor(user.uid, (data) => {
    setDeudasProveedor(data || []);
  });
}, [user?.uid]);

useEffect(() => {
  if (!user?.uid) {
    setSolicitudesPago([]);
    return () => {};
  }
  return DeudasProveedorService.suscribirSolicitudesProveedor(user.uid, (data) => {
    setSolicitudesPago(data || []);
  });
}, [user?.uid]);

const navigate = useNavigate();
  const [tab, setTab] = useState('inicio');

  const misMotos = useMemo(() => {
    if (!user?.uid) return [];
    const uid = String(user.uid);
    return (motos || []).filter(m => String(m.proveedorId) === uid);
  }, [motos, user?.uid]);

  // Sustituimos reservas (privada) por ocupacionConfirmada (pública con proveedorId)
  const misReservas = useMemo(() => {
    if (!user?.uid) return [];
    const uid = String(user.uid);
    const mapa = new Map();
    [...(ocupacionConfirmada || []), ...(ocupacionReposicion || [])].forEach((r) => {
      if (String(r.proveedorId) !== uid && String(r.proveedorReposicionId) !== uid) return;
      mapa.set(String(r.id), r);
    });
    return Array.from(mapa.values());
  }, [ocupacionConfirmada, ocupacionReposicion, user?.uid]);

  const { activas, completadas, gananciaCobrada, gananciaPorCobrar } = useMemo(() => {
    const act = misReservas.filter(r => isReservaActiva(r) && r.estadoCurso !== 'Aprobado');
    const comp = misReservas.filter(r => r.estadoCurso === 'Aprobado');
    let cobrada = 0;
    let porCobrar = 0;

    misReservas.forEach((r) => {
      if (r.estadoPago !== 'Aprobado') return;
      construirAsignacionesProveedor(r, config)
        .filter(a => String(a.proveedorId) === String(user?.uid))
        .forEach((a) => {
          if (a.pagado) cobrada += Number(a.monto) || 0;
          else porCobrar += Number(a.monto) || 0;
        });
    });

    return { activas: act, completadas: comp, gananciaCobrada: cobrada, gananciaPorCobrar: porCobrar };
  }, [misReservas, isReservaActiva, config, user?.uid]);

  const deudaTotal = useMemo(
    () => (deudasProveedor || []).reduce((acc, d) => acc + (Number(d.saldo) || 0), 0),
    [deudasProveedor]
  );

  const usoPorMoto = useMemo(() => {
    return misMotos.map(moto => {
      const reservasMoto = misReservas.filter(r =>
        String(r.motoAsignadaId) === String(moto.id) ||
        String(r.motoReposicionId) === String(moto.id)
      );
      const activasMoto = reservasMoto.filter(r => isReservaActiva(r) && r.estadoCurso !== 'Aprobado').length;
      const completadasMoto = reservasMoto.filter(r => r.estadoCurso === 'Aprobado').length;
      return { ...moto, activas: activasMoto, completadas: completadasMoto, total: reservasMoto.length };
    });
  }, [misMotos, misReservas, isReservaActiva]);

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

  if (!user) return <Spinner message="Cargando perfil..." />;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
      <div className="bg-[#0f172a] text-white px-6 pt-10 pb-6 rounded-b-[40px] shrink-0 z-20 shadow-lg flex justify-between items-center">
        <div><h1 className="text-2xl font-black tracking-tight uppercase">Mi Flota</h1><p className="text-slate-400 text-xs mt-0.5">{user?.data?.nombre || 'Proveedor'}</p></div>
        <button onClick={handleLogout} className="w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors shadow-inner"><LogOut size={20} className="text-gray-300 ml-1" /></button>
      </div>
      <div className="flex-1 p-6 overflow-y-auto pb-6 space-y-6">
        {tab === 'inicio' && (
          <>
            <div className="bg-green-600 text-white p-5 rounded-3xl shadow-xl"><p className="text-green-200 text-[10px] font-bold uppercase">Ingresos Cobrados</p><h2 className="text-3xl font-black break-words tabular-nums">{formatearMonto(gananciaCobrada, config.monedaPagoStaff)}</h2></div>
            {gananciaPorCobrar > 0 && (<div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center gap-3"><Clock size={20} className="text-orange-500" /><div><p className="text-sm font-bold text-orange-800">Por Cobrar</p><p className="text-lg font-black text-orange-600 break-words tabular-nums">{formatearMonto(gananciaPorCobrar, config.monedaPagoStaff)}</p></div></div>)}
            {deudaTotal > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800">Deuda con la app</p>
                    <p className="text-lg font-black text-red-600 break-words tabular-nums">{formatearMonto(deudaTotal, config.monedaPagoStaff)}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {deudasProveedor.slice(0, 5).map((deuda) => {
                    const solicitudPendiente = solicitudesPago.some((s) => s.deudaId === deuda.id);
                    return (
                      <div key={deuda.id} className="flex items-center justify-between gap-2 text-[10px] text-red-700">
                        <span className="truncate">
                          Reserva {deuda.reservaId || '—'} · {formatearMonto(deuda.saldo, config.monedaPagoStaff)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeudaPago(deuda)}
                          disabled={solicitudPendiente}
                          className={`shrink-0 rounded-lg px-2 py-1 font-bold ${
                            solicitudPendiente
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-white text-red-700 border border-red-200'
                          }`}
                        >
                          {solicitudPendiente ? 'En revisión' : 'Pagar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-red-600 mt-2">Se descuenta automáticamente de tus próximos pagos.</p>
              </div>
            )}
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">Motos en Uso</h2>
            {usoPorMoto.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No tienes motos registradas.</p>}
            {usoPorMoto.map(moto => (
              <div key={moto.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-3"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400"><Bike size={24} /></div><div><h3 className="font-black text-lg text-gray-900">{moto.marca} {moto.modelo}</h3><p className="text-xs text-gray-500">{moto.tipo} · {moto.cilindrada}</p></div></div>
                <div className="grid grid-cols-2 gap-3 text-center"><div className="bg-blue-50 p-3 rounded-xl"><p className="text-2xl font-black text-blue-700">{moto.activas}</p><p className="text-[10px] text-blue-600 uppercase">En Progreso</p></div><div className="bg-green-50 p-3 rounded-xl"><p className="text-2xl font-black text-green-700">{moto.completadas}</p><p className="text-[10px] text-green-600 uppercase">Completadas</p></div></div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              {/* Tarjeta "Clases Activas" ahora es un botón que lleva a la pestaña Actividad */}
              <button
                onClick={() => setTab('actividad')}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center hover:border-blue-300 transition-colors active:scale-[0.98] cursor-pointer"
              >
                <Activity size={20} className="text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-black text-gray-900">{activas.length}</p>
                <p className="text-[10px] text-gray-500 uppercase">Proximas</p>
              </button>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center"><DollarSign size={20} className="text-green-500 mx-auto mb-1" /><p className="text-2xl font-black text-gray-900">{completadas.length}</p><p className="text-[10px] text-gray-500 uppercase">Completadas</p></div>
            </div>
          </>
        )}
        {tab === 'motos' && <ProveedorMotos />}
        {tab === 'calendario' && <ProveedorCalendario />}
        {tab === 'actividad' && <ProveedorActividad />}
      </div>
      <div className="bg-white border-t flex justify-around py-3">
        <button onClick={() => setTab('inicio')} className={`flex flex-col items-center text-xs font-bold ${tab === 'inicio' ? 'text-blue-600' : 'text-gray-400'}`}><Activity size={20} />Inicio</button>
        <button onClick={() => setTab('motos')} className={`flex flex-col items-center text-xs font-bold ${tab === 'motos' ? 'text-blue-600' : 'text-gray-400'}`}><Bike size={20} />Motos</button>
        <button onClick={() => setTab('calendario')} className={`flex flex-col items-center text-xs font-bold ${tab === 'calendario' ? 'text-blue-600' : 'text-gray-400'}`}><Calendar size={20} />Calendario</button>
        <button onClick={() => setTab('actividad')} className={`flex flex-col items-center text-xs font-bold ${tab === 'actividad' ? 'text-blue-600' : 'text-gray-400'}`}><BookOpen size={20} />Actividad</button>
      </div>

      {deudaPago && (
        <ModalCobrarDeuda
          deuda={deudaPago}
          proveedorNombre={`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email || 'Proveedor'}
          modo="solicitud"
          onClose={() => setDeudaPago(null)}
          onSuccess={() => setDeudaPago(null)}
        />
      )}
    </div>
  );
};

export default ProveedorPanel;