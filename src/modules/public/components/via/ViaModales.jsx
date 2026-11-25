// @build: 2026-11-24 | id: F-02-VIA-MODALES | desc: Hoja de detalle de sesión y aviso A2.2-bis con foco, trap y Escape.
//
// Replica el enfoque visual del diseño aprobado usando los campos reales del
// curso. Mantiene el texto de advertencia del aviso de Básica (decisión vigente).

import { useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  HardHat,
  HeartHandshake,
  Shirt,
  Droplet,
  Users,
  X,
} from 'lucide-react';
import useModalAccesible from '../../hooks/useModalAccesible';
import TextoEnriquecido from '../../../shared/components/TextoEnriquecido';
import { calcularDias, formatearDias } from '../../../shared/utils/duraciones';
import {
  duracionCurso,
  formatearMonto,
  listaTexto,
  precioCurso,
  precioCursoConSede,
  textoPlano,
} from './viaDatos';

function useBloquearScroll(abierto) {
  useEffect(() => {
    if (!abierto || typeof document === 'undefined') return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);
}

export function ViaModalDetalle({
  curso,
  sede = null,
  prerequisitoLabel = null,
  bloqueado = false,
  onClose,
  onInscribirme,
  onIrAPacks,
}) {
  const cerrarRef = useRef(null);
  const dialogRef = useModalAccesible({
    open: Boolean(curso),
    onClose,
    initialFocusRef: cerrarRef,
  });
  useBloquearScroll(Boolean(curso));

  if (!curso) return null;

  const base = precioCurso(curso);
  const precio = precioCursoConSede(curso, sede);
  const recargo = base != null && precio != null ? Math.round((precio - base) * 100) / 100 : 0;
  const duracion = duracionCurso(curso);
  const dias = calcularDias(curso.duracionTotal);
  const queAprenderas = listaTexto(curso.queAprenderas);
  const modulos = (Array.isArray(curso.modulos) ? curso.modulos : [])
    .map((modulo) => (typeof modulo === 'string' ? modulo : modulo?.nombre))
    .map((nombre) => String(nombre || '').trim())
    .filter(Boolean);
  const tiposMoto = Array.isArray(curso.tiposMotoEscuela) ? curso.tiposMotoEscuela.filter(Boolean) : [];
  const sinId = curso.id == null;

  return (
    <div
      className="via-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-detalle-titulo"
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 bg-[#0F172A] px-5 py-4 text-white">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-200">
              Ficha de sesión · 1 a 1
            </span>
            <h2 id="modal-detalle-titulo" className="mt-1.5 break-words text-lg font-black leading-tight">
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
            aria-label="Cerrar detalles"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-2.5">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                {recargo > 0 ? 'Desde' : 'Inversión'}
              </div>
              <div className="text-base font-black tabular-nums text-slate-900">
                {precio != null ? `$${formatearMonto(precio)}` : '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-2.5">
              <div className="text-[10px] font-bold uppercase text-slate-400">Duración</div>
              <div className="mt-0.5 text-xs font-black text-slate-900 sm:text-sm">
                {duracion || 'Por confirmar'}
              </div>
              {dias > 0 && <div className="text-[10px] font-bold text-slate-500">{formatearDias(dias)}</div>}
            </div>
            <div className="rounded-2xl border border-[#6EE7B7] bg-[#ECFDF5] p-2.5">
              <div className="text-[10px] font-bold uppercase text-[#047857]">Vehículo</div>
              <div className="mt-0.5 text-xs font-black text-[#047857] sm:text-sm">
                {curso.motoIncluida === false ? 'Propio' : 'Incluido'}
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

          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Qué incluye y qué lograrás
            </h3>
            <div className="flex items-center gap-2 rounded-2xl border border-[#6EE7B7] bg-[#ECFDF5] px-3.5 py-2.5 text-xs font-bold text-[#047857]">
              <Bike size={15} className="shrink-0" aria-hidden="true" />
              <span>
                {curso.motoIncluida === false
                  ? 'Debes traer tu propio vehículo de práctica.'
                  : tiposMoto.length > 0
                    ? `Incluye vehículo de práctica: ${tiposMoto.join(' o ')}`
                    : 'Incluye vehículo de práctica.'}
              </span>
            </div>

            {queAprenderas.length > 0 && (
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
            )}
          </div>

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

          {(curso.vestimenta || curso.hidratacion || curso.casco) && (
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                Qué debes llevar a tu sesión
              </h3>
              <div className="space-y-2">
                {curso.vestimenta && (
                  <div className="flex items-start gap-2 text-xs text-slate-700">
                    <Shirt size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                    <TextoEnriquecido texto={curso.vestimenta} className="leading-relaxed" />
                  </div>
                )}
                {curso.hidratacion && (
                  <div className="flex items-start gap-2 text-xs text-slate-700">
                    <Droplet size={14} className="mt-0.5 shrink-0 text-[#2563EB]" aria-hidden="true" />
                    <TextoEnriquecido texto={curso.hidratacion} className="leading-relaxed" />
                  </div>
                )}
                {curso.casco && (
                  <div className="flex items-start gap-2 text-xs text-slate-700">
                    <HardHat size={14} className="mt-0.5 shrink-0 text-[#FF6B00]" aria-hidden="true" />
                    <TextoEnriquecido texto={curso.casco} className="leading-relaxed" />
                  </div>
                )}
              </div>
            </div>
          )}

          {prerequisitoLabel && (
            <div className="rounded-2xl border border-orange-200 bg-[#FFF7ED] p-3 text-xs text-slate-700">
              Recomendación previa: <strong>{prerequisitoLabel}</strong>.
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 bg-slate-50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] cursor-pointer rounded-2xl border-2 border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700"
          >
            Cerrar
          </button>

          {bloqueado ? (
            <button
              type="button"
              onClick={() => {
                onClose?.();
                onIrAPacks?.();
              }}
              className="flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#4F46E5] text-sm font-extrabold text-white hover:bg-[#4338CA]"
            >
              <span>Ver Pack Ruta Completa</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              disabled={sinId}
              onClick={() => {
                onClose?.();
                onInscribirme?.(curso.id);
              }}
              className="flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#2563EB] text-sm font-extrabold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <span>Reservar esta sesión</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ViaModalAvisoBasico({ avisoBasico, onConfirmar, onCerrar }) {
  const cerrarRef = useRef(null);
  const dialogRef = useModalAccesible({
    open: Boolean(avisoBasico),
    onClose: onCerrar,
    initialFocusRef: cerrarRef,
  });
  useBloquearScroll(Boolean(avisoBasico));

  if (!avisoBasico) return null;

  return (
    <div
      className="via-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCerrar}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-basico-titulo"
        aria-describedby="aviso-basico-descripcion"
        className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-[#FFF7ED] text-[#FF6B00]">
            <HeartHandshake size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 id="aviso-basico-titulo" className="text-lg font-black leading-tight text-slate-900">
              Antes de seguir, queremos cuidarte
            </h2>
            <p id="aviso-basico-descripcion" className="mt-2 text-sm leading-relaxed text-slate-600">
              Para que disfrutes al máximo tu <strong>{avisoBasico.nombre}</strong> y avances con
              soltura desde el inicio, recomendamos haber completado primero{' '}
              <strong>Equilibrio y Confianza (KM 0)</strong>.
            </p>
          </div>
        </div>

        <p className="rounded-2xl border border-orange-200 bg-[#FFF7ED] p-3 text-xs font-semibold leading-relaxed text-[#9A3412]">
          <AlertCircle size={14} className="mr-1 inline align-[-2px]" aria-hidden="true" />
          Si te saltas Equilibrio a propósito, el avance de la sesión será más lento porque aún no
          dominarás el equilibrio. Si ya sabes andar en bicicleta o tienes equilibrio, puedes continuar
          sin problema.
        </p>

        <p className="flex items-center gap-2 rounded-2xl border border-[#6EE7B7] bg-[#ECFDF5] p-3 text-xs font-semibold leading-relaxed text-[#047857]">
          <Clock size={14} className="shrink-0" aria-hidden="true" />
          Empezar en KM 0 hace toda la diferencia si hace años no ruedas.
        </p>

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            ref={cerrarRef}
            type="button"
            onClick={() => onConfirmar(true)}
            className="min-h-[48px] w-full cursor-pointer touch-manipulation rounded-2xl bg-[#2563EB] py-3 text-sm font-extrabold text-white transition-all hover:bg-[#1D4ED8] active:scale-[0.98]"
          >
            Hacer Equilibrio primero
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(false)}
            className="min-h-[48px] w-full cursor-pointer touch-manipulation rounded-2xl border-2 border-slate-200 bg-white py-3 text-sm font-extrabold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            Ya sé andar, continuar
          </button>
        </div>
      </div>
    </div>
  );
}
