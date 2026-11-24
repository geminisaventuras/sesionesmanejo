// @build: 2026-11-23 | id: T-065 | desc: Pantalla /admin/metricas con las métricas del negocio, ingresos de 7 días y últimos cursos completados.
import { useContext, useState, useMemo, memo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { Activity, Award, BookOpen, Calendar, Settings, TrendingUp, Wallet } from 'lucide-react';
import { useAdminReservas } from '../hooks/useAdminReservas';
import { calcularIngresosUltimosDias, calcularMetricasNegocio } from '../utils/metricasAdmin';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';

const APP_ID = 'motoescuela-pro-v1';

// FT-003: la fuente de "Últimos Cursos Completados" todavía no es fiable, así que la
// lista no se pinta. La consulta y el cálculo se conservan para reutilizarlos en FT-003,
// pero no se ejecutan mientras el flag esté en false (sin lecturas innecesarias).
const MOSTRAR_COMPLETADOS = false;

const CursoCompletadoMini = memo(({ reserva, instructorNombre }) => (
  <div className="w-24 flex-shrink-0 rounded-xl border border-gray-100 bg-white p-2 text-center shadow-sm">
    <Award size={18} className="mx-auto mb-1 text-indigo-500" aria-hidden="true" />
    <p className="truncate text-[10px] font-bold text-gray-900">{reserva.nombre} {reserva.apellido?.charAt(0)}.</p>
    <p className="truncate text-[9px] text-gray-500">{instructorNombre}</p>
  </div>
));

const MiniGraficoBarras = memo(({ datos }) => {
  const maximo = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <div className="mt-2 flex h-24 items-end gap-1.5" role="img" aria-label="Ingresos de los últimos 7 días">
      {datos.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-indigo-500 transition-all"
            style={{ height: `${Math.max(4, (d.valor / maximo) * 64)}px` }}
            title={`${d.label}: ${d.valor}`}
          />
          <span className="truncate text-[8px] text-gray-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
});

const AdminMetricas = () => {
  const { instructores, cursos, config, logoutUser, notifications } = useContext(AppContext);
  const navigate = useNavigate();
  const { reservas, cargando, error } = useAdminReservas();
  const [ultimosCompletados, setUltimosCompletados] = useState([]);
  const [cargandoCompletados, setCargandoCompletados] = useState(true);

  const res = reservas || [];
  const cursosList = cursos || [];
  const instrs = instructores || [];

  // Consulta de últimos cursos completados, movida desde el Home (T-065).
  useEffect(() => {
    if (!MOSTRAR_COMPLETADOS) return undefined;
    let activo = true;
    const cargarUltimos = async () => {
      try {
        const reservasRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservas');
        const q = query(
          reservasRef,
          where('estadoCurso', '==', 'Aprobado'),
          orderBy('updatedAt', 'desc'),
          limit(4)
        );
        const snap = await getDocs(q);
        if (activo) setUltimosCompletados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn('[AdminMetricas] Fallback: sin índice compuesto o updatedAt faltante', err);
        try {
          const reservasRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservas');
          const q2 = query(reservasRef, where('estadoCurso', '==', 'Aprobado'), limit(20));
          const snap2 = await getDocs(q2);
          const docs2 = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
          docs2.sort((a, b) => {
            const fechaA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
            const fechaB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
            return fechaB - fechaA;
          });
          if (activo) setUltimosCompletados(docs2.slice(0, 4));
        } catch (err2) {
          console.error('[AdminMetricas] Error en fallback:', err2);
        }
      } finally {
        if (activo) setCargandoCompletados(false);
      }
    };
    cargarUltimos();
    return () => { activo = false; };
  }, []);

  const { cursoMasVendido, conversionEquilibrio } = useMemo(
    () => calcularMetricasNegocio(res, cursosList),
    [res, cursosList]
  );

  const datosGrafico = useMemo(() => calcularIngresosUltimosDias(res, { dias: 7 }), [res]);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') },
  ];

  const header = (
    <DashboardHeader
      title="Métricas"
      onBack={() => navigate('/dashboard')}
      onLogout={handleLogout}
      notifications={notifications}
    />
  );

  const footer = (
    <DashboardFooter
      tabs={footerTabs}
      onTabChange={(id) => footerTabs.find((tab) => tab.id === id)?.action?.()}
    />
  );

  if (cargando) {
    return <AppShell header={header} footer={footer}><div className="p-4 text-center text-sm font-bold text-gray-500 animate-pulse">Cargando métricas...</div></AppShell>;
  }
  if (error) {
    return <AppShell header={header} footer={footer}><div className="p-4 text-sm font-bold text-red-600">Error: {error.message}</div></AppShell>;
  }

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-4xl">
      <div className="space-y-3 p-4">

        <div className="flex items-center gap-2 px-1">
          <TrendingUp size={16} className="text-indigo-600" aria-hidden="true" />
          <h1 className="text-sm font-black uppercase tracking-widest text-gray-900">Métricas del Negocio</h1>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-purple-600">Top Ventas</p>
            <p className="truncate text-sm font-black text-gray-900" title={cursoMasVendido.nombre}>{cursoMasVendido.nombre}</p>
            <p className="text-xs text-gray-500">{cursoMasVendido.count} ventas</p>
          </div>
          <div className="min-w-0 rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50 to-emerald-50 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-teal-600">Conversión Eq → Otros</p>
            <p className="text-sm font-black text-gray-900">{conversionEquilibrio.pct}%</p>
            <p className="text-xs text-gray-500">{conversionEquilibrio.totalConv} de {conversionEquilibrio.totalEq} alumnos</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
          <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <h2 className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-900">
              <TrendingUp size={14} className="text-indigo-600" aria-hidden="true" />
              Ingresos últimos 7 días
              <span className="ml-auto text-[10px] font-bold text-gray-500">{config.monedaPagoStaff || 'USD'}</span>
            </h2>
            <MiniGraficoBarras datos={datosGrafico} />
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <h2 className="mb-2 text-xs font-bold text-gray-900">Últimos Cursos Completados</h2>
            {MOSTRAR_COMPLETADOS ? (
              cargandoCompletados ? (
                <p className="py-2 text-center text-xs text-gray-400 animate-pulse">Cargando completados...</p>
              ) : ultimosCompletados.length === 0 ? (
                <p className="py-2 text-center text-xs text-gray-400">No hay cursos completados aún.</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {ultimosCompletados.map(r => (
                    <CursoCompletadoMini
                      key={r.id}
                      reserva={r}
                      instructorNombre={instrs.find(i => String(i.id) === String(r.instructorId))?.nombre || 'N/A'}
                    />
                  ))}
                </div>
              )
            ) : (
              <p className="py-2 text-center text-xs text-gray-400">Disponible con FT-003</p>
            )}
          </div>
        </div>

        <p className="px-1 text-[10px] leading-snug text-gray-400">
          Calculado con las reservas cargadas en el panel. Top Ventas y Conversión usan la misma lógica del Home.
        </p>
      </div>
    </AppShell>
  );
};

export default AdminMetricas;
