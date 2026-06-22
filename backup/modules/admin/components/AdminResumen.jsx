// @build: 2026-06-22 | id: DASHBOARD-INDEPENDIENTE | desc: Panel principal del administrador como página independiente
import { useContext, useEffect, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Award, Bike, Settings, DollarSign, TrendingUp, Calendar,
  Bell, AlertCircle, User, Users, BookOpen, Wallet, Activity
} from 'lucide-react';

const TarjetaResumen = memo(({ titulo, valor, color, onClick, icon: Icon }) => (
  <div onClick={onClick} className={`${color} text-white p-4 rounded-2xl shadow-lg cursor-pointer hover:opacity-90 transition-all active:scale-[0.98] relative overflow-hidden`}>
    <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full blur-2xl transform translate-x-5 -translate-y-5"></div>
    <div className="flex items-center gap-3">
      {Icon && <Icon size={24} className="text-white/80" />}
      <div>
        <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{titulo}</p>
        <h2 className="text-3xl font-black">{valor}</h2>
      </div>
    </div>
  </div>
));

const CursoCompletado = memo(({ reserva, instructorNombre }) => (
  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div><p className="font-bold text-sm text-gray-900">{reserva.nombre} {reserva.apellido}</p><p className="text-xs text-gray-500">Inst: {instructorNombre}</p></div>
    <Award size={20} className="text-green-500" />
  </div>
));

