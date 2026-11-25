// @build: 2026-11-24 | id: TEORICO-PUBLICO-VIEW | desc: Gran hub público de formación: Reto Vial, emuladores y cursos
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import {
  BookOpen,
  BookMarked,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import ModalDetalleTeorico from '../components/ModalDetalleTeorico';
import LegalFooter from '../../shared/components/LegalFooter';
import { EMULADOS } from '../../teorico/emuladosCatalogo';

const APP_ID = 'motoescuela-pro-v1';

const formatearDuracionAcceso = (duracion) => {
  if (!duracion || duracion === 'vida') return 'Acceso de por vida';
  return `Acceso por ${duracion} días`;
};

function TarjetaSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="h-11 w-11 rounded-2xl bg-slate-100" />
        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mt-5 h-5 w-3/4 rounded bg-slate-100" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-6 w-24 rounded-full bg-slate-100" />
        <div className="h-6 w-24 rounded-full bg-slate-100" />
      </div>
      <div className="mt-6 h-11 w-full rounded-xl bg-slate-100" />
    </div>
  );
}

export default function TeoricoPublicoView() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'cursosTeoricos');
    const q = query(ref, where('activo', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const activos = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
      setModulos(activos);
      setLoading(false);
    }, (err) => {
      console.warn('[TeoricoPublicoView] Error cargando módulos:', err.code);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="relative overflow-hidden bg-[#0f172a] text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-12 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-24 sm:pt-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Volver al inicio"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
            <span className="text-sm font-black tracking-tight">
              MOTO<span className="text-blue-400"> APP</span>
            </span>
          </div>

          <div className="mt-8 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300">
              Hub de formación
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Aprende, practica y domina tu moto
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              Empieza con el Reto Vial, entrena con emuladores interactivos y sigue con los
              cursos. Todo desde tu teléfono.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">
                <Target size={14} aria-hidden="true" /> Test gratuito
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">
                <Zap size={14} aria-hidden="true" /> 4 emuladores
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">
                <BookOpen size={14} aria-hidden="true" /> Cursos en línea
              </li>
            </ul>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section aria-labelledby="reto-vial-titulo" className="-mt-8 sm:-mt-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1d4ed8] via-[#1e40af] to-[#0f172a] p-5 text-white shadow-[0_20px_50px_rgba(29,78,216,0.35)] sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-400/25 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />

            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-50 ring-1 ring-white/25">
                  <Sparkles size={14} aria-hidden="true" />
                  Test gratuito · sin cuenta
                </span>
                <h2 id="reto-vial-titulo" className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
                  Reto Vial
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
                  Mide tu nivel con preguntas de Ley Venezolana y técnicas MSF. Elige práctica
                  guiada o examen simulado y recibe tu resultado al instante.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-blue-50">
                  <li className="rounded-full bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15">14 preguntas</li>
                  <li className="rounded-full bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15">Ley + técnica</li>
                  <li className="rounded-full bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15">2 modalidades</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm sm:p-5">
                <ul className="space-y-2.5 text-sm text-blue-50">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-300" aria-hidden="true" />
                    Diagnóstico integral o práctica por tema
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck size={16} className="shrink-0 text-sky-300" aria-hidden="true" />
                    Feedback inmediato en modo guiado
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock size={16} className="shrink-0 text-amber-300" aria-hidden="true" />
                    Resultados y mejor puntaje en tu perfil
                  </li>
                </ul>
                <Link
                  to="/evaluacion"
                  className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#1d4ed8] transition-transform hover:bg-blue-50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Play size={17} className="fill-current" aria-hidden="true" />
                  Hacer el Reto Vial
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="emuladores-titulo" className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="emuladores-titulo" className="text-xl font-black tracking-tight sm:text-2xl">
                Emuladores
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Práctica interactiva, separada del test. Cada uno con su página.
              </p>
            </div>
            <Link
              to="/emulados"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-bold text-[#1d4ed8] hover:bg-blue-50"
            >
              Ver todos
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EMULADOS.map((modulo) => {
              const Icono = modulo.icono;
              return (
                <Link
                  key={modulo.id}
                  to={`/emulados/${modulo.id}`}
                  className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${modulo.accent}`}>
                    <Icono size={19} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black leading-snug text-slate-900">
                      {modulo.titulo}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold text-slate-500">
                      {modulo.detalle}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="modulos-titulo" className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="modulos-titulo" className="text-xl font-black tracking-tight sm:text-2xl">
                Módulos formativos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? 'Cargando formación educativa...'
                  : modulos.length > 0
                    ? `${modulos.length} ${modulos.length === 1 ? 'módulo disponible' : 'módulos disponibles'}`
                    : 'Contenido educativo para motociclistas'}
              </p>
            </div>
            <BookOpen className="hidden shrink-0 text-slate-300 sm:block" size={26} aria-hidden="true" />
          </div>

          {loading ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
              <TarjetaSkeleton />
              <TarjetaSkeleton />
              <TarjetaSkeleton />
            </div>
          ) : modulos.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <BookMarked size={44} className="mx-auto text-slate-300" aria-hidden="true" />
              <p className="mt-3 font-bold text-slate-800">Aún no hay módulos disponibles</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Estamos preparando nuevo contenido. Mientras tanto, puedes probar el Reto Vial.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
              {modulos.map(modulo => {
                const precio = Number(modulo.precio) || 0;
                const esGratis = precio === 0;
                return (
                  <article
                    key={modulo.id}
                    className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                        <BookOpen size={22} aria-hidden="true" />
                      </div>
                      <span
                        className={
                          esGratis
                            ? 'rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700 ring-1 ring-emerald-100'
                            : 'rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-800 ring-1 ring-slate-200'
                        }
                      >
                        {esGratis ? 'Gratis' : `$${precio}`}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-black leading-snug text-slate-900">
                      {modulo.nombre}
                    </h3>

                    {modulo.descripcion && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                        {modulo.descripcion}
                      </p>
                    )}

                    <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
                        <Clock size={14} aria-hidden="true" />
                        {formatearDuracionAcceso(modulo.duracionAcceso)}
                      </li>
                      <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
                        <BookMarked size={14} aria-hidden="true" />
                        {modulo.totalModulos || 0} módulos
                      </li>
                      <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200">
                        <Sparkles size={14} aria-hidden="true" />
                        {modulo.totalQuizzes || 0} retos
                      </li>
                    </ul>

                    <div className="mt-auto pt-5">
                      <button
                        type="button"
                        onClick={() => setDetalle(modulo)}
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-4 py-3 text-sm font-bold text-white transition-transform hover:bg-blue-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        {esGratis ? 'Comenzar' : 'Ver detalle'}
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {detalle && (
        <ModalDetalleTeorico
          modulo={detalle}
          onClose={() => setDetalle(null)}
        />
      )}

      <LegalFooter />
    </div>
  );
}
