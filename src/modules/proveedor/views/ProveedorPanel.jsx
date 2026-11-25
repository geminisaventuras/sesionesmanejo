import { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Spinner } from '../../../components/UI';
import { LogOut, Bike, DollarSign, Home, Calendar, AlertTriangle, Wallet, Bell } from 'lucide-react';
import ProveedorMotos from '../components/ProveedorMotos';
import ProveedorAgenda from '../components/ProveedorAgenda';
import ProveedorFinanzasTab from '../components/ProveedorFinanzasTab';
import ProveedorDeudasModal from '../components/ProveedorDeudasModal';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { construirAsignacionesProveedor } from '../../shared/utils/finanzasHelpers';
import { fechaVetHoy } from '../../shared/utils/reservaHelpers';
import { reservaTieneDiaProximo } from '../utils/agendaProveedor';
import { DeudasProveedorService } from '../../shared/services/DeudasProveedorService';
import ModalCobrarDeuda from '../../admin/finance/ModalCobrarDeuda';
import { formatearMonto } from '../../shared/utils/currency';
const ProveedorPanel = () => {
  const { user, motos, config, isReservaActiva, logoutUser, notifications = [] } = useContext(AppContext);
const [ocupacionConfirmada, setOcupacionConfirmada] = useState([]);
const [ocupacionReposicion, setOcupacionReposicion] = useState([]);
const [deudasProveedor, setDeudasProveedor] = useState([]);
const [solicitudesPago, setSolicitudesPago] = useState([]);
const [deudaPago, setDeudaPago] = useState(null);
const [deudasAbiertas, setDeudasAbiertas] = useState(false);
const cerrarDeudas = useCallback(() => setDeudasAbiertas(false), []);
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

  const hoy = fechaVetHoy();

  const { activas, completadas, gananciaCobrada, gananciaPorCobrar } = useMemo(() => {
    const act = misReservas.filter(r => (
      isReservaActiva(r) &&
      r.estadoCurso !== 'Aprobado' &&
      r.estadoCurso !== 'Cancelado' &&
      reservaTieneDiaProximo(r, hoy, user?.uid)
    ));
    const comp = misReservas.filter(r => r.estadoCurso === 'Aprobado' && r.estadoPago !== 'Cancelado');
    let cobrada = 0;
    let porCobrar = 0;

    misReservas.forEach((r) => {
      if (r.estadoPago !== 'Aprobado') return;
      if (r.estadoCurso === 'Cancelado') return;
      construirAsignacionesProveedor(r, config)
        .filter(a => String(a.proveedorId) === String(user?.uid))
        .forEach((a) => {
          if (a.pagado) cobrada += Number(a.monto) || 0;
          else porCobrar += Number(a.monto) || 0;
        });
    });

    return { activas: act, completadas: comp, gananciaCobrada: cobrada, gananciaPorCobrar: porCobrar };
  }, [misReservas, isReservaActiva, config, user?.uid, hoy]);

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
      const activasMoto = reservasMoto.filter(r => (
        isReservaActiva(r) &&
        r.estadoCurso !== 'Aprobado' &&
        r.estadoCurso !== 'Cancelado' &&
        reservaTieneDiaProximo(r, hoy, user?.uid)
      )).length;
      const completadasMoto = reservasMoto.filter(r => r.estadoCurso === 'Aprobado' && r.estadoPago !== 'Cancelado').length;
      const totalMoto = reservasMoto.filter(r => r.estadoCurso !== 'Cancelado').length;
      return { ...moto, activas: activasMoto, completadas: completadasMoto, total: totalMoto };
    });
  }, [misMotos, misReservas, isReservaActiva, hoy, user?.uid]);

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

  if (!user) return <Spinner message="Cargando perfil..." />;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
      <div className="bg-[#0f172a] text-white px-6 pt-10 pb-6 rounded-b-[40px] shrink-0 z-20 shadow-lg flex justify-between items-center">
        <div><h1 className="text-2xl font-black tracking-tight uppercase">Mi Flota</h1><p className="text-slate-400 text-xs mt-0.5">{user?.data?.nombre || 'Proveedor'}</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/notificaciones')} className="relative w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors shadow-inner" aria-label="Notificaciones">
            <Bell size={19} className="text-gray-300" />
            {notifications.filter((n) => !n.leida).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notifications.filter((n) => !n.leida).length > 9 ? '9+' : notifications.filter((n) => !n.leida).length}
              </span>
            )}
          </button>
          <button onClick={handleLogout} className="w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors shadow-inner" aria-label="Cerrar sesión"><LogOut size={20} className="text-gray-300 ml-1" /></button>
        </div>
      </div>
      <div className={`flex-1 min-h-0 p-6 pb-6 ${tab === 'inicio' || tab === 'calendario' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto space-y-6'}`}>
        {tab === 'inicio' && (
          <div className="flex min-h-0 flex-1 flex-col gap-2.5">
            <div className="shrink-0 rounded-3xl bg-green-600 p-3.5 text-white shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-green-200">Comisión cobrada</p>
                  <h2 className="break-words text-2xl font-black tabular-nums">
                    {formatearMonto(gananciaCobrada, config.monedaPagoStaff)}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('finanzas')}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[10px] font-bold hover:bg-white/25"
                >
                  <Wallet size={12} /> Finanzas
                </button>
              </div>
              <p className="mt-1.5 max-w-full truncate rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">
                Por cobrar: {formatearMonto(gananciaPorCobrar, config.monedaPagoStaff)}
              </p>
            </div>

            {deudaTotal > 0 && (
              <button
                type="button"
                onClick={() => setDeudasAbiertas(true)}
                className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-2.5 text-left"
              >
                <AlertTriangle size={18} className="shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase text-red-700">Deuda con la app</p>
                  <p className="truncate text-[11px] font-bold tabular-nums text-red-600">
                    {formatearMonto(deudaTotal, config.monedaPagoStaff)}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg border border-red-200 bg-white px-2 py-1 text-[10px] font-bold text-red-700">
                  Ver
                </span>
              </button>
            )}

            <div className="grid shrink-0 grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTab('calendario')}
                className="rounded-2xl border border-gray-100 bg-white p-2.5 text-left shadow-sm hover:border-blue-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-gray-500">Próximas</span>
                  <Calendar size={14} className="text-blue-500" />
                </div>
                <p className="mt-0.5 text-xl font-black tabular-nums text-gray-900">{activas.length}</p>
                <p className="text-[9px] text-gray-400">Ver agenda</p>
              </button>
              <button
                type="button"
                onClick={() => setTab('finanzas')}
                className="rounded-2xl border border-gray-100 bg-white p-2.5 text-left shadow-sm hover:border-green-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-gray-500">Completadas</span>
                  <DollarSign size={14} className="text-green-500" />
                </div>
                <p className="mt-0.5 text-xl font-black tabular-nums text-gray-900">{completadas.length}</p>
                <p className="text-[9px] text-gray-400">Ver finanzas</p>
              </button>
            </div>

            <section className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1.5 flex shrink-0 items-center justify-between">
                <h2 className="text-[10px] font-black uppercase tracking-wider text-gray-500">Uso de motos</h2>
                <span className="text-[9px] text-gray-400">
                  {usoPorMoto.length} {usoPorMoto.length === 1 ? 'moto' : 'motos'}
                </span>
              </div>
              {usoPorMoto.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-500">
                  No tienes motos registradas.
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 items-start gap-2 overflow-x-auto pb-1">
                  {usoPorMoto.map((moto) => (
                    <div
                      key={moto.id}
                      className="flex min-w-[160px] max-w-[180px] flex-col rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                          <Bike size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-gray-900">{moto.marca} {moto.modelo}</p>
                          <p className="truncate text-[9px] text-gray-500">{moto.tipo} · {moto.cilindrada}</p>
                        </div>
                      </div>
                      <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2 text-center">
                        <div className="rounded-lg bg-blue-50 py-1">
                          <p className="text-sm font-black tabular-nums text-blue-700">{moto.activas}</p>
                          <p className="text-[8px] uppercase text-blue-600">Próximas</p>
                        </div>
                        <div className="rounded-lg bg-green-50 py-1">
                          <p className="text-sm font-black tabular-nums text-green-700">{moto.completadas}</p>
                          <p className="text-[8px] uppercase text-green-600">Completadas</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
        {tab === 'motos' && <ProveedorMotos />}
        {tab === 'calendario' && (
          <ProveedorAgenda reservas={misReservas} cargandoReservas={cargandoOcupacion} />
        )}
        {tab === 'finanzas' && (
          <ProveedorFinanzasTab reservas={misReservas} user={user} config={config} />
        )}
      </div>
      <div className="bg-white border-t flex justify-around py-2.5">
        <button onClick={() => setTab('inicio')} aria-pressed={tab === 'inicio'} className={`flex flex-col items-center text-[10px] font-bold ${tab === 'inicio' ? 'text-blue-600' : 'text-gray-400'}`}><Home size={19} />Inicio</button>
        <button onClick={() => setTab('motos')} aria-pressed={tab === 'motos'} className={`flex flex-col items-center text-[10px] font-bold ${tab === 'motos' ? 'text-blue-600' : 'text-gray-400'}`}><Bike size={19} />Motos</button>
        <button onClick={() => setTab('calendario')} aria-pressed={tab === 'calendario'} className={`flex flex-col items-center text-[10px] font-bold ${tab === 'calendario' ? 'text-blue-600' : 'text-gray-400'}`}><Calendar size={19} />Agenda</button>
        <button onClick={() => setTab('finanzas')} aria-pressed={tab === 'finanzas'} className={`flex flex-col items-center text-[10px] font-bold ${tab === 'finanzas' ? 'text-blue-600' : 'text-gray-400'}`}><Wallet size={19} />Finanzas</button>
        {user?.data?.capacidades?.movilidad === true && (
          <button onClick={() => navigate('/movilidad')} aria-label="Abrir movilidad" className="flex flex-col items-center text-[10px] font-bold text-gray-400"><Bike size={19} />Movilidad</button>
        )}
      </div>

      {deudasAbiertas && (
        <ProveedorDeudasModal
          deudas={deudasProveedor}
          solicitudes={solicitudesPago}
          moneda={config.monedaPagoStaff}
          onPagar={(deuda) => {
            setDeudasAbiertas(false);
            setDeudaPago(deuda);
          }}
          onCerrar={cerrarDeudas}
        />
      )}

      {deudaPago && (
        <ModalCobrarDeuda
          deuda={deudaPago}
          proveedorNombre={
            `${user?.data?.nombre || user?.nombre || ''} ${user?.data?.apellido || user?.apellido || ''}`.trim()
            || user?.data?.email || user?.email || 'Proveedor'
          }
          modo="solicitud"
          onClose={() => setDeudaPago(null)}
          onSuccess={() => setDeudaPago(null)}
        />
      )}
    </div>
  );
};

export default ProveedorPanel;