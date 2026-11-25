// @build: 2026-11-24 | id: F-02-VIA-REDISENO | desc: Página pública de cursos (/sesiones) replicando el diseño "La Vía" con datos reales.
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { CURSO_SECUENCIA } from '../../../constants/cursoSecuencia';
import { AlertCircle, RotateCcw } from 'lucide-react';
import LegalFooter from '../../shared/components/LegalFooter';
import { construirRutaAprendizaje } from '../utils/rutaAprendizaje';
import { PACKS_SOURCE } from '../utils/packsSource';
import { resolverPrecioPackPublico } from '../utils/precioPackPublico';
import { recargosSedeDePack } from '../../inscripcion/utils/packPublico';
import { etiquetaCortaSede, nombreSedeCanonico } from '../../shared/utils/sedesHelpers';
import { crearFlowId } from '../../inscripcion/hooks/useInscripcionState';
import { AppContext } from '../../../context/AppContextValue';
import ViaNavegacion from '../components/via/ViaNavegacion';
import ViaHero from '../components/via/ViaHero';
import ViaCarretera from '../components/via/ViaCarretera';
import ViaPack from '../components/via/ViaPack';
import { ViaBarraInferior, ViaContacto, ViaMiedos, ViaSedes, ViaSelectorSede } from '../components/via/ViaExtras';
import { ViaModalAvisoBasico, ViaModalDetalle } from '../components/via/ViaModales';
import {
  esBasico,
  prerequisitoLabel,
  precioCursoConSede,
  recomendacionPara,
  scrollASeccion,
  transmisionDePack,
} from '../components/via/viaDatos';

const APP_ID = 'motoescuela-pro-v1';

const capitalizar = (texto) => {
  const valor = String(texto || '').trim();
  return valor ? valor.charAt(0).toUpperCase() + valor.slice(1) : '';
};

function CargandoRuta() {
  return (
    <main
      id="ruta-contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl animate-pulse space-y-5 px-4 pb-16 pt-[112px] sm:px-6"
    >
      <h1 className="sr-only">Cargando ruta de sesiones</h1>
      <div className="h-52 w-full rounded-3xl bg-slate-200" />
      <div className="h-44 w-full rounded-3xl bg-slate-200" />
      <div className="space-y-4 pl-12">
        <div className="h-56 w-full rounded-3xl bg-slate-200" />
        <div className="h-56 w-full rounded-3xl bg-slate-200" />
      </div>
    </main>
  );
}

