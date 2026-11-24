// @build: 2026-11-23 | id: T-066 | desc: Centro de alertas admin responsive (dos columnas en escritorio) con historial saneado.
import { useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Activity, AlertTriangle, Bell, Bike, BookOpen, Calendar, CheckCircle2,
  ChevronRight, Clock, CreditCard, Play, Pause, Award, Settings, Wallet,
} from 'lucide-react';
import { useAdminReservas } from '../hooks/useAdminReservas';
import { construirAlertas, msDeFecha } from '../utils/alertasAdmin';

const ICONO_TIPO = {
  reserva: Clock,
  curso: BookOpen,
  moto: Bike,
};

const SEVERIDAD_UI = {
  alta: { etiqueta: 'Alta', punto: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-100' },
  media: { etiqueta: 'Media', punto: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-100' },
  baja: { etiqueta: 'Baja', punto: 'bg-slate-400', chip: 'bg-slate-50 text-slate-600 border-slate-100' },
};

const ICONO_HISTORIAL = {
  nueva_reserva: Bell,
  pago_aprobado: CreditCard,
  pago_rechazado: CreditCard,
  sesion_iniciada: Play,
  sesion_pausada: Pause,
  sesion_finalizada: Award,
};

const formatearFechaHora = (valor) => {
  const ms = msDeFecha(valor);
  if (ms === null) return 'Sin fecha';
  try {
    return new Date(ms).toLocaleString('es-VE', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return new Date(ms).toLocaleDateString('es-VE');
  }
};

const TEXTO_RESERVA_SIN_NOMBRE = 'Reserva sin nombre';
const TEXTO_EVENTO_SISTEMA = 'Evento del sistema';

const reservaIdDeNotif = (notif) => {
  const id = typeof notif?.reservaId === 'string' ? notif.reservaId.trim() : '';
  return id && !/\bundefined\b/i.test(id) ? id : '';
};

// Los eventos históricos pueden venir de plantillas con datos incompletos
// ("undefined undefined", "CI: undefined"). No se inventan nombres ni CI:
// se muestra un texto neutro y se conserva el enlace solo si el id es válido.
const mensajeDeNotif = (notif) => {
  const mensaje = typeof notif?.mensaje === 'string' ? notif.mensaje.trim() : '';
  if (mensaje && !/\bundefined\b/i.test(mensaje)) return mensaje;
  return reservaIdDeNotif(notif) ? TEXTO_RESERVA_SIN_NOMBRE : TEXTO_EVENTO_SISTEMA;
};

const AdminAlertas = () => {
  const { motos, logoutUser, notifications } = useContext(AppContext);
  const navigate = useNavigate();
  const { reservas, reservasPendientes, cargando, error } = useAdminReservas({ incluirPendientes: true });

  // Une el listener general (top 100 por fecha de curso) con el de pendientes por
  // estado (ERR-058): una reserva nueva puede no estar en el primer top.
  const res = useMemo(() => {
    const mapa = new Map();
    (reservas || []).forEach((reserva) => mapa.set(reserva.id, reserva));
    (reservasPendientes || []).forEach((reserva) => mapa.set(reserva.id, reserva));
    return [...mapa.values()];
  }, [reservas, reservasPendientes]);
  const motosList = useMemo(() => motos || [], [motos]);

  const alertas = useMemo(
    () => construirAlertas({ reservas: res, motos: motosList }),
    [res, motosList]
  );
  const total = alertas.length;

  const historial = useMemo(() => {
    const vistos = new Set();
    return [...(notifications || [])]
      .filter((notif) => {
        // Solo eventos del sistema/admin; excluye mensajes dirigidos a alumnos.
        if (String(notif?.userId) !== 'admin') return false;
        const id = String(notif?.id);
        if (!id || vistos.has(id)) return false;
        vistos.add(id);
        return true;
      })
      .sort((a, b) => (msDeFecha(b.createdAt) || 0) - (msDeFecha(a.createdAt) || 0));
  }, [notifications]);

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
      title="Alertas"
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
    return <AppShell header={header} footer={footer} maxWidth="max-w-md lg:max-w-6xl"><div className="p-4 text-center text-sm font-bold text-gray-500 animate-pulse">Cargando alertas...</div></AppShell>;
  }
  if (error) {
    return <AppShell header={header} footer={footer} maxWidth="max-w-md lg:max-w-6xl"><div className="p-4 text-sm font-bold text-red-600">Error: {error.message}</div></AppShell>;
  }

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-6xl">
      <div className="min-w-0 p-4 lg:p-5">

        {/* Resumen */}
        <div className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 ${total === 0 ? 'border-emerald-100 bg-emerald-50/60' : 'border-red-100 bg-red-50/60'}`} role="status">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${total === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {total === 0 ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gray-900">{total === 0 ? 'Todo al día' : 'Requiere atención'}</p>
            <p className="text-[11px] text-gray-600">
              {total === 0 ? 'No hay alertas activas por ahora.' : `${total} ${total === 1 ? 'alerta activa' : 'alertas activas'} para revisar.`}
            </p>
          </div>
          <span className={`text-2xl font-black tabular-nums ${total === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{total}</span>
        </div>

        <div className="mt-4 flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5">

          {/* Alertas actuales (izquierda, más ancha en escritorio) */}
          <section aria-labelledby="alertas-actuales" className="min-w-0">
            <h2 id="alertas-actuales" className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">
              Alertas actuales
            </h2>
            {total === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white px-4 py-6 text-center">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500" aria-hidden="true" />
                <p className="mt-2 text-sm font-bold text-gray-900">Sin alertas activas</p>
                <p className="mt-1 text-[11px] text-gray-500">Reservas, cursos y motos están al día.</p>
              </div>
            ) : (
              <ul className="min-w-0 space-y-2">
                {alertas.map((alerta) => {
                  const Icono = ICONO_TIPO[alerta.tipo] || Bell;
                  const severidad = SEVERIDAD_UI[alerta.severidad] || SEVERIDAD_UI.baja;
                  return (
                    <li key={alerta.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(alerta.ruta)}
                        className="flex min-h-11 w-full items-start gap-2.5 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm transition-colors hover:bg-gray-50"
                        aria-label={`${alerta.titulo}. ${alerta.mensaje} Ir a la pantalla del problema`}
                      >
                        <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${severidad.chip}`}>
                          <Icono size={15} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${severidad.punto}`} aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-900">{alerta.titulo}</span>
                            <span className={`ml-auto shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${severidad.chip}`}>
                              {severidad.etiqueta}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-gray-600">{alerta.mensaje}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-400">
                            <span className="truncate">{alerta.contexto}</span>
                            {alerta.fechaMs !== null && <span>· {formatearFechaHora(alerta.fechaMs)}</span>}
                          </span>
                        </span>
                        <ChevronRight size={15} className="mt-1 shrink-0 text-gray-400" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="min-w-0 space-y-3">
            {/* Historial de notificaciones existentes (solo lectura) */}
            <section aria-labelledby="historial-alertas" className="min-w-0">
              <h2 id="historial-alertas" className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                Historial de alertas del sistema
              </h2>
              {historial.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-6 text-center">
                  <Bell size={26} className="mx-auto text-gray-300" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-gray-900">Sin eventos del sistema</p>
                  <p className="mt-1 text-[11px] text-gray-500">Cuando el sistema registre novedades para administración aparecerán aquí.</p>
                </div>
              ) : (
                <ul className="min-w-0 space-y-1.5">
                  {historial.map((notif) => {
                    const Icono = ICONO_HISTORIAL[notif.tipo] || Bell;
                    const reservaId = reservaIdDeNotif(notif);
                    const mensaje = mensajeDeNotif(notif);
                    const contenido = (
                      <>
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-600">
                          <Icono size={13} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-[11px] leading-snug text-gray-900">{mensaje}</span>
                          <span className="mt-0.5 block text-[10px] text-gray-400">{formatearFechaHora(notif.createdAt)}</span>
                        </span>
                        {reservaId && (
                          <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-indigo-600">
                            Ver reserva <ChevronRight size={12} aria-hidden="true" />
                          </span>
                        )}
                      </>
                    );

                    return (
                      <li key={notif.id} className="min-w-0">
                        {reservaId ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/reserva/${reservaId}`)}
                            className="flex min-h-11 w-full items-start gap-2.5 rounded-xl border border-gray-100 bg-white p-2.5 text-left shadow-sm transition-colors hover:bg-gray-50"
                            aria-label={`${mensaje}. Ir a la reserva`}
                          >
                            {contenido}
                          </button>
                        ) : (
                          <div className="flex w-full items-start gap-2.5 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm">
                            {contenido}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <p className="px-1 text-[10px] leading-snug text-gray-400">
              El historial muestra los últimos eventos que el sistema ya registra para administración; no incluye mensajes dirigidos a alumnos y esta pantalla no crea notificaciones.
            </p>
          </aside>

        </div>
      </div>
    </AppShell>
  );
};

export default AdminAlertas;
