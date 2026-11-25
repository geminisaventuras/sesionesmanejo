// @build: 2026-11-24 | id: F-02-VIA-EXTRAS | desc: Miedos, sedes, contacto y barra inferior fija de La Vía.
//
// Sedes y contacto provienen de `informacionPublica` (lectura pública). No se
// inventan recargos: el total por sede se confirma en la inscripción.

import { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  HeartHandshake,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
} from 'lucide-react';
import { formatearMonto } from './viaDatos';

const OBJECIONES = [
  {
    id: 'peso',
    pregunta: '¿Y si la moto me resulta muy pesada?',
    respuesta:
      'Usamos motos livianas y de altura cómoda para que apoyes bien los pies. El secreto no es la fuerza bruta sino la técnica de equilibrio: en los primeros 15 minutos descubrirás cómo moverla sin esfuerzo.',
  },
  {
    id: 'bici',
    pregunta: '¿Y si nunca he montado bicicleta?',
    respuesta:
      'Es mucho más común de lo que imaginas. Empiezas en KM 0 (Equilibrio y Confianza) con ejercicios progresivos a tu propio ritmo antes siquiera de usar el acelerador.',
  },
  {
    id: 'equipo',
    pregunta: '¿Necesito tener moto o casco propio?',
    respuesta:
      'No necesitas nada de eso para empezar. Contamos con moto adaptada a tu estatura y casco integral homologado listos para ti en cada sesión.',
  },
  {
    id: 'privacidad',
    pregunta: '¿Hay más gente mirando o tráfico alrededor?',
    respuesta:
      'Para nada. Tu sesión es 1 a 1 privada en pista controlada y libre de carros, sin miradas incómodas, sin apuros y en un ambiente de cero juicios.',
  },
];

