// @build: 2026-11-13 | id: ADMIN-RESUMEN-ENTERPRISE-V2 | desc: Fix de últimos completados reales + consulta específica
import { useContext, useState, useMemo, memo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { useToast } from '../../shared/components/ToastProvider';
import {
  Award, Bike, Settings, DollarSign, TrendingUp, Calendar,
  Bell, AlertCircle, Users, BookOpen, Wallet, Activity, Package, GraduationCap
} from 'lucide-react';
import { useAdminReservas } from '../hooks/useAdminReservas';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';

const APP_ID = 'motoescuela-pro-v1';

const TarjetaResumen = memo(({ titulo, valor, color, onClick, icon: Icon }) => (
  <div onClick={onClick} className={`${color} text-white p-4 rounded-2xl shadow-md cursor-pointer hover:opacity-90 transition-all active:scale-[0.98] relative overflow-hidden`}>
    <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{titulo}</p>
        {Icon && <Icon size={18} className="text-white/80" />}
      </div>
      <h2 className="text-2xl font-black">{valor}</h2>
    </div>
  </div>
));

const CursoCompletadoMini = memo(({ reserva, instructorNombre }) => (
  <div className="flex-shrink-0 w-24 bg-white p-2 rounded-xl shadow-sm border border-gray-100 text-center">
    <Award size={18} className="text-indigo-500 mx-auto mb-1" />
    <p className="text-[10px] font-bold text-gray-900 truncate">{reserva.nombre} {reserva.apellido?.charAt(0)}.</p>
    <p className="text-[9px] text-gray-500 truncate">{instructorNombre}</p>
  </div>
));

const MiniGraficoBarras = memo(({ datos }) => (
  <div className="flex items-end gap-1 h-16 mt-2">
    {datos.map((d, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-1">
        <div className="w-full bg-indigo-500 rounded-t transition-all" style={{ height: `${Math.max(4, (d.valor / (Math.max(...datos.map(x => x.valor), 1))) * 40)}px` }}></div>
        <span className="text-[8px] text-gray-500">{d.label}</span>
      </div>
    ))}
  </div>
));

const BannerAlertas = memo(({ alertas }) => {
  if (!alertas || alertas.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-2">
      <div className="flex items-center gap-2 text-amber-800"><Bell size={16} /><span className="text-sm font-bold">Alertas del Sistema</span></div>
      {alertas.map((a, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{a.mensaje}</span>
        </div>
      ))}
    </div>
  );
});

const AdminResumen = () => {
  const { instructores, sedes, motos, horarios, cursos, config, seedDatabase, user, logoutUser, notifications } = useContext(AppContext);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { reservas, cargando, error } = useAdminReservas();
  const [ultimosCompletados, setUltimosCompletados] = useState([]);

  const res = reservas || [];
  const instrs = instructores || [];
  const motosList = motos || [];
  const hor = horarios || [];
  const cursosList = cursos || [];

  // 1. Consulta específica para los últimos cursos completados REALES
  useEffect(() => {
    const cargarUltimos = async () => {
      try {
        const reservasRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservas');
        // Intentamos ordenar por updatedAt (requiere índice compuesto)
        const q = query(
          reservasRef,
          where('estadoCurso', '==', 'Aprobado'),
          orderBy('updatedAt', 'desc'),
          limit(4)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUltimosCompletados(docs);
      } catch (err) {
        console.warn('[AdminResumen] Fallback: sin índice compuesto o updatedAt faltante', err);
        // Fallback: traer todos los aprobados (hasta 20) y ordenar en memoria por updatedAt o createdAt
        try {
          const reservasRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservas');
          const q2 = query(
            reservasRef,
            where('estadoCurso', '==', 'Aprobado'),
            limit(20)
          );
          const snap2 = await getDocs(q2);
          const docs2 = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // Ordenar por updatedAt (o createdAt) descendente
          docs2.sort((a, b) => {
            const fechaA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
            const fechaB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
            return fechaB - fechaA;
          });
          
          setUltimosCompletados(docs2.slice(0, 4));
        } catch (err2) {
          console.error('[AdminResumen] Error en fallback:', err2);
        }
      }
    };
    cargarUltimos();
  }, []);

  // FIX-CONTABLE: Usar fecha de COMPRA (createdAt) para los ingresos, no la fecha del curso.
  const ingresosMes = useMemo(() => {
    const ahora = new Date();
    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();
    return res.filter(r => {
      if (r.estadoPago !== 'Aprobado') return false;
      const fecha = r.createdAt?.toDate?.() || (r.fecha ? new Date(r.fecha) : null);
      if (!fecha) return false;
      return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    }).reduce((acc, r) => acc + (Number(r.pagoTotalMoneda) || 0), 0);
  }, [res]);

  const hoyStr = new Date().toISOString().split('T')[0];
  const bloquesOcupadosHoy = useMemo(() => {
    const activas = res.filter(r => (r.estadoPago === 'Aprobado' || r.estadoPago === 'Pendiente') && (r.fecha === hoyStr || r.fecha2 === hoyStr));
    return activas.length;
  }, [res, hoyStr]);
  const totalBloques = hor.filter(h => h.activo && !h.isLunch).length;
  const instrActivos = instrs.filter(i => i.activo).length;

  // FIX-CONTABLE: Usar createdAt para el gráfico
  const datosGrafico = useMemo(() => {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fechaStr = d.toISOString().split('T')[0];
      const total = res.filter(r => {
        if (r.estadoPago !== 'Aprobado') return false;
        const fecha = r.createdAt?.toDate?.() || (r.fecha ? new Date(r.fecha) : null);
        return fecha && fecha.toISOString().split('T')[0] === fechaStr;
      }).reduce((acc, r) => acc + (Number(r.pagoTotalMoneda) || 0), 0);
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

  // --- MÉTRICAS DEL NEGOCIO ---
  const getTipo = (r) => {
    if (r.tipoCurso) return r.tipoCurso;
    const c = cursosList.find(x => String(x.id) === String(r.cursoId));
    return c?.tipoCurso || r.cursoId;
  };

  const cursoMasVendido = useMemo(() => {
    const conteo = {};
    res.forEach(r => {
      if (r.estadoPago === 'Aprobado' || r.estadoPago === 'Pendiente') {
        const tipo = getTipo(r);
        if (tipo) conteo[tipo] = (conteo[tipo] || 0) + 1;
      }
    });
    let maxTipo = null;
    let maxCount = 0;
    Object.entries(conteo).forEach(([tipo, count]) => {
      if (count > maxCount) { maxCount = count; maxTipo = tipo; }
    });
    if (!maxTipo) return { nombre: 'Sin datos', count: 0 };
    const cursoObj = cursosList.find(c => c.tipoCurso === maxTipo || String(c.id) === String(maxTipo));
    const nombre = cursoObj?.nombre || maxTipo;
    return { nombre, count: maxCount };
  }, [res, cursosList]);

  const conversionEquilibrio = useMemo(() => {
    const usuariosEq = new Set();
    const usuariosOtros = new Set();
    res.forEach(r => {
      if (getTipo(r) === 'equilibrio' && (r.estadoPago === 'Aprobado' || r.estadoCurso === 'Aprobado')) {
        usuariosEq.add(r.userId);
      }
    });
    res.forEach(r => {
      if (getTipo(r) !== 'equilibrio' && r.estadoPago === 'Aprobado') {
        if (usuariosEq.has(r.userId)) usuariosOtros.add(r.userId);
      }
    });
    const totalEq = usuariosEq.size;
    const totalConv = usuariosOtros.size;
    const pct = totalEq > 0 ? Math.round((totalConv / totalEq) * 100) : 0;
    return { pct, totalEq, totalConv };
  }, [res]);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  if (cargando) return <div className="p-4 text-center text-sm font-bold text-gray-500 animate-pulse">Cargando panel...</div>;
  if (error) return <div className="p-4 text-red-600 text-sm font-bold">Error: {error.message}</div>;

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  const header = <DashboardHeader title="Panel Administrativo" onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
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

        {/* TARJETAS RESUMEN - NUEVA PALETA */}
        <div className="grid grid-cols-2 gap-2">
          <TarjetaResumen titulo="Ingresos Mes" valor={`${config.monedaPagoStaff || 'USD'} ${ingresosMes}`} color="bg-gradient-to-br from-emerald-600 to-emerald-800" icon={DollarSign} />
          <TarjetaResumen titulo="Ocupación Hoy" valor={`${bloquesOcupadosHoy}/${totalBloques}`} color="bg-gradient-to-br from-indigo-600 to-indigo-800" icon={Calendar} />
          <TarjetaResumen titulo="Instructores" valor={instrActivos} color="bg-gradient-to-br from-purple-600 to-purple-800" icon={Users} />
          <TarjetaResumen titulo="Motos" valor={motosList.length} color="bg-gradient-to-br from-slate-700 to-slate-900" icon={Bike} />
        </div>

        {/* NUEVAS MÉTRICAS */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-bold text-gray-900 text-xs flex items-center gap-2"><TrendingUp size={14} className="text-indigo-600" />Métricas del Negocio</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-3 rounded-lg border border-purple-100">
              <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-1">Top Ventas</p>
              <p className="text-sm font-black text-gray-900 truncate">{cursoMasVendido.nombre}</p>
              <p className="text-xs text-gray-500">{cursoMasVendido.count} ventas</p>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-3 rounded-lg border border-teal-100">
              <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider mb-1">Conversión Eq → Otros</p>
              <p className="text-sm font-black text-gray-900">{conversionEquilibrio.pct}%</p>
              <p className="text-xs text-gray-500">{conversionEquilibrio.totalConv} de {conversionEquilibrio.totalEq} alumnos</p>
            </div>
          </div>
        </div>

        {/* GRÁFICO */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 text-xs mb-1 flex items-center gap-2"><TrendingUp size={14} className="text-indigo-600" />Ingresos últimos 7 días</h3>
          <MiniGraficoBarras datos={datosGrafico} />
        </div>

        {/* ÚLTIMOS COMPLETADOS - NUEVA CONSULTA ESPECÍFICA */}
        <div>
          <h3 className="font-bold text-gray-900 text-xs mb-2">Últimos Cursos Completados</h3>
          {ultimosCompletados.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No hay cursos completados aún.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {ultimosCompletados.map(r => (
                <CursoCompletadoMini key={r.id} reserva={r} instructorNombre={instrs.find(i => String(i.id) === String(r.instructorId))?.nombre || 'N/A'} />
              ))}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
};

export default AdminResumen;