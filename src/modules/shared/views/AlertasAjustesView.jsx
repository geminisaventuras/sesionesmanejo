// Ajustes de alertas: push, sonido, categorías y horario silencioso.
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, CheckCircle2, ChevronLeft, Info, Moon, ShieldAlert,
  Smartphone, Volume2, VolumeX, Vibrate, Send, AlertTriangle,
} from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../components/AppShell';
import DashboardHeader from '../components/DashboardHeader';
import { CATEGORIAS } from '../utils/notificacionesHelpers';

const ESTADO_PUSH = {
  activo: { tono: 'emerald', titulo: 'Activas en este dispositivo', detalle: 'Recibirás avisos aunque la app esté en segundo plano.' },
  'sin-permiso': { tono: 'amber', titulo: 'Falta tu permiso', detalle: 'Actívalas con el botón. El navegador pedirá confirmación una vez.' },
  denegado: { tono: 'red', titulo: 'Bloqueadas por el navegador', detalle: 'Habilítalas en los ajustes del sitio y vuelve a intentar.' },
  'sin-suscripcion': { tono: 'amber', titulo: 'Permiso concedido, sin suscripción', detalle: 'Pulsa activar para registrar este dispositivo.' },
  'sin-registrar': { tono: 'amber', titulo: 'Suscripción local sin registrar', detalle: 'Pulsa activar para completar el registro.' },
  'no-soportado': { tono: 'slate', titulo: 'Este navegador no soporta push', detalle: 'Puedes seguir usando la campana dentro de la app.' },
  'sin-configurar': { tono: 'amber', titulo: 'Push sin configurar', detalle: 'Falta la clave pública VAPID en este entorno.' },
  'sin-sesion': { tono: 'slate', titulo: 'Sin sesión', detalle: 'Inicia sesión para activar alertas.' },
  'sin-revisar': { tono: 'slate', titulo: 'Revisando el dispositivo…', detalle: 'En un momento tendrás el estado.' },
};

