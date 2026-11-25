// @build: 2026-11-24 | id: F-02-PACKS-TARJETA | desc: Tarjeta de pack con mini carretera, sesiones, teóricos, desglose y CTA real.
//
// El dinero llega resuelto (`calculo`) con el recargo de sede ya aplicado.
// Anónimos nunca ven IDs, nombres ni precios de teóricos (ERR-023).

import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  GraduationCap,
  Lock,
  Package,
  Sparkles,
  Star,
} from 'lucide-react';
import { calcularDiasPack, formatearDias } from '../../../shared/utils/duraciones';
import { duracionCurso, formatearMonto, precioCurso } from '../via/viaDatos';
import { badgePack, etapasKmDelPack, etiquetaCortaPack, kmDeCurso, nombreVisiblePack, sesionesDelPack } from './packsViaDatos';

function MiniCarreteraPack({ etapasKm = [] }) {
  const incluyeKm0 = etapasKm.includes('KM 0');
  const nodos = [
    { km: 'KM 0', label: 'Equilibrio', x: 34, activo: incluyeKm0 },
    { km: 'KM 1', label: 'Básica', x: 118, activo: etapasKm.includes('KM 1') },
    { km: 'KM 2', label: 'Calle', x: 202, activo: etapasKm.includes('KM 2') },
    { km: 'META', label: 'Autonomía', x: 286, activo: true, esMeta: true },
  ];
  const inicioX = incluyeKm0 ? 34 : 118;

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0F172A] px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold">
        <span className="inline-flex items-center gap-1 text-slate-300">
          <Compass size={11} className="text-[#FF6B00]" aria-hidden="true" />
          Recorrido incluido en La Vía
        </span>
        <span className="shrink-0 font-extrabold text-emerald-400">
          {incluyeKm0 ? 'Ruta completa (3 etapas)' : `Desde KM 1 (${etapasKm.length} etapas)`}
        </span>
      </div>

      <svg
        viewBox="0 0 320 62"
        className="block h-auto w-full select-none"
        role="img"
        aria-label={`Recorrido del pack: ${etapasKm.join(', ') || 'sin etapas'} hasta la meta`}
      >
        <rect x="18" y="18" width="284" height="16" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1.2" />
        <rect
          x={inicioX}
          y="18"
          width={286 - inicioX}
          height="16"
          rx="8"
          fill="#2563EB"
          fillOpacity="0.34"
        />
        <line x1="28" y1="26" x2="290" y2="26" stroke="#64748B" strokeWidth="1.6" strokeDasharray="6 6" />
        <line
          x1={inicioX}
          y1="26"
          x2="286"
          y2="26"
          stroke="#38BDF8"
          strokeWidth="2.2"
          strokeDasharray="7 5"
        />

        <g transform={`translate(${inicioX + 26}, 10)`}>
          <circle cx="-4" cy="6" r="2.2" fill="none" stroke="#F8FAFC" strokeWidth="1.4" />
          <circle cx="5" cy="6" r="2.2" fill="none" stroke="#F8FAFC" strokeWidth="1.4" />
          <path
            d="M -4 6 L 0 2 L 4 2 L 5 6 M 1 0 L 3 2"
            stroke="#38BDF8"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {nodos.map((nodo) => (
          <g key={nodo.km} transform={`translate(${nodo.x}, 26)`}>
            <circle
              r={nodo.esMeta ? 9.5 : 8.5}
              fill={nodo.esMeta ? '#10B981' : nodo.activo ? '#2563EB' : '#0F172A'}
              stroke={nodo.activo ? '#FFFFFF' : '#475569'}
              strokeWidth="1.8"
            />
            {nodo.esMeta ? (
              <path d="M-3 -3 L-3 4 M-3 -3 L3 -1 L-3 1" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
            ) : nodo.activo ? (
              <path d="M-3 0 L-1 2 L3 -2" stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
            ) : (
              <circle r="1.6" fill="#64748B" />
            )}

            <text
              y="22"
              textAnchor="middle"
              fill={nodo.activo ? '#F8FAFC' : '#64748B'}
              fontSize="8"
              fontWeight="900"
            >
              {nodo.km}
            </text>
            <text
              y="32"
              textAnchor="middle"
              fill={nodo.activo ? '#94A3B8' : '#475569'}
              fontSize="6.8"
              fontWeight="700"
            >
              {nodo.activo ? nodo.label : 'No incluido'}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function PackTarjeta({
  pack,
  calculo,
  sedeActual,
  anonimo = true,
  teoricosResueltos = [],
  teoricosCount = 0,
  bloqueado = false,
  recomendado = false,
  onComprar,
  onVerSesion,
  onIrPortal,
  onCambiarSede,
}) {
  const [verDesglose, setVerDesglose] = useState(false);
  const sesiones = sesionesDelPack(pack);
  const etapasKm = etapasKmDelPack(pack);
  const dias = calcularDiasPack(sesiones);
  const final = calculo ? formatearMonto(calculo.final) : null;
  const base = calculo ? formatearMonto(calculo.base) : null;
  const ahorro = calculo ? formatearMonto(calculo.ahorro) : null;
  const noDisponibleSede = Boolean(calculo) && !calculo.permitida;

  return (
    <article
      id={`pack-card-${pack.id}`}
      aria-labelledby={`pack-titulo-${pack.id}`}
      className={`via-ancla relative scroll-mt-24 rounded-3xl border-2 bg-white p-4 transition-all duration-200 sm:p-5 ${
        recomendado
          ? 'border-[#2563EB] shadow-xl ring-4 ring-blue-500/20'
          : 'border-slate-200/90 shadow-sm hover:border-slate-300'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            <Package size={11} className="text-[#FF6B00]" aria-hidden="true" />
            <span>{etiquetaCortaPack(pack)}</span>
          </span>

          {recomendado ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6B00] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
              <Sparkles size={11} aria-hidden="true" />
              <span>Recomendado para ti</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-extrabold text-[#1D4ED8]">
              <Star size={10} className="fill-current" aria-hidden="true" />
              <span>{badgePack(pack)}</span>
            </span>
          )}
        </div>

        {calculo && Number(calculo.ahorro) > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#6EE7B7] bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-black text-[#047857]">
            Ahorras ${ahorro} USD ({calculo.porcentajeOff}% OFF)
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3
          id={`pack-titulo-${pack.id}`}
          className="break-words text-lg font-black leading-snug text-slate-900 sm:text-xl"
        >
          {nombreVisiblePack(pack)}
        </h3>
        {pack.descripcion && (
          <p className="break-words text-xs leading-relaxed text-slate-600 sm:text-sm">
            {pack.descripcion}
          </p>
        )}
      </div>

      <div className="mt-3.5">
        <MiniCarreteraPack etapasKm={etapasKm} />
      </div>

      <div className="mt-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          <span>Sesiones prácticas incluidas</span>
          <span className="text-slate-500">{sesiones.length} sesiones</span>
        </div>

        <div className="space-y-1.5">
          {sesiones.map((curso, indice) => {
            const duracion = duracionCurso(curso);
            return (
              <button
                key={String(curso.id ?? indice)}
                type="button"
                onClick={() => onVerSesion?.(curso)}
                className="flex min-h-[48px] w-full cursor-pointer touch-manipulation items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-left transition-all hover:border-slate-300 hover:bg-white active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-[10px] font-black text-white">
                    {kmDeCurso(curso)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold text-slate-900 sm:text-sm">
                      {curso.nombre}
                    </span>
                    {duracion && (
                      <span className="block text-[11px] font-semibold text-slate-500">{duracion}</span>
                    )}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-extrabold text-[#2563EB]">
                  <span>Ver detalle</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>

        {teoricosCount > 0 && (
          <div className="space-y-1.5 rounded-2xl border border-indigo-200/80 bg-[#EEF2FF]/75 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#4338CA]">
                <GraduationCap size={16} className="shrink-0" aria-hidden="true" />
                <span>
                  Incluye {teoricosCount}{' '}
                  {teoricosCount === 1 ? 'módulo teórico digital' : 'módulos teóricos digitales'}
                </span>
              </div>
              <span className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-black text-[#4F46E5]">
                Incluido
              </span>
            </div>

            {anonimo || teoricosResueltos.length === 0 ? (
              <p className="text-[11px] leading-snug text-indigo-900/75">
                Acceso digital en tu Portal de Estudiante al activar tu inscripción.
              </p>
            ) : (
              <ul className="space-y-1 pt-0.5">
                {teoricosResueltos.map((teorico) => (
                  <li
                    key={String(teorico.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-white/85 px-2.5 py-1.5 text-[11px] font-bold text-slate-800"
                  >
                    <CheckCircle2 size={13} className="shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="truncate">{teorico.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2.5 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Inversión total del pack
            </span>
            {noDisponibleSede ? (
              <p className="mt-1 text-sm font-bold text-[#9A3412]">No disponible en esta sede</p>
            ) : calculo ? (
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-3xl font-black leading-none tabular-nums text-slate-900">
                  ${final}
                  <span className="ml-1 text-xs font-bold text-slate-500">USD</span>
                </span>
                {Number(calculo.ahorro) > 0 && (
                  <span className="text-sm font-bold tabular-nums text-slate-400 line-through">
                    ${base}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm font-bold text-slate-700">Precio a confirmar</p>
            )}
            {!noDisponibleSede && (
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {dias > 0 ? `${formatearDias(dias)} de práctica` : 'Sesiones prácticas'}
                {calculo && calculo.recargoTotal > 0
                  ? ` · Incluye +$${formatearMonto(calculo.recargoTotal)} traslado (${sedeActual?.nombre || 'sede'})`
                  : sedeActual?.nombre
                    ? ` · ${sedeActual.nombre}`
                    : ''}
              </p>
            )}
          </div>
        </div>

        {calculo && !noDisponibleSede && (
          <div className="border-t border-slate-200/80 pt-2">
            <button
              type="button"
              onClick={() => setVerDesglose((valor) => !valor)}
              aria-expanded={verDesglose}
              className="flex min-h-[38px] w-full cursor-pointer touch-manipulation items-center justify-between text-xs font-extrabold text-[#2563EB]"
            >
              <span>Ver cómo se calcula tu ahorro</span>
              {verDesglose ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            </button>

            {verDesglose && (
              <div className="via-fade-in mt-2 space-y-1.5 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                {sesiones.map((curso) => {
                  const precio = precioCurso(curso);
                  return (
                    <div key={String(curso.id)} className="flex items-center justify-between gap-2 text-slate-600">
                      <span className="min-w-0 truncate">
                        {kmDeCurso(curso)} · {curso.nombre}
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-slate-800">
                        {precio != null ? `$${formatearMonto(precio)}` : '—'}
                      </span>
                    </div>
                  );
                })}

                {teoricosCount > 0 && (
                  <div className="flex items-center justify-between gap-2 text-slate-500">
                    <span>
                      {teoricosCount}{' '}
                      {teoricosCount === 1 ? 'módulo teórico digital' : 'módulos teóricos digitales'}
                    </span>
                    <span className="font-semibold text-indigo-700">Incluido</span>
                  </div>
                )}

                {calculo.recargoTotal > 0 && (
                  <div className="flex items-center justify-between gap-2 text-slate-600">
                    <span>
                      Traslado {sedeActual?.nombre || 'sede'} (+${formatearMonto(calculo.recargoPorSesion)} ×{' '}
                      {calculo.sesiones} sesiones)
                    </span>
                    <span className="font-bold tabular-nums text-slate-800">
                      +${formatearMonto(calculo.recargoTotal)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5 text-slate-700">
                  <span>Valor regular total</span>
                  <span className="font-bold tabular-nums line-through">${base} USD</span>
                </div>

                {Number(calculo.ahorro) > 0 && (
                  <div className="flex items-center justify-between gap-2 font-extrabold text-[#047857]">
                    <span>Descuento por llevar Pack</span>
                    <span className="tabular-nums">−${ahorro} USD</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900">
                  <span>Total a pagar</span>
                  <span className="tabular-nums">${final} USD</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        {bloqueado ? (
          <div className="space-y-2.5 rounded-2xl border border-amber-200 bg-[#FFF7ED] p-3.5">
            <div className="flex items-start gap-2.5 text-xs text-slate-800">
              <Lock size={16} className="mt-0.5 shrink-0 text-[#FF6B00]" aria-hidden="true" />
              <div>
                <p className="font-black text-slate-900">Ya tienes un pack de sesiones activo</p>
                <p className="mt-0.5 leading-snug text-slate-600">
                  Para evitar cobros duplicados, finaliza tu pack actual antes de adquirir otro.
                  Puedes ver tu avance y agendar desde tu portal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled
                className="min-h-[46px] cursor-not-allowed rounded-xl bg-slate-200 text-xs font-extrabold text-slate-500"
              >
                Compra pausada (Pack activo)
              </button>
              <button
                type="button"
                onClick={onIrPortal}
                className="flex min-h-[46px] cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] text-xs font-extrabold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
              >
                <span>Ir a mi Portal</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : noDisponibleSede ? (
          <div className="space-y-2.5 rounded-2xl border border-amber-200 bg-[#FFF7ED] p-3.5">
            <p className="text-xs font-semibold leading-relaxed text-[#9A3412]">
              Este pack no está habilitado en <strong>{sedeActual?.nombre || 'la sede elegida'}</strong>.
              Elige otra sede para continuar.
            </p>
            <button
              type="button"
              onClick={onCambiarSede}
              className="flex min-h-[46px] w-full cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-xl border-2 border-amber-300 bg-white text-xs font-extrabold text-[#9A3412]"
            >
              <span>Elegir otra sede</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onComprar?.(pack)}
            className="flex min-h-[52px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-[#1D4ED8] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span>Reservar este pack</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        )}
      </div>

      {pack.vencimientoDias > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock size={12} aria-hidden="true" />
          Vigencia: {pack.vencimientoDias} días desde la compra
        </p>
      )}
    </article>
  );
}


