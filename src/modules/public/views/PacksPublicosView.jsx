// @build: 2026-11-22 | id: FT-034-PACKS-PUBLICOS | desc: Packs públicos como tarjetas de ruta; anónimos ven el total completo sin exponer IDs/nombres de teóricos.
import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { AlertCircle, ChevronLeft, GraduationCap, Package, Sparkles, X } from 'lucide-react';
import LegalFooter from '../../shared/components/LegalFooter';
import TarjetaPackRuta from '../components/TarjetaPackRuta';
import { construirRutaAprendizaje } from '../utils/rutaAprendizaje';
import { packRequierePreciosTeoricos, resolverPrecioPackPublico } from '../utils/precioPackPublico';
import { PACKS_SOURCE } from '../utils/packsSource';
import useRevealRuta from '../hooks/useRevealRuta';
import useModalAccesible from '../hooks/useModalAccesible';
import { crearFlowId } from '../../inscripcion/hooks/useInscripcionState';

const APP_ID = 'motoescuela-pro-v1';

function CargandoPacks() {
  return (
    <main id="packs-contenido" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pb-12 ruta-offset-top sm:px-6">
      <h1 className="sr-only">Cargando packs</h1>
      <div className="ruta-skeleton h-8 w-40" />
      <div className="ruta-skeleton mt-3 h-12 w-11/12" />
      <div className="ruta-skeleton mt-3 h-5 w-full" />
      <div className="ruta-skeleton mt-2 h-5 w-4/5" />
      <div className="mt-8 space-y-4">
        <div className="ruta-skeleton h-80 w-full" />
        <div className="ruta-skeleton h-80 w-full" />
      </div>
    </main>
  );
}