const TONOS = {
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-100 bg-amber-50 text-amber-800',
  red: 'border-red-100 bg-red-50 text-red-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

const ICONOS_ESTADO = {
  emerald: CheckCircle2,
  amber: AlertTriangle,
  red: BellOff,
  slate: Info,
};

function Toggle({ activo, onChange, label, descripcion, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900">{label}</p>
        {descripcion && <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{descripcion}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(activo)}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!activo)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${activo ? 'bg-indigo-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function AlertasAjustesView() {
  const {
    user, logoutUser, prefsAlertas, guardarPreferenciasAlertas,
    activarPush, desactivarPush, probarSonido, probarPush,
    pushEstado, pushDiag, refrescarPush,
  } = useContext(AppContext);
  const navigate = useNavigate();
  const [ocupado, setOcupado] = useState('');
  const [silencio, setSilencio] = useState(prefsAlertas?.silencio || { activo: true, inicio: '22:00', fin: '07:00' });
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    setSilencio(prefsAlertas?.silencio || { activo: true, inicio: '22:00', fin: '07:00' });
  }, [prefsAlertas?.silencio]);

  useEffect(() => {
    try {
      setInstalada(window.matchMedia?.('(display-mode: standalone)')?.matches || false);
    } catch {
      setInstalada(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    refrescarPush?.().catch(() => {});
  }, [user?.uid, refrescarPush]);

  const estado = ESTADO_PUSH[pushEstado] || ESTADO_PUSH['sin-revisar'];
  const IconoEstado = ICONOS_ESTADO[estado.tono] || Info;
  const activo = pushEstado === 'activo';
  const puedePedir = ['sin-permiso', 'sin-suscripcion', 'sin-registrar'].includes(pushEstado);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const guardar = async (cambios) => {
    await guardarPreferenciasAlertas?.(cambios);
  };

  const alternarCategoria = async (clave) => {
    await guardar({
      categorias: {
        ...(prefsAlertas?.categorias || {}),
        [clave]: prefsAlertas?.categorias?.[clave] === false,
      },
    });
  };

  const activar = async () => {
    setOcupado('activar');
    await activarPush?.();
    setOcupado('');
    refrescarPush?.().catch(() => {});
  };

  const desactivar = async () => {
    setOcupado('desactivar');
    await desactivarPush?.();
    setOcupado('');
    refrescarPush?.().catch(() => {});
  };

  const probarPushAhora = async () => {
    setOcupado('push');
    await probarPush?.();
    setOcupado('');
  };

  const header = (
    <DashboardHeader
      title="Ajustes de alertas"
      onBack={() => navigate('/notificaciones')}
      onLogout={handleLogout}
      notifications={[]}
      showNotifications={false}
    />
  );

  const categorias = useMemo(() => Object.entries(CATEGORIAS), []);

  return (
    <AppShell header={header} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-2xl">
      <div className="min-w-0 space-y-4 p-4">
        <section className={`rounded-2xl border p-4 ${TONOS[estado.tono] || TONOS.slate}`}>
          <div className="flex items-start gap-3">
            <IconoEstado size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">{estado.titulo}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{estado.detalle}</p>
              {pushDiag?.plataforma && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
                  Plataforma: {pushDiag.plataforma}
                  {pushDiag.suscrito ? ' · suscripción local' : ' · sin suscripción local'}
                  {pushDiag.registrado ? ' · registrada' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {!activo && pushEstado !== 'denegado' && pushEstado !== 'no-soportado' && pushEstado !== 'sin-configurar' && (
              <button
                type="button"
                onClick={activar}
                disabled={ocupado === 'activar'}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Bell size={15} />
                {ocupado === 'activar' ? 'Activando…' : 'Activar notificaciones'}
              </button>
            )}
            {activo && (
              <>
                <button
                  type="button"
                  onClick={probarPushAhora}
                  disabled={ocupado === 'push'}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  <Send size={15} />
                  {ocupado === 'push' ? 'Enviando…' : 'Enviar prueba'}
                </button>
                <button
                  type="button"
                  onClick={desactivar}
                  disabled={ocupado === 'desactivar'}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <BellOff size={15} />
                  {ocupado === 'desactivar' ? 'Desactivando…' : 'Desactivar'}
                </button>
              </>
            )}
            {pushEstado === 'denegado' && (
              <p className="w-full rounded-xl bg-white/70 p-2 text-[11px] leading-relaxed">
                En Android/Chrome: abre el menú del sitio (⋮) → Configuración del sitio → Notificaciones → Permitir.
                Luego vuelve a esta pantalla. Si la app está instalada, revisa también los ajustes de la app.
              </p>
            )}
            {puedePedir && (
              <p className="w-full rounded-xl bg-white/70 p-2 text-[11px] leading-relaxed">
                El permiso se pide solo cuando pulsas el botón; nunca al cargar la app.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2">
            {prefsAlertas?.sonido ? <Volume2 size={18} className="text-indigo-600" /> : <VolumeX size={18} className="text-gray-400" />}
            <h2 className="text-sm font-black text-gray-900">Sonido y vibración</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <Toggle
              activo={prefsAlertas?.sonido !== false}
              onChange={(v) => guardar({ sonido: v })}
              label="Sonido en la app"
              descripcion="Tonos distintos por tipo de evento. Solo suenan con la app abierta."
            />
            <Toggle
              activo={prefsAlertas?.vibracion !== false}
              onChange={(v) => guardar({ vibracion: v })}
              label="Vibración"
              descripcion="Si el dispositivo lo permite."
            />
          </div>
          <button
            type="button"
            onClick={probarSonido}
            className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
          >
            <Volume2 size={14} />
            Probar sonido
          </button>
          <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-gray-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            En segundo plano el tono lo controla Android/Chrome; la app no puede imponer un sonido propio ni saltarse No Molestar.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-indigo-600" />
            <h2 className="text-sm font-black text-gray-900">Qué quieres recibir</h2>
          </div>
          <div className="mt-1 divide-y divide-gray-100">
            {categorias.map(([clave, etiqueta]) => (
              <Toggle
                key={clave}
                activo={prefsAlertas?.categorias?.[clave] !== false}
                onChange={() => alternarCategoria(clave)}
                label={etiqueta}
                descripcion={`Avisos de ${etiqueta.toLowerCase()} en la campana y push.`}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-indigo-600" />
            <h2 className="text-sm font-black text-gray-900">Horario silencioso</h2>
          </div>
          <Toggle
            activo={silencio.activo !== false}
            onChange={(v) => {
              const nuevo = { ...silencio, activo: v };
              setSilencio(nuevo);
              guardar({ silencio: nuevo });
            }}
            label="Silenciar media y baja prioridad"
            descripcion="Alta y crítica siempre pasan. Zona horaria: Venezuela."
          />
          <div className="mt-1 grid grid-cols-2 gap-2">
            <label className="text-[11px] font-bold text-gray-600">
              Desde
              <input
                type="time"
                value={silencio.inicio || '22:00'}
                onChange={(e) => setSilencio((s) => ({ ...s, inicio: e.target.value }))}
                onBlur={() => guardar({ silencio })}
                disabled={silencio.activo === false}
                className="mt-1 w-full rounded-xl border border-gray-200 px-2 py-2 text-sm disabled:bg-gray-100"
              />
            </label>
            <label className="text-[11px] font-bold text-gray-600">
              Hasta
              <input
                type="time"
                value={silencio.fin || '07:00'}
                onChange={(e) => setSilencio((s) => ({ ...s, fin: e.target.value }))}
                onBlur={() => guardar({ silencio })}
                disabled={silencio.activo === false}
                className="mt-1 w-full rounded-xl border border-gray-200 px-2 py-2 text-sm disabled:bg-gray-100"
              />
            </label>
          </div>
        </section>

        {!instalada && (
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex items-start gap-2">
              <Smartphone size={18} className="mt-0.5 shrink-0 text-indigo-600" />
              <div>
                <p className="text-sm font-black text-indigo-900">Instala la app para una mejor experiencia</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-800">
                  En Android: menú del navegador → “Instalar app” o “Añadir a pantalla de inicio”.
                  En iPhone: Compartir → “Añadir a pantalla de inicio” (iOS 16.4 o superior). El push en iPhone
                  solo funciona con la PWA instalada.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-gray-500" />
            <p className="text-[11px] leading-relaxed text-gray-500">
              Privacidad: las notificaciones no incluyen cédula, nombre, teléfono ni dirección. El detalle se
              carga dentro de la app después de autenticarte. Puedes desactivar el push sin perder la campana.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
