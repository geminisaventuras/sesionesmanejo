// @build: 2026-11-24 | id: EMULADOS-VIEW | desc: Hub y páginas por categoría de los emuladores del Reto Vial
import React, { Suspense } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Smartphone, Sparkles } from 'lucide-react';
import LegalFooter from '../shared/components/LegalFooter';
import { EMULADOS, obtenerEmulado } from './emuladosCatalogo';

function CargandoSimulador() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1d4ed8]" />
        <p className="mt-3 text-sm text-slate-500">Cargando simulador…</p>
      </div>
    </div>
  );
}

function HubEmulados() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="relative overflow-hidden bg-[#0f172a] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-12 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/teorico"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Volver al hub de formación"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </Link>
            <span className="text-sm font-black tracking-tight">
              MOTO<span className="text-blue-400"> APP</span>
            </span>
          </div>

          <div className="mt-8 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-200 ring-1 ring-white/15">
              <Sparkles size={14} aria-hidden="true" />
              Práctica interactiva
            </span>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Emuladores
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              Practica situaciones reales sin riesgo: posiciones en el carril, inspección de la moto,
              curvas y controles. Sin registro y pensado para el teléfono.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">
                <Smartphone size={14} aria-hidden="true" /> Desde el móvil
              </li>
              <li className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">Sin registro</li>
              <li className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">4 categorías</li>
            </ul>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section aria-labelledby="emulados-titulo" className="-mt-7 sm:-mt-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="emulados-titulo" className="text-xl font-black tracking-tight sm:text-2xl">
                  Elige una categoría
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cada emulador abre su propia página a pantalla completa.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {EMULADOS.map((modulo) => {
                const Icono = modulo.icono;
                return (
                  <Link
                    key={modulo.id}
                    to={`/emulados/${modulo.id}`}
                    className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${modulo.accent}`}>
                        <Icono size={22} aria-hidden="true" />
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        {modulo.detalle}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-black leading-snug text-slate-900">
                      {modulo.titulo}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{modulo.resumen}</p>
                    <span className="mt-5 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-4 py-3 text-sm font-bold text-white transition-colors group-hover:bg-blue-700">
                      <Play size={16} aria-hidden="true" />
                      Abrir simulador
                      <ChevronRight size={16} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <h2 className="text-base font-black text-slate-900">¿Buscas el test?</h2>
            <p className="mt-1 text-sm text-slate-600">
              El Reto Vial vive en su propia sección: preguntas de Ley Venezolana y técnicas MSF.
            </p>
          </div>
          <Link
            to="/evaluacion"
            className="mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 sm:mt-0 sm:w-auto"
          >
            Ir al Reto Vial
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}

function DetalleEmulado() {
  const { categoriaId } = useParams();
  const emulado = obtenerEmulado(categoriaId);

  if (!emulado) return <Navigate to="/emulados" replace />;

  const Simulador = emulado.Componente;

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-[#F1F5F9] text-slate-900">
      <header className="z-30 shrink-0 border-b border-slate-800 bg-[#0F172A] text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-2.5 py-2 sm:px-4">
          <Link
            to="/emulados"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Volver a Emuladores"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Emuladores</span>
          </Link>
          <span className="min-w-0 truncate text-[11px] font-semibold text-slate-400 sm:text-xs">
            {emulado.titulo}
          </span>
          <Link
            to="/teorico"
            className="ml-auto shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white sm:text-xs"
          >
            Salir
          </Link>
        </div>
      </header>

      <div className="emulado-host min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <style>{'.emulado-host .min-h-screen{min-height:100%;}'}</style>
        <Suspense fallback={<CargandoSimulador />}>
          <Simulador />
        </Suspense>
      </div>
    </div>
  );
}

export default function EmuladosView() {
  const { categoriaId } = useParams();
  return categoriaId ? <DetalleEmulado /> : <HubEmulados />;
}
