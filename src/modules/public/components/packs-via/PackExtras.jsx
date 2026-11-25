// @build: 2026-11-24 | id: F-02-PACKS-EXTRAS | desc: Sede/filtros, comparador, FAQ, modal de sesión y barra inferior de Packs de La Vía.
import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  Lock,
  MapPin,
  MessageCircle,
  Users,
  X,
  Zap,
} from 'lucide-react';
import useModalAccesible from '../../hooks/useModalAccesible';
import TextoEnriquecido from '../../../shared/components/TextoEnriquecido';
import { duracionCurso, formatearMonto, listaTexto, precioCurso, textoPlano } from '../via/viaDatos';
import { nombreVisiblePack } from './packsViaDatos';

export function PackSedeFiltros({
  sedes = [],
  sedeId,
  onSede,
  filtro = 'todos',
  onFiltro,
  conteos = { todos: 0, completa: 0, basica: 0 },
  tienePackActivo = false,
}) {
  const filtros = [
    { id: 'todos', label: `Todos (${conteos.todos})` },
    { id: 'completa', label: `Ruta Completa (${conteos.completa})` },
    { id: 'basica', label: `Desde Básica (${conteos.basica})` },
  ];

  return (
    <section aria-label="Sede y filtros de packs" className="mx-auto mt-5 w-full max-w-3xl space-y-3 px-4 sm:px-6">
      {sedes.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <div className="flex items-center justify-between px-1 text-[11px] font-extrabold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} className="text-[#FF6B00]" aria-hidden="true" />
              <span>Sede de tus sesiones prácticas:</span>
            </span>
          </div>

          <div className={`grid gap-1.5 ${sedes.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
            {sedes.map((sede) => {
              const activa = sede.id === sedeId;
              return (
                <button
                  key={sede.id}
                  type="button"
                  onClick={() => onSede?.(sede.id)}
                  aria-pressed={activa}
                  className={`flex min-h-[46px] cursor-pointer touch-manipulation items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-left transition-all ${
                    activa
                      ? 'border-[#2563EB] bg-[#EFF6FF] text-slate-900'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="min-w-0 truncate text-xs font-extrabold">{sede.nombre}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                      sede.recargo <= 0 ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FFF7ED] text-[#C2410C]'
                    }`}
                  >
                    {sede.recargo > 0 ? `+$${formatearMonto(sede.recargo)} por sesión` : 'Sin recargo'}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="px-1 text-[10px] leading-snug text-slate-500">
            El recargo se suma por cada sesión del pack; el total por sede se confirma al inscribirte.
          </p>
        </div>
      )}

      {tienePackActivo && (
        <div role="status" className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-[#FFF7ED] p-3.5 text-xs text-slate-800">
          <Lock size={17} className="mt-0.5 shrink-0 text-[#FF6B00]" aria-hidden="true" />
          <div>
            <strong className="text-slate-900">Tu cuenta ya tiene un pack de sesiones activo.</strong>{' '}
            Puedes explorar el catálogo, pero la compra de otro pack práctico se habilita al completar
            tu entrenamiento vigente.
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {filtros.map((item) => {
          const activo = filtro === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onFiltro?.(item.id)}
              aria-pressed={activo}
              className={`min-h-[40px] cursor-pointer touch-manipulation rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                activo
                  ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PackComparador({ pack, calculo, bloqueado = false, onReservar, onCambiarSede }) {
  if (!pack || !calculo || !calculo.permitida) return null;
  const final = formatearMonto(calculo.final);
  const base = formatearMonto(calculo.base);
  const ahorro = formatearMonto(calculo.ahorro);

  return (
    <section aria-labelledby="comparador-packs-titulo" className="mx-auto mt-9 w-full max-w-3xl px-4 sm:px-6">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-[#EFF6FF] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#1D4ED8]">
            <Zap size={12} aria-hidden="true" />
            Comparador transparente
          </span>
          <h2 id="comparador-packs-titulo" className="text-xl font-black text-slate-900 sm:text-2xl">
            Sesiones sueltas vs. {nombreVisiblePack(pack)}
          </h2>
          <p className="text-xs text-slate-600 sm:text-sm">
            Mira la diferencia real entre reservar cada etapa por separado o asegurar tu recorrido
            completo hoy.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3.5 sm:p-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Una por una
              </span>
              <h3 className="mt-0.5 text-sm font-black text-slate-800 sm:text-base">Precio sin pack</h3>
              <div className="mt-2 text-xl font-black tabular-nums text-slate-700 sm:text-2xl">
                ${base}
                <span className="ml-0.5 text-[10px] font-bold text-slate-400">USD</span>
              </div>
            </div>

            <ul className="space-y-2 text-[11px] text-slate-600 sm:text-xs">
              <li className="flex items-start gap-1.5">
                <X size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Sin descuento por ruta</span>
              </li>
              <li className="flex items-start gap-1.5">
                <X size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Pagas sesión por sesión</span>
              </li>
              <li className="flex items-start gap-1.5">
                <X size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Teóricos según cada curso</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Práctica 1 a 1 en pista</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border-2 border-[#2563EB] bg-gradient-to-b from-[#0F172A] to-[#1E293B] p-3.5 text-white shadow-md sm:p-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                {Number(calculo.ahorro) > 0 ? `Ahorras $${ahorro} USD` : 'Precio del pack'}
              </span>
              <h3 className="mt-1.5 text-sm font-black text-white sm:text-base">Llevando el Pack</h3>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-xl font-black tabular-nums text-white sm:text-2xl">${final}</span>
                {Number(calculo.ahorro) > 0 && (
                  <span className="text-[11px] font-bold tabular-nums text-slate-400 line-through">
                    ${base}
                  </span>
                )}
              </div>
            </div>

            <ul className="space-y-2 text-[11px] text-slate-200 sm:text-xs">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#10B981]" aria-hidden="true" />
                <span>
                  {Number(calculo.ahorro) > 0 ? (
                    <>
                      <strong className="text-white">{calculo.porcentajeOff}% menos</strong> en inversión total
                    </>
                  ) : (
                    'Precio único por todo el recorrido'
                  )}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#10B981]" aria-hidden="true" />
                <span>Un solo pago y seguimiento en tu portal</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#10B981]" aria-hidden="true" />
                <span>Agenda las etapas según cupo disponible</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#10B981]" aria-hidden="true" />
                <span>
                  {pack.teoricosCount > 0
                    ? `${pack.teoricosCount} ${pack.teoricosCount === 1 ? 'módulo teórico incluido' : 'módulos teóricos incluidos'}`
                    : 'Sesiones prácticas del recorrido'}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {!bloqueado && (
          <button
            type="button"
            onClick={() => onReservar?.(pack)}
            className="flex min-h-[48px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-3 text-xs font-black text-white transition-all active:scale-[0.98] sm:text-sm"
          >
            <span>
              Elegir {nombreVisiblePack(pack)} · ${final} USD
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

const FAQ_PACKS = [
  {
    id: 'f1',
    pregunta: '¿Debo hacer todas las sesiones la misma semana?',
    respuesta:
      'No. Al inscribirte agendas tu primera etapa y luego coordinas las siguientes según tu disponibilidad y el cupo de la sede. La vigencia del pack se muestra en su tarjeta.',
  },
  {
    id: 'f2',
    pregunta: '¿Qué pasa si llueve o necesito reprogramar?',
    respuesta:
      'Escríbenos por WhatsApp y el equipo revisa tu caso según la política de cambios vigente. No prometemos reprogramaciones automáticas.',
  },
  {
    id: 'f3',
    pregunta: '¿Necesito moto o casco propio?',
    respuesta:
      'Las sesiones base incluyen moto liviana y casco homologado. Si un curso indica otra condición, se muestra en el detalle de la sesión.',
  },
  {
    id: 'f4',
    pregunta: '¿Puedo empezar sin haber montado bicicleta?',
    respuesta:
      'Sí. El Pack Ruta Completa inicia en KM 0 (Equilibrio y Confianza) para que ganes equilibrio antes de acelerar. Si ya tienes equilibrio, puedes elegir un pack desde Básica.',
  },
];

export function PackFaq() {
  const [abiertaId, setAbiertaId] = useState(FAQ_PACKS[0].id);

  return (
    <section aria-labelledby="faq-packs-titulo" className="mx-auto mt-8 w-full max-w-3xl px-4 sm:px-6">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6EE7B7] bg-[#ECFDF5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#047857]">
            <HeartHandshake size={12} aria-hidden="true" />
            Sin miedos · A tu ritmo
          </span>
          <h2 id="faq-packs-titulo" className="text-xl font-black text-slate-900">
            Preguntas frecuentes antes de reservar
          </h2>
        </div>

        <div className="space-y-2">
          {FAQ_PACKS.map((faq) => {
            const abierta = abiertaId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-colors ${
                  abierta ? 'border-slate-300 bg-[#F8FAFC]' : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAbiertaId(abierta ? null : faq.id)}
                  aria-expanded={abierta}
                  className="flex min-h-[50px] w-full cursor-pointer touch-manipulation items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="inline-flex items-center gap-2.5 text-xs font-extrabold text-slate-900 sm:text-sm">
                    <HelpCircle
                      size={16}
                      className={`shrink-0 ${abierta ? 'text-[#2563EB]' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span>{faq.pregunta}</span>
                  </span>
                  {abierta ? (
                    <ChevronUp size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
                  ) : (
                    <ChevronDown size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
                  )}
                </button>
                {abierta && (
                  <div className="via-fade-in px-4 pb-4 pt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {faq.respuesta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PackModalSesion({ curso, onClose }) {
  const cerrarRef = useRef(null);
  const tituloId = useId();
  const dialogRef = useModalAccesible({
    open: Boolean(curso),
    onClose,
    initialFocusRef: cerrarRef,
  });

  useEffect(() => {
    if (!curso || typeof document === 'undefined') return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [curso]);

  if (!curso) return null;

  const duracion = duracionCurso(curso);
  const precio = precioCurso(curso);
  const queAprenderas = listaTexto(curso.queAprenderas);
  const modulos = (Array.isArray(curso.modulos) ? curso.modulos : [])
    .map((modulo) => (typeof modulo === 'string' ? modulo : modulo?.nombre))
    .map((nombre) => String(nombre || '').trim())
    .filter(Boolean);

  return (
    <div
      className="via-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 bg-[#0F172A] px-5 py-4 text-white">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-200">
              Sesión del pack · 1 a 1
            </span>
            <h2 id={tituloId} className="mt-1.5 break-words text-lg font-black leading-tight">
              {curso.nombre}
            </h2>
            {curso.descripcion && (
              <p className="mt-0.5 break-words text-xs text-slate-300">{textoPlano(curso.descripcion)}</p>
            )}
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de la sesión"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-2.5">
              <div className="text-[10px] font-bold uppercase text-slate-400">Duración</div>
              <div className="mt-0.5 text-xs font-black text-slate-900 sm:text-sm">
                {duracion || 'Por confirmar'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-2.5">
              <div className="text-[10px] font-bold uppercase text-slate-400">Precio individual</div>
              <div className="mt-0.5 text-xs font-black tabular-nums text-slate-900 sm:text-sm">
                {precio != null ? `$${formatearMonto(precio)}` : '—'}
              </div>
            </div>
          </div>

          {textoPlano(curso.dirigidoA) && (
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3.5">
              <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <Users size={14} className="text-[#2563EB]" aria-hidden="true" />
                A quién va dirigido
              </h3>
              <TextoEnriquecido texto={curso.dirigidoA} className="text-xs leading-relaxed text-slate-700" />
            </div>
          )}

          {queAprenderas.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Qué practicarás en esta etapa
              </h3>
              <ul className="space-y-1.5">
                {queAprenderas.map((objetivo, indice) => (
                  <li
                    key={`${objetivo}-${indice}`}
                    className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white p-2.5 text-xs text-slate-700"
                  >
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#2563EB]" aria-hidden="true" />
                    <span className="break-words leading-relaxed">{objetivo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {modulos.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                Contenido de la sesión
              </h3>
              <ol className="space-y-1.5">
                {modulos.map((modulo, indice) => (
                  <li key={`${modulo}-${indice}`} className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white">
                      {indice + 1}
                    </span>
                    <span className="break-words text-xs text-slate-700">{modulo}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="rounded-2xl border border-indigo-200 bg-[#EEF2FF] p-3 text-[11px] leading-snug text-[#3730A3]">
            <GraduationCap size={13} className="mr-1 inline align-[-2px]" aria-hidden="true" />
            Esta sesión forma parte de tu pack; no se compra por separado desde aquí.
          </p>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] w-full cursor-pointer rounded-2xl bg-[#0F172A] text-sm font-extrabold text-white hover:bg-slate-800"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export function PackBarraInferior({
  pack,
  calculo,
  whatsappHref,
  bloqueado = false,
  visible = true,
  onReservar,
  onPortal,
  onCambiarSede,
}) {
  if (!visible || !pack) return null;
  const final = calculo ? formatearMonto(calculo.final) : null;
  const ahorro = calculo ? formatearMonto(calculo.ahorro) : null;
  const noDisponible = Boolean(calculo) && !calculo.permitida;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[10px] font-black uppercase tracking-wider text-[#2563EB]">
              Tu pack ideal
            </span>
            {Number(calculo?.ahorro) > 0 && (
              <span className="shrink-0 rounded-full bg-[#ECFDF5] px-1.5 py-0.5 text-[9px] font-black text-[#047857]">
                −${ahorro}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-xs font-black text-slate-900 sm:text-sm">{nombreVisiblePack(pack)}</span>
            {final && (
              <span className="shrink-0 text-xs font-black tabular-nums text-[#047857] sm:text-sm">
                ${final}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Consultar por WhatsApp"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981] text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95"
            >
              <MessageCircle size={20} aria-hidden="true" />
            </a>
          )}

          {bloqueado ? (
            <button
              type="button"
              onClick={onPortal}
              className="inline-flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-2xl bg-[#0F172A] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:bg-slate-800 active:scale-95 sm:text-sm"
            >
              <span>Mi Portal</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          ) : noDisponible ? (
            <button
              type="button"
              onClick={onCambiarSede}
              className="inline-flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-2xl border-2 border-amber-300 bg-white px-4 py-2.5 text-xs font-black text-[#9A3412] sm:text-sm"
            >
              <span>Elegir sede</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReservar?.(pack)}
              className="inline-flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:bg-[#1D4ED8] active:scale-95 sm:text-sm"
            >
              <span>Reservar Pack</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