function ErrorRuta({ mensaje, onReintentar }) {
  return (
    <main
      id="ruta-contenido"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl px-4 pb-16 pt-[112px] sm:px-6"
    >
      <div role="alert" className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle size={24} aria-hidden="true" className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <h1 className="text-xl font-black text-slate-900">No pudimos cargar tu ruta</h1>
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

export default function CursosPublicosView() {
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const [cursos, setCursos] = useState([]);
  const [packs, setPacks] = useState([]);
  const [contacto, setContacto] = useState(null);
  const [sedes, setSedes] = useState(null);
  const [cursoDetalle, setCursoDetalle] = useState(null);
  const [avisoBasico, setAvisoBasico] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCursos, setErrorCursos] = useState(null);
  const [errorPacks, setErrorPacks] = useState(null);
  const [reintento, setReintento] = useState(0);

  const [experiencia, setExperiencia] = useState('cero');
  const [tipoMoto, setTipoMoto] = useState('auto');
  const [sedeActivaId, setSedeActivaId] = useState(null);
  const [activa, setActiva] = useState('equilibrio');
  const [enPacks, setEnPacks] = useState(false);

  useEffect(() => {
    const cursosRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'cursos');
    const q = query(cursosRef, where('activo', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const activos = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ordenA = CURSO_SECUENCIA[a.tipoCurso]?.orden || 99;
            const ordenB = CURSO_SECUENCIA[b.tipoCurso]?.orden || 99;
            return ordenA - ordenB;
          });
        setCursos(activos);
        setErrorCursos(null);
        setLoading(false);
      },
      (error) => {
        console.error('[CursosPublicosView] Error cargando cursos:', error);
        setErrorCursos('Revisa tu conexión e inténtalo de nuevo. No se muestran datos parciales.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [reintento]);

  useEffect(() => {
    const packsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', PACKS_SOURCE);
    const q = query(packsRef, where('activo', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setErrorPacks(null);
      },
      (error) => {
        console.error('[CursosPublicosView] Error cargando packs:', error);
        setErrorPacks('No pudimos cargar los packs en este momento.');
      }
    );

    return () => unsub();
  }, [reintento]);

  useEffect(() => {
    let activo = true;
    async function cargarContacto() {
      try {
        const contactoSnap = await getDoc(doc(db, 'informacionPublica', 'contacto'));
        if (activo && contactoSnap.exists()) setContacto(contactoSnap.data());
      } catch (error) {
        console.warn('[CursosPublicosView] Error leyendo contacto:', error);
      }
    }

    cargarContacto();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'informacionPublica', 'sedes'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSedes(docSnap.data());
        } else {
          console.warn('[CursosPublicosView] Documento sedes no encontrado');
          setSedes({});
        }
      },
      (error) => {
        console.error('[CursosPublicosView] Error leyendo sedes:', error);
        setSedes({});
      }
    );

    return () => unsubscribe();
  }, []);

  const catalogos = useMemo(
    () => ({ estados: ctx.estados || [], municipios: ctx.municipios || [], ciudades: ctx.ciudades || [] }),
    [ctx.estados, ctx.municipios, ctx.ciudades]
  );

  const sedesLista = useMemo(() => {
    if (!sedes) return [];
    return Object.entries(sedes)
      .map(([clave, valor]) => {
        if (!valor || typeof valor !== 'object') return null;
        // La proyección pública puede incluir metadatos; solo se pinta una sede
        // con nombre o id real.
        if (!valor.nombre && valor.id == null) return null;
        const id = valor.id == null ? clave : valor.id;
        const sede = { ...valor, id };
        const canonico = nombreSedeCanonico(sede);
        const corta = etiquetaCortaSede(sede, catalogos);
        return {
          ...sede,
          nombreMostrado: corta !== '—' ? corta : canonico !== '—' ? canonico : capitalizar(clave),
          nombreCorto: canonico !== '—' ? canonico : capitalizar(clave),
        };
      })
      .filter(Boolean);
  }, [sedes, catalogos]);

  useEffect(() => {
    if (sedesLista.length === 0) return;
    if (!sedeActivaId || !sedesLista.some((sede) => sede.id === sedeActivaId)) {
      setSedeActivaId(sedesLista[0].id);
    }
  }, [sedesLista, sedeActivaId]);

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

  const etapas = useMemo(
    () => ({
      equilibrio: ruta.etapas[0]?.cursos || [],
      basicas: ruta.etapas[1]?.cursos || [],
      practica: ruta.etapas[2]?.cursos || [],
    }),
    [ruta]
  );

  const tiposBasicos = useMemo(() => {
    const tipos = [];
    if (etapas.basicas.some((curso) => curso.tipoCurso === 'basico_auto')) tipos.push('auto');
    if (etapas.basicas.some((curso) => curso.tipoCurso === 'basico_sincro')) tipos.push('sincro');
    return tipos;
  }, [etapas.basicas]);

  useEffect(() => {
    if (tiposBasicos.length > 0 && !tiposBasicos.includes(tipoMoto)) {
      setTipoMoto(tiposBasicos[0]);
    }
  }, [tiposBasicos, tipoMoto]);

  const preciosPacks = useMemo(() => {
    const preciosTeoricos = new Map();
    if (ctx.fbUser) {
      (ctx.cursosTeoricos || []).forEach((curso) => {
        const precio = Number(curso?.precio);
        if (Number.isFinite(precio)) preciosTeoricos.set(String(curso.id), precio);
      });
    }
    const mapa = new Map();
    ruta.packs.forEach((pack) => {
      mapa.set(String(pack.id), resolverPrecioPackPublico({ pack, cursos, preciosTeoricos }));
    });
    return mapa;
  }, [ruta.packs, cursos, ctx.fbUser, ctx.cursosTeoricos]);

  const packsVia = useMemo(
    () =>
      ruta.packs
        .filter((pack) => pack.cubreRutaCompleta && Array.isArray(pack.cursos) && pack.cursos.length > 0)
        .map((pack) => ({ pack, precio: preciosPacks.get(String(pack.id)) })),
    [ruta.packs, preciosPacks]
  );

  const recomendacion = useMemo(
    () => recomendacionPara({ experiencia, tipoMoto, etapas, cursos }),
    [experiencia, tipoMoto, etapas, cursos]
  );

  const ahorroPack = useMemo(() => {
    const candidato =
      packsVia.find((item) => transmisionDePack(item.pack) === tipoMoto) ||
      packsVia[0] ||
      null;
    const ahorro = Number(candidato?.precio?.ahorro);
    return candidato?.precio?.estado === 'disponible' && Number.isFinite(ahorro) && ahorro > 0
      ? ahorro
      : null;
  }, [packsVia, tipoMoto]);

  const sedeActual = useMemo(
    () => sedesLista.find((sede) => sede.id === sedeActivaId) || sedesLista[0] || null,
    [sedesLista, sedeActivaId]
  );

  useEffect(() => {
    if (loading || errorCursos) return undefined;
    if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
      return undefined;
    }

    const objetivos = [
      document.getElementById('ruta-etapa-equilibrio'),
      document.getElementById('ruta-etapa-basicas'),
      document.getElementById('ruta-etapa-practica'),
      document.getElementById('ruta-packs'),
    ].filter(Boolean);

    if (objetivos.length === 0) return undefined;

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          const clave = entrada.target.getAttribute('data-etapa-clave');
          if (clave === 'packs') {
            setEnPacks(true);
          } else if (clave) {
            setEnPacks(false);
            setActiva(clave);
          }
        });
      },
      { rootMargin: '-34% 0px -50% 0px', threshold: 0 }
    );

    objetivos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [loading, errorCursos]);

  const handleInscribirme = (cursoId) => {
    if (cursoId == null) return;
    const curso = (cursos || []).find((c) => String(c.id) === String(cursoId));
    const tienePrereq = Array.isArray(curso?.prerequisitos) && curso.prerequisitos.length > 0;

    // A2.2-bis: aviso para básicos con prereq de Equilibrio
    if (esBasico(curso) && tienePrereq) {
      setAvisoBasico(curso);
      return;
    }

    navigate('/inscripcion', {
      state: {
        cursoId,
        sedeId: sedeActual?.id ?? null,
        origen: 'publico',
        cursoSugerido: true,
        entryToken: crearFlowId(),
      },
    });
  };

  const confirmarAvisoBasico = (hacerEquilibrio) => {
    const cursoId = hacerEquilibrio
      ? (cursos || []).find((c) => c.tipoCurso === 'equilibrio')?.id
      : avisoBasico?.id;
    setAvisoBasico(null);
    if (cursoId == null) return;
    navigate('/inscripcion', {
      state: {
        cursoId,
        sedeId: sedeActual?.id ?? null,
        origen: 'publico',
        cursoSugerido: true,
        entryToken: crearFlowId(),
      },
    });
  };

  const reintentar = () => {
    setErrorCursos(null);
    setErrorPacks(null);
    setLoading(true);
    setReintento((n) => n + 1);
  };

  const prerequisitoDe = (curso) => prerequisitoLabel(curso?.tipoCurso, curso, cursos);
  const estaBloqueado = (curso) => {
    const tienePrereq = Array.isArray(curso?.prerequisitos) && curso.prerequisitos.length > 0;
    return tienePrereq && !esBasico(curso);
  };

  const saltarA = (clave) => {
    if (clave === 'packs') {
      setEnPacks(true);
      scrollASeccion('ruta-packs');
      return;
    }
    setEnPacks(false);
    setActiva(clave);
    scrollASeccion(`ruta-etapa-${clave}`);
  };

  const whatsappNumero = contacto?.whatsapp ? String(contacto.whatsapp).replace(/\D/g, '') : null;
  const whatsappHref = whatsappNumero
    ? `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(
        `Hola Moto App, quiero información para reservar ${
          recomendacion?.curso?.nombre || 'una sesión'
        }${sedeActual?.nombreMostrado ? ` en ${sedeActual.nombreMostrado}` : ''}.`
      )}`
    : null;

  const itemBarra = recomendacion?.curso
    ? {
        etiqueta: 'Tu inicio recomendado',
        nombre: recomendacion.curso.nombre,
        precio: precioCursoConSede(recomendacion.curso, sedeActual),
        onAccion: () => handleInscribirme(recomendacion.curso.id),
      }
    : null;

  const skipLink = (
    <a
      href="#ruta-contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-blue-700 focus:shadow-lg"
    >
      Saltar a la ruta
    </a>
  );

  const estilosVia = (
    <style>{`
      @keyframes viaFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes viaDash {
        from { background-position-y: 0; }
        to { background-position-y: -36px; }
      }
      .via-fade-in { animation: viaFadeIn 0.24s ease-out both; }
      .via-ancla { scroll-margin-top: 7rem; }
      .via-asfalto-dash {
        background-image: repeating-linear-gradient(
          to bottom,
          rgba(248, 250, 252, 0.95) 0px,
          rgba(248, 250, 252, 0.95) 16px,
          transparent 16px,
          transparent 36px
        );
        background-size: 100% 36px;
        background-repeat: repeat-y;
        animation: viaDash 1.1s linear infinite;
      }
      /* ERR-074: el trazo sube (la moto avanza) y es la unica senal de avance
         de la ruta; con movimiento reducido se ralentiza en vez de congelarse. */
      @media (prefers-reduced-motion: reduce) {
        .via-fade-in { animation: none; }
        .via-asfalto-dash { animation-duration: 2.6s; }
      }
    `}</style>
  );

  if (errorCursos) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {estilosVia}
        {skipLink}
        <ViaNavegacion onVolver={() => navigate('/')} mostrarEtapas={false} />
        <ErrorRuta mensaje={errorCursos} onReintentar={reintentar} />
        <LegalFooter />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {estilosVia}
        {skipLink}
        <ViaNavegacion onVolver={() => navigate('/')} mostrarEtapas={false} />
        <CargandoRuta />
        <LegalFooter />
      </div>
    );
  }

  const pendientePacks = errorPacks && packsVia.length === 0 ? errorPacks : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] font-sans text-slate-900 antialiased">
      {estilosVia}
      {skipLink}

      <ViaNavegacion
        activa={activa}
        enPacks={enPacks}
        sedeActual={sedeActual}
        onVolver={() => navigate('/')}
        onCambiarSede={() =>
          scrollASeccion(sedesLista.length > 0 ? 'via-sede-selector' : 'via-sedes')
        }
        onSaltar={saltarA}
      />

      <main id="ruta-contenido" tabIndex={-1} className="pb-10 pt-[104px] sm:pt-[108px]">
        <ViaSelectorSede
          sedes={sedesLista}
          activaId={sedeActual?.id}
          onSeleccionar={setSedeActivaId}
        />

        <ViaHero
          experiencia={experiencia}
          setExperiencia={setExperiencia}
          tipoMoto={tipoMoto}
          setTipoMoto={setTipoMoto}
          tiposBasicos={tiposBasicos}
          recomendacion={recomendacion}
          ahorroPack={ahorroPack}
          sede={sedeActual}
          onIrARecomendada={
            recomendacion.curso && ['equilibrio', 'basicas', 'practica'].includes(recomendacion.clave)
              ? () => saltarA(recomendacion.clave)
              : undefined
          }
          onVerPack={() => saltarA('packs')}
        />

        <ViaCarretera
          etapas={etapas}
          extras={ruta.cursosExtra}
          tiposBasicos={tiposBasicos}
          tipoMoto={tipoMoto}
          setTipoMoto={setTipoMoto}
          recomendacionClave={recomendacion.clave}
          prerequisitoDe={prerequisitoDe}
          estaBloqueado={estaBloqueado}
          activa={activa}
          sede={sedeActual}
          onInscribirme={handleInscribirme}
          onVerDetalle={setCursoDetalle}
          onIrAPacks={() => saltarA('packs')}
        />

        <ViaMiedos />

        <ViaPack
          packs={packsVia}
          tipoMoto={tipoMoto}
          onChangeTipoMoto={setTipoMoto}
          onVerPack={() => navigate('/packs')}
          errorPacks={pendientePacks}
          onReintentarPacks={reintentar}
        />

        <ViaSedes
          sedes={sedesLista}
          activaId={sedeActual?.id}
          onSeleccionar={setSedeActivaId}
          whatsappHref={whatsappHref}
        />

        <ViaContacto contacto={contacto} whatsappHref={whatsappHref} />

        <div className="pb-24">
          <LegalFooter />
        </div>
      </main>

      <ViaBarraInferior
        item={itemBarra}
        whatsappHref={whatsappHref}
        visible={!cursoDetalle && !avisoBasico}
      />

      <ViaModalDetalle
        curso={cursoDetalle}
        sede={sedeActual}
        prerequisitoLabel={cursoDetalle ? prerequisitoDe(cursoDetalle) : null}
        bloqueado={cursoDetalle ? estaBloqueado(cursoDetalle) : false}
        onClose={() => setCursoDetalle(null)}
        onInscribirme={handleInscribirme}
        onIrAPacks={() => saltarA('packs')}
      />

      <ViaModalAvisoBasico
        avisoBasico={avisoBasico}
        onConfirmar={confirmarAvisoBasico}
        onCerrar={() => setAvisoBasico(null)}
      />
    </div>
  );
}