export function ViaMiedos() {
  const [abiertaId, setAbiertaId] = useState(OBJECIONES[0].id);

  return (
    <section aria-labelledby="miedos-titulo" className="mx-auto mt-10 w-full max-w-3xl px-4 sm:px-6">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6EE7B7] bg-[#ECFDF5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#047857]">
            <HeartHandshake size={12} aria-hidden="true" />
            Cero juicios · A tu ritmo
          </span>
          <h2 id="miedos-titulo" className="text-xl font-black text-slate-900 sm:text-2xl">
            Derriba tus miedos antes de subirte
          </h2>
          <p className="text-xs text-slate-600 sm:text-sm">
            Las dudas más comunes de quienes empiezan desde cero (respondidas con honestidad).
          </p>
        </div>

        <div className="space-y-2.5">
          {OBJECIONES.map((item) => {
            const abierta = abiertaId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-colors ${
                  abierta ? 'border-slate-300 bg-[#F8FAFC]' : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAbiertaId(abierta ? null : item.id)}
                  aria-expanded={abierta}
                  className="flex min-h-[52px] w-full cursor-pointer touch-manipulation items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="inline-flex items-center gap-2.5 text-xs font-extrabold text-slate-900 sm:text-sm">
                    <HelpCircle
                      size={16}
                      className={`shrink-0 ${abierta ? 'text-[#2563EB]' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span>{item.pregunta}</span>
                  </span>
                  {abierta ? (
                    <ChevronUp size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
                  ) : (
                    <ChevronDown size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
                  )}
                </button>
                {abierta && (
                  <div className="via-fade-in px-4 pb-4 pt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {item.respuesta}
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

function urlMapa(sede) {
  const consulta = [sede?.nombreMostrado, sede?.direccion].filter(Boolean).join(', ');
  if (!consulta) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

export function ViaSelectorSede({ sedes = [], activaId, onSeleccionar }) {
  if (sedes.length === 0) return null;

  return (
    <section
      id="via-sede-selector"
      aria-label="Selector de sede"
      className="via-ancla mx-auto mt-4 w-full max-w-3xl px-4 sm:px-6"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 items-center gap-1 px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <MapPin size={12} className="text-[#FF6B00]" aria-hidden="true" />
            Sede
          </span>

          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sedes.map((sede) => {
              const activa = sede.id === activaId;
              const recargo = Number(sede.recargo) || 0;
              const nombre = sede.nombreMostrado || sede.nombre || sede.nombreCorto;
              return (
                <button
                  key={sede.id}
                  type="button"
                  onClick={() => onSeleccionar?.(sede.id)}
                  aria-pressed={activa}
                  aria-label={`${sede.nombreMostrado}: ${recargo > 0 ? `recargo $${formatearMonto(recargo)}` : 'sin recargo'}`}
                  title={sede.nombreMostrado}
                  className={`inline-flex min-h-[38px] shrink-0 cursor-pointer touch-manipulation items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-extrabold transition-all ${
                    activa
                      ? 'border-[#4F46E5] bg-[#EEF2FF] text-slate-900'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="max-w-[9.5rem] truncate">{nombre}</span>
                  {recargo > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                        activa ? 'bg-[#4F46E5] text-white' : 'bg-white text-[#4338CA]'
                      }`}
                    >
                      Con recargo
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <a
            href="#via-sedes"
            className="shrink-0 rounded-lg px-1 text-[10px] font-bold text-slate-500 underline underline-offset-2 hover:text-slate-800"
          >
            Horarios
          </a>
        </div>
      </div>
    </section>
  );
}

export function ViaSedes({
  sedes = [],
  activaId,
  onSeleccionar,
  whatsappHref,
}) {
  const activa = sedes.find((sede) => sede.id === activaId) || sedes[0] || null;
  const mapa = activa ? urlMapa(activa) : null;

  return (
    <section
      id="via-sedes"
      aria-labelledby="sedes-titulo"
      className="via-ancla mx-auto mt-10 w-full max-w-3xl px-4 sm:px-6"
    >
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2563EB]">
              Pistas seguras sin tráfico
            </p>
            <h2 id="sedes-titulo" className="text-xl font-black text-slate-900">
              Sedes y horarios
            </h2>
          </div>
        </div>

        {sedes.length === 0 ? (
          <p className="text-sm text-slate-500">Información de sedes no disponible.</p>
        ) : (
          <>
            {sedes.length > 1 && (
              <div
                role="tablist"
                aria-label="Ubicaciones disponibles"
                className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {sedes.map((sede) => {
                  const seleccionada = sede.id === activa?.id;
                  return (
                    <button
                      key={sede.id}
                      type="button"
                      role="tab"
                      aria-selected={seleccionada}
                      onClick={() => onSeleccionar?.(sede.id)}
                      className={`min-h-[40px] shrink-0 cursor-pointer touch-manipulation rounded-full border px-3 text-[11px] font-extrabold transition-all ${
                        seleccionada
                          ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4338CA]'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block max-w-[10rem] truncate">{sede.nombreCorto || sede.nombreMostrado}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activa && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-white">
                    <MapPin size={17} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900">{activa.nombreMostrado}</h3>
                    {activa.direccion && (
                      <p className="mt-0.5 break-words text-xs text-slate-700">{activa.direccion}</p>
                    )}
                    {activa.puntoReferencia && (
                      <p className="mt-0.5 break-words text-xs text-slate-500">
                        Referencia: {activa.puntoReferencia}
                      </p>
                    )}
                    {activa.horario && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {String(activa.horario)
                          .split(' · ')
                          .filter(Boolean)
                          .map((bloque) => (
                            <span
                              key={bloque}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600"
                            >
                              <Clock size={10} aria-hidden="true" />
                              {bloque}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">                  {mapa && (
                    <a
                      href={mapa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 transition-colors hover:bg-slate-50"
                    >
                      <Navigation size={14} className="text-[#2563EB]" aria-hidden="true" />
                      <span>Ver mapa</span>
                    </a>
                  )}
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#10B981] px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-emerald-600 ${
                        mapa ? '' : 'col-span-2'
                      }`}
                    >
                      <MessageCircle size={14} aria-hidden="true" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                <p className="text-[10px] leading-snug text-slate-500">
                  El total final se confirma en la inscripción.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export function ViaContacto({ contacto, whatsappHref }) {
  if (!contacto) return null;
  const telefono = contacto.telefono || null;
  const correo = contacto.email || null;
  const whatsapp = contacto.whatsapp || null;

  return (
    <section aria-labelledby="contacto-titulo" className="mx-auto mt-6 w-full max-w-3xl px-4 sm:px-6">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#FF6B00]">
            Te acompañamos desde el primer mensaje
          </p>
          <h2 id="contacto-titulo" className="text-xl font-black text-slate-900">
            ¿Aún tienes alguna duda?
          </h2>
          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            Escríbenos con toda confianza y te orientamos sobre horarios, motos livianas y tu mejor
            punto de arranque.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {whatsapp && whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-[#6EE7B7] bg-[#ECFDF5] px-3.5 py-2.5 text-xs font-extrabold text-[#047857] transition-colors hover:bg-emerald-100/70"
            >
              <MessageCircle size={18} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase opacity-80">WhatsApp directo</span>
                <span className="block truncate">{whatsapp}</span>
              </span>
            </a>
          )}

          {telefono && (
            <a
              href={`tel:${telefono}`}
              className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100"
            >
              <Phone size={17} className="shrink-0 text-[#2563EB]" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase text-slate-400">Teléfono</span>
                <span className="block truncate">{telefono}</span>
              </span>
            </a>
          )}

          {correo && (
            <a
              href={`mailto:${correo}`}
              className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100"
            >
              <Mail size={17} className="shrink-0 text-[#FF6B00]" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase text-slate-400">Correo</span>
                <span className="block truncate">{correo}</span>
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function ViaBarraInferior({ item, whatsappHref, visible = true }) {
  if (!visible || !item) return null;
  const precio = formatearMonto(item.precio);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-black uppercase tracking-wider text-[#2563EB]">
            {item.etiqueta}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-xs font-black text-slate-900 sm:text-sm">{item.nombre}</span>
            {precio && (
              <span className="shrink-0 text-xs font-black tabular-nums text-[#047857] sm:text-sm">
                ${precio}
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
              aria-label="Escribir por WhatsApp"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981] text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95"
            >
              <MessageCircle size={20} aria-hidden="true" />
            </a>
          )}

          <button
            type="button"
            onClick={item.onAccion}
            className="inline-flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:bg-[#1D4ED8] active:scale-95 sm:text-sm"
          >
            <span>Reservar ahora</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