const MiniGraficoBarras = memo(({ datos }) => (
  <div className="flex items-end gap-1 h-16 mt-2">
    {datos.map((d, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-1">
        <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(4, (d.valor / (Math.max(...datos.map(x => x.valor), 1))) * 40)}px` }}></div>
        <span className="text-[8px] text-gray-500">{d.label}</span>
      </div>
    ))}
  </div>
));

const BannerAlertas = memo(({ alertas }) => {
  if (!alertas || alertas.length === 0) return null;
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl space-y-2">
      <div className="flex items-center gap-2 text-yellow-800"><Bell size={16} /><span className="text-sm font-bold">Alertas</span></div>
      {alertas.map((a, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-yellow-700">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{a.mensaje}</span>
        </div>
      ))}
    </div>
  );
});

const ResumenTabla = memo(({ titulo, items, renderItem, vacio }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
    <h3 className="font-bold text-gray-900 text-sm mb-3">{titulo}</h3>
    {items.length === 0 ? <p className="text-xs text-gray-500 text-center py-4">{vacio || 'Sin datos'}</p> : items.map(renderItem)}
  </div>
));

const AdminResumen = () => {
  const { reservas, instructores, sedes, motos, horarios, config, cleanExpiredLocks, seedDatabase, user, logoutUser } = useContext(AppContext);
  const navigate = useNavigate();
  const res = reservas || [];
  const instrs = instructores || [];
  const motosList = motos || [];
  const hor = horarios || [];

  useEffect(() => { if (cleanExpiredLocks) cleanExpiredLocks().catch(() => {}); }, [cleanExpiredLocks]);

  const completados = useMemo(() => res.filter(r => r.estadoCurso === 'Aprobado').slice(-5).reverse(), [res]);

  const ingresosMes = useMemo(() => {
    const ahora = new Date();
    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();
    return res.filter(r => r.estadoPago === 'Aprobado' && r.fecha && new Date(r.fecha).getMonth() === mes && new Date(r.fecha).getFullYear() === anio)
      .reduce((acc, r) => acc + (Number(r.pagoTotalMoneda) || 0), 0);
  }, [res]);

  const hoyStr = new Date().toISOString().split('T')[0];
  const bloquesOcupadosHoy = useMemo(() => {
    const activas = res.filter(r => (r.estadoPago === 'Aprobado' || r.estadoPago === 'Pendiente') && (r.fecha === hoyStr || r.fecha2 === hoyStr));
    return activas.length;
  }, [res, hoyStr]);
  const totalBloques = hor.filter(h => h.activo && !h.isLunch).length;
  const instrActivos = instrs.filter(i => i.activo).length;

  const datosGrafico = useMemo(() => {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fechaStr = d.toISOString().split('T')[0];
      const total = res.filter(r => r.estadoPago === 'Aprobado' && (r.fecha === fechaStr || r.fecha2 === fechaStr)).reduce((acc, r) => acc + (Number(r.pagoTotalMoneda) || 0), 0);
      dias.push({ label: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), valor: total });
    }
    return dias;
  }, [res]);

  const alertas = useMemo(() => {
    const lista = [];
    const ahora = Date.now();
    const pendientesViejas = res.filter(r => r.estadoPago === 'Pendiente' && r.createdAt && (ahora - r.createdAt.toMillis?.() > 86400000));
    if (pendientesViejas.length > 0) lista.push({ mensaje: `${pendientesViejas.length} reservas pendientes por más de 24 horas.` });
    const sinInstructor = res.filter(r => (r.estadoPago === 'Aprobado' || r.estadoPago === 'Pendiente') && !r.instructorId);
    if (sinInstructor.length > 0) lista.push({ mensaje: `${sinInstructor.length} cursos sin instructor asignado.` });
    const motosInactivas = motosList.filter(m => !m.activo).length;
    if (motosInactivas > 0) lista.push({ mensaje: `${motosInactivas} motos inactivas.` });
    return lista;
  }, [res, motosList]);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

const { notifications } = useContext(AppContext);
const header = <DashboardHeader title="Panel Administrativo" onLogout={handleLogout} notifications={notifications} />;  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="inicio"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest px-1">Panel Administrativo</h2>
        {sedes?.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl mb-2 shadow-sm text-xs font-bold text-yellow-800">
            ¿El sistema está en blanco? <button onClick={seedDatabase} className="underline ml-2">Inicializar Base de Datos</button>
          </div>
        )}

        <BannerAlertas alertas={alertas} />

        <div className="grid grid-cols-2 gap-2">
          <TarjetaResumen titulo="Ingresos Mes" valor={`${config.monedaPagoStaff || 'USD'} ${ingresosMes}`} color="bg-emerald-700" icon={DollarSign} />
          <TarjetaResumen titulo="Ocupación Hoy" valor={`${bloquesOcupadosHoy}/${totalBloques}`} color="bg-orange-600" icon={Calendar} />
          <TarjetaResumen titulo="Instructores" valor={instrActivos} color="bg-purple-700" icon={Users} />
          <TarjetaResumen titulo="Motos" valor={motosList.length} color="bg-teal-700" icon={Bike} />
        </div>

        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 text-xs mb-1 flex items-center gap-2"><TrendingUp size={14} className="text-blue-600" />Ingresos últimos 7 días</h3>
          <MiniGraficoBarras datos={datosGrafico} />
        </div>

        <div>
          <h3 className="font-bold text-gray-900 text-sm border-b pb-2">Últimos Cursos Completados</h3>
          <div className="mt-2 space-y-2">
            {completados.map(r => <CursoCompletado key={r.id} reserva={r} instructorNombre={instrs.find(i => String(i.id) === String(r.instructorId))?.nombre || 'N/A'} />)}
            {completados.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No hay cursos completados aún.</p>}
          </div>
        </div>

        <ResumenTabla titulo="Instructores" items={instrs} vacio="No hay instructores registrados"
          renderItem={(i) => (
            <div key={i.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2"><User size={14} className="text-gray-400" /><span className="text-xs font-medium">{i.nombre} {i.apellido || ''}</span></div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${i.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{i.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
          )}
        />
        <ResumenTabla titulo="Motos" items={motosList} vacio="No hay motos registradas"
          renderItem={(m) => (
            <div key={m.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2"><Bike size={14} className="text-gray-400" /><span className="text-xs font-medium">{m.marca} {m.modelo} ({m.tipo})</span></div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{m.activo ? 'Disponible' : 'Inactiva'}</span>
            </div>
          )}
        />
      </div>
    </AppShell>
  );
};

export default AdminResumen;