export default function PacksPublicosView() {
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const [packs, setPacks] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cargadoPacks, setCargadoPacks] = useState(false);
  const [cargadoCursos, setCargadoCursos] = useState(false);
  const [errorPacks, setErrorPacks] = useState(null);
  const [errorCursos, setErrorCursos] = useState(null);
  // T-052: mapa id→precio de teóricos para calcular el total de anónimos; nunca se renderiza.
  const [preciosTeoricosPublicos, setPreciosTeoricosPublicos] = useState(null);
  const [errorPreciosTeoricos, setErrorPreciosTeoricos] = useState(false);
  const [reintento, setReintento] = useState(0);
  const [tienePackSesionesActivo, setTienePackSesionesActivo] = useState(false);
  const [cursoDetalle, setCursoDetalle] = useState(null);
  const cerrarPackRef = useRef(null);
  const packDialogRef = useModalAccesible({
    open: Boolean(cursoDetalle),
    onClose: () => setCursoDetalle(null),
    initialFocusRef: cerrarPackRef
  });
  const { rootRef, motionActivo } = useRevealRuta({
    revision: `${packs.length}:${cursos.length}`
  });

  const error = errorPacks || errorCursos;
  const anonimo = !ctx.fbUser;
  // ERR-023: a anónimos solo se les muestra el conteo de teóricos, nunca sus IDs/nombres/precios.
  const cursosTeoricosDisponibles = anonimo ? [] : (ctx.cursosTeoricos || []);
  // T-052: si falta el snapshot de precios, se leen los precios públicos de teóricos solo para el total.
  const necesitaTeoricosPublicos = anonimo && packs.some(packRequierePreciosTeoricos);
  const cargandoTeoricosPublicos = necesitaTeoricosPublicos && !preciosTeoricosPublicos && !errorPreciosTeoricos;
  const loading = !cargadoPacks || !cargadoCursos || cargandoTeoricosPublicos;

  useEffect(() => {
    // T-060: fuente configurable (default `packs`; staging puede usar `packsPublicos`).
    const packsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', PACKS_SOURCE);
    const q = query(packsRef, where('activo', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setErrorPacks(null);
        setCargadoPacks(true);
      },
      (err) => {
        console.error('[PacksPublicosView] Error cargando packs:', err);
        setErrorPacks('No pudimos cargar los packs. Revisa tu conexión e inténtalo de nuevo.');
        setCargadoPacks(true);
      }
    );
    return () => unsub();
  }, [reintento]);

  useEffect(() => {
    const cursosRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'cursos');
    const q = query(cursosRef, where('activo', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setErrorCursos(null);
        setCargadoCursos(true);
      },
      (err) => {
        console.error('[PacksPublicosView] Error cargando cursos:', err);
        setErrorCursos('No pudimos cargar las sesiones de los packs.');
        setCargadoCursos(true);
      }
    );
    return () => unsub();
  }, [reintento]);

  // T-052: lectura pública de precios de teóricos (allow read: if true).
  // Solo se conserva id→precio; los nombres/IDs no se pasan a la tarjeta ni se renderizan.
  useEffect(() => {
    if (!necesitaTeoricosPublicos) return undefined;
    let activo = true;
    setErrorPreciosTeoricos(false);
    setPreciosTeoricosPublicos(null);
    (async () => {
      try {
        const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'cursosTeoricos');
        const snap = await getDocs(ref);
        const mapa = new Map();
        snap.docs.forEach((docSnap) => {
          const precio = Number(docSnap.data()?.precio);
          if (Number.isFinite(precio)) mapa.set(String(docSnap.id), precio);
        });
        if (activo) setPreciosTeoricosPublicos(mapa);
      } catch (err) {
        console.warn('[PacksPublicosView] No se pudieron cargar precios de teóricos:', err?.code || err);
        if (activo) setErrorPreciosTeoricos(true);
      }
    })();
    return () => { activo = false; };
  }, [necesitaTeoricosPublicos, reintento]);

  // Bloqueo: usuario logueado con pack de sesiones activo no puede comprar otro
  useEffect(() => {
    const uid = ctx.fbUser?.uid;
    if (!uid) { setTienePackSesionesActivo(false); return undefined; }
    let activo = true;
    (async () => {
      try {
        const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservasPack');
        const q2 = query(ref, where('userId', '==', uid));
        const snap = await getDocs(q2);
        const tiene = snap.docs.some(d => {
          const p = d.data();
          const cursoIds = p.packSnapshot?.cursoIds || [];
          return (p.estadoPago === 'Aprobado' || p.estadoPago === 'Pendiente') && (p.estado === 'activo' || p.estado === undefined) && cursoIds.length > 0;
        });
        if (activo) setTienePackSesionesActivo(tiene);
      } catch (err) {
        if (activo) setTienePackSesionesActivo(false);
      }
    })();
    return () => { activo = false; };
  }, [ctx.fbUser?.uid]);

  const calcularPrecio = (pack) => {
    const cursosPack = (pack.cursoIds || [])
      .map(id => cursos.find(c => String(c.id) === String(id)))
      .filter(Boolean);

    // T-060: si la proyección pública trae `preciosPublicos` válidos, se usan tal cual
    // (misma validación monetaria que el resolutor anónimo); no se vuelven a sumar teóricos.
    const precioPublico = resolverPrecioPackPublico({ pack });
    if (precioPublico.estado === 'disponible' && precioPublico.origen === 'preciosPublicos') {
      return {
        base: precioPublico.base,
        final: precioPublico.final,
        ahorro: precioPublico.ahorro,
        cursosPack
      };
    }

    const baseCursos = cursosPack.reduce((acc, c) => acc + (Number(c.precioBase) || 0), 0);
    const baseTeoricos = pack.sumarTeoricosAlPrecio
      ? (pack.cursosTeoricosIncluidos || []).reduce((acc, ctId) => {
          const ct = (cursosTeoricosDisponibles || []).find(x => String(x.id) === String(ctId));
          return acc + (Number(ct?.precio) || 0);
        }, 0)
      : 0;
    const base = baseCursos + baseTeoricos;
    const desc = pack.descuentoTipo === 'porcentaje'
      ? (base * (Number(pack.descuentoValor) || 0)) / 100
      : (Number(pack.descuentoValor) || 0);
    const final = Math.max(0, base - desc);
    return { base, final, cursosPack, ahorro: base - final };
  };

  const ruta = useMemo(() => construirRutaAprendizaje(cursos, packs), [cursos, packs]);

  const reintentar = () => {
    setErrorPacks(null);
    setErrorCursos(null);
    setCargadoPacks(false);
    setCargadoCursos(false);
    setReintento(n => n + 1);
  };

  const abrirInscripcionPack = (pack) => {
    navigate('/inscripcion', {
      state: {
        esPack: true,
        packId: pack.id,
        origen: 'pack-publico',
        entryToken: crearFlowId()
      }
    });
  };

  const volver = (
    <button
      type="button"
      onClick={() => navigate('/')}
      className="ruta-volver-fijo fixed left-3 z-40 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm ring-1 ring-slate-200 transition-transform duration-150 hover:bg-white active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      aria-label="Volver"
    >
      <ChevronLeft size={24} aria-hidden="true" />
    </button>
  );

  const skipLink = (
    <a
      href="#packs-contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-indigo-700 focus:shadow-lg"
    >
      Saltar a los packs
    </a>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        {skipLink}
        {volver}
        <main id="packs-contenido" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pb-12 ruta-offset-top sm:px-6">
          <div role="alert" className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <h1 className="text-2xl font-black text-slate-900">No pudimos cargar los packs</h1>
                <p className="mt-1 break-words text-sm text-slate-600">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={reintentar}
              className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-transform duration-150 hover:bg-indigo-700 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Reintentar
            </button>
          </div>
        </main>
        <LegalFooter />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {skipLink}
        {volver}
        <CargandoPacks />
        <LegalFooter />
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`${motionActivo ? 'ruta-motion' : ''} min-h-screen bg-slate-50`}>
      {skipLink}

      {volver}

      <main id="packs-contenido" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pb-12 ruta-offset-top sm:px-6">
        <header className="pb-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700">
            <Sparkles size={13} aria-hidden="true" />
            Ruta de sesiones completa
          </p>
          <h1 className="mt-3 break-words text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
            Packs de la ruta
          </h1>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-600 sm:text-lg">
            Combina etapas en una sola compra y avanza con acompañamiento de principio a fin.
            Cada pack indica cuántas etapas de la ruta cubre.
          </p>
          <button
            type="button"
            onClick={() => navigate('/sesiones')}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-sm font-bold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Ver sesiones individuales
            <Package size={16} aria-hidden="true" />
          </button>
        </header>

        <section aria-labelledby="packs-lista-titulo">
          <h2 id="packs-lista-titulo" className="text-2xl font-black text-slate-900">
            Packs disponibles
          </h2>

          {ruta.packs.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
              <Package size={36} aria-hidden="true" className="mx-auto text-slate-400" />
              <p className="mt-2 text-sm text-slate-500">No hay packs disponibles por el momento.</p>
              <button
                type="button"
                onClick={() => navigate('/sesiones')}
                className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-transform duration-150 hover:bg-indigo-700 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Ver sesiones
              </button>
            </div>
          ) : (
            <div data-ruta-stagger className="mt-3 space-y-4">
              {ruta.packs.map((pack) => {
                const precio = anonimo
                  ? resolverPrecioPackPublico({ pack, cursos, preciosTeoricos: preciosTeoricosPublicos })
                  : calcularPrecio(pack);
                const bloqueado = (pack.cursoIds || []).length > 0 && tienePackSesionesActivo;
                return (
                  <div key={String(pack.id)} data-ruta-reveal>
                    <TarjetaPackRuta
                      pack={pack}
                      precio={precio}
                      anonimo={anonimo}
                      cursosTeoricos={cursosTeoricosDisponibles}
                      bloqueado={bloqueado}
                      onComprar={abrirInscripcionPack}
                      onVerCurso={setCursoDetalle}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="packs-alternativa-titulo" className="mt-10 rounded-2xl bg-white p-5 text-center shadow-sm">
          <GraduationCap size={36} aria-hidden="true" className="mx-auto text-indigo-500" />
          <h2 id="packs-alternativa-titulo" className="mt-2 text-xl font-black text-slate-900">
            ¿Prefieres una sesión individual?
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            También puedes tomar cada sesión por separado según tu nivel actual.
          </p>
          <button
            type="button"
            onClick={() => navigate('/sesiones')}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition-transform duration-150 hover:bg-indigo-50 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Ver sesiones individuales
          </button>
        </section>
      </main>

      <LegalFooter />

      {cursoDetalle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCursoDetalle(null)}
        >
          <div
            ref={packDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pack-curso-detalle-titulo"
            tabIndex={-1}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="pack-curso-detalle-titulo" className="break-words text-lg font-black text-slate-900">
                  {cursoDetalle.nombre}
                </h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Detalles de la sesión
                </p>
              </div>
              <button
                ref={cerrarPackRef}
                type="button"
                onClick={() => setCursoDetalle(null)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                aria-label="Cerrar"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 text-sm text-slate-700">
              <p className="break-words">
                {cursoDetalle.descripcion || cursoDetalle.queAprenderas || 'Sin descripción detallada.'}
              </p>
              {cursoDetalle.dirigidoA && (
                <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                  <strong>Dirigido a:</strong> {cursoDetalle.dirigidoA}
                </div>
              )}
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setCursoDetalle(null)}
                className="min-h-[44px] w-full rounded-xl bg-indigo-600 py-2.5 font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
