// @build: 2026-11-24 | id: F-02-PACKS-VIA | desc: Página pública de packs rediseñada como "Packs de La Vía" con datos reales.
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { AlertCircle, ArrowRight, Compass, Package, RotateCcw } from 'lucide-react';
import LegalFooter from '../../shared/components/LegalFooter';
import { construirRutaAprendizaje } from '../utils/rutaAprendizaje';
import { packRequierePreciosTeoricos, resolverPrecioPackPublico } from '../utils/precioPackPublico';
import { recargosSedeDePack } from '../../inscripcion/utils/packPublico';
import { PACKS_SOURCE } from '../utils/packsSource';
import { crearFlowId } from '../../inscripcion/hooks/useInscripcionState';
import PacksNavegacion from '../components/packs-via/PacksNavegacion';
import PackHero from '../components/packs-via/PackHero';
import PackTarjeta from '../components/packs-via/PackTarjeta';
import {
  PackBarraInferior,
  PackComparador,
  PackFaq,
  PackModalSesion,
  PackSedeFiltros,
} from '../components/packs-via/PackExtras';
import {
  precioConSede,
  recomendacionPack,
  sedesDePacks,
  sesionesDelPack,
  transmisionesDisponibles,
} from '../components/packs-via/packsViaDatos';

const APP_ID = 'motoescuela-pro-v1';

function CargandoPacks() {
  return (
    <main id="packs-contenido" tabIndex={-1} className="mx-auto w-full max-w-3xl animate-pulse space-y-5 px-4 pb-16 pt-[76px] sm:px-6">
      <h1 className="sr-only">Cargando packs</h1>
      <div className="h-64 w-full rounded-3xl bg-slate-200" />
      <div className="h-24 w-full rounded-2xl bg-slate-200" />
      <div className="h-80 w-full rounded-3xl bg-slate-200" />
    </main>
  );
}

function ErrorPacks({ mensaje, onReintentar }) {
  return (
    <main id="packs-contenido" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pb-16 pt-[76px] sm:px-6">
      <div role="alert" className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle size={24} aria-hidden="true" className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <h1 className="text-xl font-black text-slate-900">No pudimos cargar los packs</h1>
            <p className="mt-1 break-words text-sm leading-relaxed text-slate-600">{mensaje}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReintentar}
          className="mt-5 inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#1D4ED8]"
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Reintentar</span>
        </button>
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
  const [preciosTeoricosPublicos, setPreciosTeoricosPublicos] = useState(null);
  const [errorPreciosTeoricos, setErrorPreciosTeoricos] = useState(false);
  const [reintento, setReintento] = useState(0);
  const [tienePackSesionesActivo, setTienePackSesionesActivo] = useState(false);
  const [cursoDetalle, setCursoDetalle] = useState(null);
  const [contacto, setContacto] = useState(null);

  const [experiencia, setExperiencia] = useState('cero');
  const [transmision, setTransmision] = useState('auto');
  const [sedeId, setSedeId] = useState(null);
  const [filtro, setFiltro] = useState('todos');

  const error = errorPacks || errorCursos;
  const anonimo = !ctx.fbUser;
  const cursosTeoricosDisponibles = anonimo ? [] : (ctx.cursosTeoricos || []);

  useEffect(() => {
    const packsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', PACKS_SOURCE);
    const q = query(packsRef, where('activo', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
        setCursos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'informacionPublica', 'contacto'));
        if (activo && snap.exists()) setContacto(snap.data());
      } catch (err) {
        console.warn('[PacksPublicosView] Error leyendo contacto:', err?.code || err);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const necesitaTeoricosPublicos = anonimo && packs.some(packRequierePreciosTeoricos);
  const cargandoTeoricosPublicos =
    necesitaTeoricosPublicos && !preciosTeoricosPublicos && !errorPreciosTeoricos;
  const loading = !cargadoPacks || !cargadoCursos || cargandoTeoricosPublicos;

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
    return () => {
      activo = false;
    };
  }, [necesitaTeoricosPublicos, reintento]);

  useEffect(() => {
    const uid = ctx.fbUser?.uid;
    if (!uid) {
      setTienePackSesionesActivo(false);
      return undefined;
    }
    let activo = true;
    (async () => {
      try {
        const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservasPack');
        const q2 = query(ref, where('userId', '==', uid));
        const snap = await getDocs(q2);
        const tiene = snap.docs.some((d) => {
          const p = d.data();
          const cursoIds = p.packSnapshot?.cursoIds || [];
          return (
            (p.estadoPago === 'Aprobado' || p.estadoPago === 'Pendiente') &&
            (p.estado === 'activo' || p.estado === undefined) &&
            cursoIds.length > 0
          );
        });
        if (activo) setTienePackSesionesActivo(tiene);
      } catch {
        if (activo) setTienePackSesionesActivo(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [ctx.fbUser?.uid]);

  const packsConRecargos = useMemo(
    () =>
      (Array.isArray(packs) ? packs : []).map((pack) =>
        Array.isArray(pack?.recargosSede)
          ? pack
          : { ...pack, recargosSede: recargosSedeDePack(pack, ctx.sedes || []) }
      ),
    [packs, ctx.sedes]
  );

  const ruta = useMemo(
    () => construirRutaAprendizaje(cursos, packsConRecargos),
    [cursos, packsConRecargos]
  );

  const packsListos = useMemo(
    () => ruta.packs.filter((pack) => sesionesDelPack(pack).length > 0),
    [ruta.packs]
  );

  const preciosPorPack = useMemo(() => {
    const mapa = new Map();
    packsListos.forEach((pack) => {
      const precio = resolverPrecioPackPublico({
        pack,
        cursos,
        preciosTeoricos: anonimo ? preciosTeoricosPublicos : cursosTeoricosDisponibles,
      });
      mapa.set(String(pack.id), precio);
    });
    return mapa;
  }, [packsListos, cursos, anonimo, preciosTeoricosPublicos, cursosTeoricosDisponibles]);

  const sedesLista = useMemo(() => {
    const base = sedesDePacks(packsListos);
    const enriquecidas = base.map((sede) => {
      const completa = (ctx.sedes || []).find((item) => String(item.id) === String(sede.id));
      return {
        ...sede,
        nombre: (completa?.nombre && String(completa.nombre).trim()) || sede.nombre,
        ciudad: completa?.ciudad || null,
      };
    });
    return enriquecidas;
  }, [packsListos, ctx.sedes]);

  useEffect(() => {
    if (sedesLista.length === 0) {
      setSedeId(null);
      return;
    }
    if (!sedeId || !sedesLista.some((sede) => sede.id === sedeId)) {
      setSedeId(sedesLista[0].id);
    }
  }, [sedesLista, sedeId]);

  const transmisiones = useMemo(() => transmisionesDisponibles(packsListos), [packsListos]);

  useEffect(() => {
    if (transmisiones.length > 0 && !transmisiones.includes(transmision)) {
      setTransmision(transmisiones[0]);
    }
  }, [transmisiones, transmision]);

  const calculoDe = (pack) => {
    if (!pack) return null;
    return precioConSede({ precio: preciosPorPack.get(String(pack.id)), pack, sedeId });
  };

  const recomendado = useMemo(
    () => recomendacionPack({ packs: packsListos, experiencia, transmision }),
    [packsListos, experiencia, transmision]
  );

  const calculoRecomendado = useMemo(
    () => (recomendado ? calculoDe(recomendado) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recomendado, preciosPorPack, sedeId]
  );

  const conteos = useMemo(
    () => ({
      todos: packsListos.length,
      completa: packsListos.filter((pack) => pack.cubreRutaCompleta).length,
      basica: packsListos.filter((pack) => !pack.cubreRutaCompleta).length,
    }),
    [packsListos]
  );

  const packsFiltrados = useMemo(() => {
    const base = packsListos.filter((pack) => {
      if (filtro === 'completa') return pack.cubreRutaCompleta;
      if (filtro === 'basica') return !pack.cubreRutaCompleta;
      return true;
    });
    return [...base].sort((a, b) => {
      if (a.id === recomendado?.id) return -1;
      if (b.id === recomendado?.id) return 1;
      return 0;
    });
  }, [packsListos, filtro, recomendado]);

  const reintentar = () => {
    setErrorPacks(null);
    setErrorCursos(null);
    setCargadoPacks(false);
    setCargadoCursos(false);
    setReintento((n) => n + 1);
  };

  const abrirInscripcionPack = (pack) => {
    if (!pack?.id) return;
    navigate('/inscripcion', {
      state: {
        esPack: true,
        packId: pack.id,
        origen: 'pack-publico',
        entryToken: crearFlowId(),
      },
    });
  };

  const irAlPack = (pack) => {
    setFiltro('todos');
    if (typeof document === 'undefined') return;
    window.setTimeout(() => {
      document.getElementById(`pack-card-${pack.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const irASede = () => {
    if (typeof document === 'undefined') return;
    document.getElementById('packs-sede-filtros')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const whatsappNumero = contacto?.whatsapp ? String(contacto.whatsapp).replace(/\D/g, '') : null;
  const whatsappHref = whatsappNumero
    ? `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(
        `Hola Moto App, quiero información sobre ${
          recomendado?.nombre || 'un pack de sesiones'
        }${sedesLista.find((s) => s.id === sedeId)?.nombre ? ` en ${sedesLista.find((s) => s.id === sedeId).nombre}` : ''}.`
      )}`
    : null;

  const estilosVia = (
    <style>{`
      @keyframes viaFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .via-fade-in { animation: viaFadeIn 0.24s ease-out both; }
      .via-ancla { scroll-margin-top: 7rem; }
      @media (prefers-reduced-motion: reduce) {
        .via-fade-in { animation: none; }
      }
    `}</style>
  );

  const skipLink = (
    <a
      href="#packs-contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-blue-700 focus:shadow-lg"
    >
      Saltar a los packs
    </a>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {estilosVia}
        {skipLink}
        <PacksNavegacion onVolver={() => navigate('/')} onSesiones={() => navigate('/sesiones')} />
        <ErrorPacks mensaje={error} onReintentar={reintentar} />
        <LegalFooter />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {estilosVia}
        {skipLink}
        <PacksNavegacion onVolver={() => navigate('/')} onSesiones={() => navigate('/sesiones')} />
        <CargandoPacks />
        <LegalFooter />
      </div>
    );
  }

  const sedeActual = sedesLista.find((sede) => sede.id === sedeId) || null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] font-sans text-slate-900 antialiased">
      {estilosVia}
      {skipLink}

      <PacksNavegacion onVolver={() => navigate('/')} onSesiones={() => navigate('/sesiones')} />

      <main id="packs-contenido" tabIndex={-1} className="pb-10 pt-14">
        <PackHero
          experiencia={experiencia}
          setExperiencia={setExperiencia}
          transmision={transmision}
          setTransmision={setTransmision}
          transmisiones={transmisiones}
          recomendado={recomendado}
          calculoIdeal={calculoRecomendado}
          sedeActual={sedeActual}
          onIrARecomendado={() => recomendado && irAlPack(recomendado)}
        />

        <div id="packs-sede-filtros">
          <PackSedeFiltros
            sedes={sedesLista}
            sedeId={sedeId}
            onSede={setSedeId}
            filtro={filtro}
            onFiltro={setFiltro}
            conteos={conteos}
            tienePackActivo={tienePackSesionesActivo}
          />
        </div>

        <section aria-labelledby="packs-lista-titulo" className="mx-auto mt-5 w-full max-w-3xl space-y-4 px-4 sm:px-6">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <h2 id="packs-lista-titulo" className="text-xl font-black text-slate-900 sm:text-2xl">
              Packs disponibles
            </h2>
            <span className="text-[11px] font-bold text-slate-500">
              {anonimo ? 'Vista pública' : 'Sesión iniciada'}
            </span>
          </div>

          {packsListos.length === 0 ? (
            <div className="space-y-3 rounded-3xl border-2 border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <Package size={40} aria-hidden="true" className="mx-auto text-slate-400" />
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  No hay packs disponibles por el momento
                </h3>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Mientras activamos nuevas opciones, puedes iniciar con cualquier sesión individual
                  de La Vía.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/sesiones')}
                className="mt-2 inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white"
              >
                <span>Ver sesiones individuales</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : packsFiltrados.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
              No hay packs en este filtro. Prueba con “Todos”.
            </div>
          ) : (
            <div className="space-y-5">
              {packsFiltrados.map((pack) => {
                const calculo = calculoDe(pack);
                const idsTeoricos = Array.isArray(pack.cursosTeoricosIncluidos)
                  ? pack.cursosTeoricosIncluidos
                  : [];
                const teoricosCount =
                  Number.isInteger(pack.teoricosCount) && pack.teoricosCount >= 0
                    ? pack.teoricosCount
                    : idsTeoricos.length;
                const teoricosResueltos = anonimo
                  ? []
                  : idsTeoricos
                      .map((id) => cursosTeoricosDisponibles.find((teorico) => String(teorico.id) === String(id)))
                      .filter(Boolean);

                return (
                  <PackTarjeta
                    key={String(pack.id)}
                    pack={pack}
                    calculo={calculo}
                    sedeActual={sedeActual}
                    anonimo={anonimo}
                    teoricosCount={teoricosCount}
                    teoricosResueltos={teoricosResueltos}
                    bloqueado={tienePackSesionesActivo}
                    recomendado={pack.id === recomendado?.id}
                    onComprar={abrirInscripcionPack}
                    onVerSesion={setCursoDetalle}
                    onIrPortal={() => navigate('/portal')}
                    onCambiarSede={irASede}
                  />
                );
              })}
            </div>
          )}
        </section>

        {packsListos.length > 0 && (
          <PackComparador
            pack={recomendado}
            calculo={calculoRecomendado}
            bloqueado={tienePackSesionesActivo}
            onReservar={abrirInscripcionPack}
            onCambiarSede={irASede}
          />
        )}

        <PackFaq />

        <section aria-labelledby="packs-alternativa-titulo" className="mx-auto mt-8 w-full max-w-3xl px-4 sm:px-6">
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <Compass size={24} aria-hidden="true" />
            </div>
            <h2 id="packs-alternativa-titulo" className="text-xl font-black text-slate-900">
              ¿Prefieres empezar con una sola sesión?
            </h2>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">
              También puedes probar primero con Equilibrio y Confianza o una sesión individual según
              tu nivel actual.
            </p>
            <button
              type="button"
              onClick={() => navigate('/sesiones')}
              className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-800 transition-all hover:bg-slate-50 active:scale-[0.98]"
            >
              <span>Ver sesiones individuales</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <div className="pb-24">
        <LegalFooter />
      </div>

      <PackBarraInferior
        pack={recomendado}
        calculo={calculoRecomendado}
        whatsappHref={whatsappHref}
        bloqueado={tienePackSesionesActivo}
        visible={!cursoDetalle}
        onReservar={abrirInscripcionPack}
        onPortal={() => navigate('/portal')}
        onCambiarSede={irASede}
      />

      <PackModalSesion curso={cursoDetalle} onClose={() => setCursoDetalle(null)} />
    </div>
  );
}
