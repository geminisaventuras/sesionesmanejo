// @build: 2026-09-14 | id: LEGAL-TERMINOLOGIA-PASO2-CONFIG | desc: Validacion de compatibilidad curso-caracteristicas + auto-ajuste segun campos del curso
import React, { useRef, useEffect, useMemo, useState, useContext, useCallback } from 'react';
import { Bike, Zap, BookOpen, Info, X, Check, ChevronDown } from 'lucide-react';
import { useCursoAutomatico } from '../../../hooks/useCursoAutomatico';
import { resolverTipoMotoCurso } from '../utils/tipoMotoCurso';
import { cumplePrerequisito } from '../../../constants/cursoSecuencia';
import { derivarTraeMotoPermitido } from '../../shared/utils/motoHelpers';
import { etiquetaCortaSede } from '../../shared/utils/sedesHelpers';
import { filtrarSedesPorUbicacion } from '../../shared/utils/geografiaHelpers';
import SelectorUbicacionMapa from '../../shared/components/SelectorUbicacionMapa';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { calcularTarifaMovilidad, calcularMontoVESMovilidad, construirSnapshotMovilidad } from '../utils/movilidadPricing';
import { distanciaMovilidadKm, MOVILIDAD_AUTORIZACION_TEXTO } from '../utils/movilidadHelpers';
import { resolverTasaFXVigente } from '../utils/precioIndividual';
import { AppContext } from '../../../context/AppContextValue';
function evaluarCompatibilidad(curso, form) {
    if (!curso) return { ok: false, razon: '' };
  const tipoCurso = curso.tipoCurso;

    // A2.2-bis: bloquear cursos con prerequisitos duros (excepto básicos, que son soft)
  if (Array.isArray(curso.prerequisitos) && curso.prerequisitos.length > 0) {
    const esBasico = tipoCurso === 'basico_auto' || tipoCurso === 'basico_sincro';
    if (!esBasico) {
      return { ok: false, razon: 'Requiere sesión previa' };
    }
  }

  // Regla 1: sabeBicicleta
  if (form.sabeBicicleta === 'No' && tipoCurso !== 'equilibrio') {
    return { ok: false, razon: 'Requiere saber andar en bicicleta' };
  }
  if (form.sabeBicicleta === 'Sí' && tipoCurso === 'equilibrio') {
    return { ok: false, razon: 'Solo para quienes no saben bicicleta' };
  }

  // Regla 2: tipoMoto vs tiposMotoEscuela del curso
  const motoIncluida = curso.motoIncluida !== false;
  const tiposMoto = curso.tiposMotoEscuela || [];
  if (motoIncluida && tiposMoto.length > 0 && form.tipoMoto && !tiposMoto.includes(form.tipoMoto)) {
    return { ok: false, razon: `Solo moto ${tiposMoto.join('/')}` };
  }

  return { ok: true };
}

// Lista propia para móvil: el <select> nativo de Android abre un diálogo sin
// estilo y desborda textos largos. Aquí las opciones se leen como tarjetas.
function SelectorLista({ etiqueta, placeholder, valor, grupos = [], onSeleccionar, ariaLabel }) {
  const [abierto, setAbierto] = useState(false);
  const opciones = grupos.flatMap((g) => g.opciones || []);
  const actual = opciones.find((o) => String(o.valor) === String(valor));

  return (
    <div>
      <label className="mb-1.5 ml-1 block text-sm font-bold text-gray-700">{etiqueta}</label>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={ariaLabel || etiqueta}
        className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-left outline-none focus:border-blue-500"
      >
        <span className={`min-w-0 flex-1 truncate text-sm ${actual ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
          {actual ? actual.etiqueta : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div className="mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {opciones.length === 0 && (
            <p className="m-0 px-3 py-3 text-xs text-gray-500">No hay opciones disponibles.</p>
          )}
          {grupos.map((g, gi) => (
            (g.opciones || []).length > 0 && (
              <div key={g.titulo || gi} className={gi > 0 ? 'border-t border-gray-100' : ''}>
                {g.titulo && (
                  <p className="m-0 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {g.titulo}
                  </p>
                )}
                {g.opciones.map((o) => {
                  const activo = String(o.valor) === String(valor);
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      disabled={o.deshabilitado}
                      onClick={() => {
                        if (o.deshabilitado) return;
                        onSeleccionar(o.valor);
                        setAbierto(false);
                      }}
                      className={`flex w-full items-start gap-2 border-t border-gray-50 px-3 py-2.5 text-left ${
                        activo ? 'bg-blue-50' : 'hover:bg-gray-50'
                      } ${o.deshabilitado ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-semibold leading-snug text-gray-800">
                          {o.etiqueta}
                        </span>
                        {o.detalle && (
                          <span className="mt-0.5 block break-words text-[11px] leading-snug text-gray-500">
                            {o.detalle}
                          </span>
                        )}
                      </span>
                      {o.derecha && <span className="shrink-0 text-sm font-black text-gray-900">{o.derecha}</span>}
                      {activo && <Check size={16} className="mt-0.5 shrink-0 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export function Paso2Configuracion({ form, updateForm, cursos, sedes, recargoSinBici, reservas, fbUser }) {  
  const esOrigenPublico = form.origenPublico || form.cursoSugeridoActivo;

  const { cursoAsignado, esAutomatico } = useCursoAutomatico(
    form,
    updateForm,
    cursos,
    {
      bloquearCurso:
        form.esRecompra ||
        form.cursoSugeridoActivo ||
        form.cursoSeleccionadoManual
    }
  );

  const precargaInicialRef = useRef(false);

  // UX paso 2 (móvil): al responder, cada bloque se contrae a una fila resumen
  // con "Cambiar" para dejar visible la sede y el mapa de movilidad sin scroll extra.
  const sedeRef = useRef(null);
  const mapaRef = useRef(null);
  const [biciContraida, setBiciContraida] = useState(false);
  const [motoContraida, setMotoContraida] = useState(false);
  // La selección de la ubicación de recogida vive en una hoja (sheet) para no
  // alargar el paso 2 en móvil; el bloque inline solo muestra el resumen.
  const [sheetMovilidad, setSheetMovilidad] = useState(false);
  // Se activa al marcar la casilla: la hoja abre con el aviso de ubicación y,
  // si el permiso ya está concedido, intenta ubicar de inmediato.
  const [pistaUbicacion, setPistaUbicacion] = useState(false);
  const [verCondiciones, setVerCondiciones] = useState(false);
  const sheetRef = useRef(null);
  const cerrarSheet = useCallback(() => {
    setSheetMovilidad(false);
    // Al volver del mapa, deja visible la configuración (bici/moto/sede) en vez
    // de quedar al final del paso 2.
    if (typeof window === 'undefined') return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      sedeRef.current?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
    }));
  }, []);
  useFocusTrap(sheetRef, cerrarSheet);

  // El scroller real del wizard es el contenedor de AppShell, no el body:
  // se bloquea mientras la hoja está abierta para que el fondo no se mueva.
  useEffect(() => {
    if (!sheetMovilidad) return undefined;
    const scroller = mapaRef.current?.closest('.overflow-y-auto') || null;
    const overflowPrevio = scroller?.style.overflow || '';
    if (scroller) scroller.style.overflow = 'hidden';
    return () => {
      if (scroller) scroller.style.overflow = overflowPrevio;
    };
  }, [sheetMovilidad]);

  useEffect(() => {
    if (!sheetMovilidad) return undefined;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [sheetMovilidad]);

  const limpiarMovilidad = () => updateForm({
    movilidadSolicitada: false,
    movilidadPin: null,
    movilidadDireccion: '',
    movilidadDistanciaKm: null,
    movilidadMontoUSD: null,
    movilidadMontoVES: null,
    movilidadSnapshot: null,
    movilidadAutorizacion: false,
  });
  const desplazarA = (ref) => {
    if (typeof window === 'undefined') return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const mover = () => ref.current?.scrollIntoView({
      behavior: reducido ? 'auto' : 'smooth',
      block: 'nearest',
    });
    // Doble frame: espera a que React pinte la sección recién mostrada.
    window.requestAnimationFrame(() => window.requestAnimationFrame(mover));
  };

  const cursoSeleccionado = useMemo(
    () => cursos?.find(c => String(c.id) === String(form.cursoId)),
    [cursos, form.cursoId]
  );

  // Deriva configuracion inicial desde campos del curso (reemplaza hardcode por tipoCurso)
  const getConfiguracionDesdeCurso = (curso) => {
    if (!curso) return {};
    const tipoCurso = curso.tipoCurso;
    const motoIncluida = curso.motoIncluida !== false;

    let sabeBicicleta = 'Sí';
    if (tipoCurso === 'equilibrio') sabeBicicleta = 'No';

    // ERR-072: el tipo sale de la configuracion del curso; el fallback
    // historico de Automática solo aplica a cursos legacy sin configurar.
    const tipoMoto = resolverTipoMotoCurso(
      curso,
      '',
      sabeBicicleta === 'No' ? 'Automática' : ''
    );

    const traeMoto = motoIncluida ? 'No' : 'Sí';

    return { sabeBicicleta, tipoMoto, traeMoto };
  };

  const handleCursoChange = (nuevoCursoId) => {
    const curso = cursos.find(c => String(c.id) === String(nuevoCursoId));
    if (!curso) return;
    const config = getConfiguracionDesdeCurso(curso);
    updateForm({
      cursoId: nuevoCursoId,
      cursoSeleccionadoManual: true,
      ...config
    });
  };

  useEffect(() => {
    if (precargaInicialRef.current) return;
    if (
      form.origenPublico &&
      form.cursoSugeridoActivo &&
      !form.cursoSeleccionadoManual
    ) {
      const curso = cursos.find(c => String(c.id) === String(form.cursoId));
      if (curso) {
        const config = getConfiguracionDesdeCurso(curso);
        updateForm(config);
        precargaInicialRef.current = true;
      }
    }
  }, [cursos, form.origenPublico, form.cursoSugeridoActivo, form.cursoSeleccionadoManual, form.cursoId, updateForm]);

  
  // ✅ NUEVO (FIX-PREREQ-BYPASS): Revalidar prereqs cuando el cursoId está preseleccionado.
  // Aplica cuando el curso llega por location.state (URL directa, botón "Inscribirme", etc.)
  // y el dropdown no revalidó porque el valor ya estaba seteado.
  useEffect(() => {
    if (!form.cursoId || !cursos?.length || !reservas) return;
    if (form.esRecompra || form.esReintento) return;

    const cursoSel = cursos.find(c => String(c.id) === String(form.cursoId));
    if (!cursoSel) return;

    const esBasico = cursoSel.tipoCurso === 'basico_auto' || cursoSel.tipoCurso === 'basico_sincro';
    if (esBasico) return;

    const uid = fbUser?.uid;
    if (!uid) return;

    const reservasAprobadas = reservas.filter(r =>
      String(r.userId) === String(uid) &&
      r.estadoPago === 'Aprobado'
    );

    const cumple = cumplePrerequisito(
      cursoSel.tipoCurso,
      reservasAprobadas,
      cursoSel,
      cursos
    );

    if (!cumple) {
      updateForm({ cursoId: '' });
    }
  }, [form.cursoId, form.esRecompra, form.esReintento, cursos, reservas, fbUser, updateForm]);
  // Reglas activas para UI
  const motoIncluida = cursoSeleccionado?.motoIncluida !== false;
  const tiposMotoEscuela = cursoSeleccionado?.tiposMotoEscuela || [];
  const bloqueaTraeMoto = !!cursoSeleccionado && !motoIncluida;
  // FIX-PERMITE-TRAER-MOTO: nueva lógica basada en campo configurable del curso.
  // - Si el curso NO ofrece moto (motoIncluida: false) → bloqueaTraeMoto = true (fuerza a traer propia).
  // - Si el curso SÍ ofrece moto Y permite traer propia → ambos botones activos.
  // - Si el curso SÍ ofrece moto Y NO permite traer propia (Equilibrio) → botón "Sí" bloqueado.
  const permiteTraerMotoPropia = cursoSeleccionado?.permiteTraerMotoPropia !== false;
  const bloqueaMotoPropia = !!cursoSeleccionado && motoIncluida && !permiteTraerMotoPropia;

  // Si el curso cambia por cualquier vía (dropdown, curso automático o el
  // botón "No sé andar"), corrige el estado que luego consume Paso 3.
  useEffect(() => {
    if (!cursoSeleccionado) return;
    const esperado = derivarTraeMotoPermitido(cursoSeleccionado, form.traeMoto);
    if (form.traeMoto !== esperado) {
      updateForm({ traeMoto: esperado });
    }
  }, [cursoSeleccionado, form.traeMoto, updateForm]);

    const bloqueaTipoMoto = (tipo) => {
    // A2.2-ter: en básicos, el tipo cambia de curso; solo se bloquea si el
    // curso destino no existe o está inactivo.
    const esBasicoActual = cursoSeleccionado?.tipoCurso === 'basico_auto' || cursoSeleccionado?.tipoCurso === 'basico_sincro';
    if (esBasicoActual) {
      const nuevoTipoCurso = tipo === 'Automática' ? 'basico_auto' : 'basico_sincro';
      return !(cursos || []).some(c => c.tipoCurso === nuevoTipoCurso && c.activo !== false);
    }
    if (motoIncluida && tiposMotoEscuela.length > 0 && !tiposMotoEscuela.includes(tipo)) return true;
    return false;
  };

  // A2.2-ter: cambiar tipo moto en básico → cambia el curso al básico correspondiente
  const handleTipoMotoChange = (tipo) => {
    if (bloqueaTipoMoto(tipo)) return;
    const esBasicoActual = cursoSeleccionado?.tipoCurso === 'basico_auto' || cursoSeleccionado?.tipoCurso === 'basico_sincro';
    if (form.sabeBicicleta === 'Sí' && (esBasicoActual || !cursoSeleccionado)) {
      const nuevoTipoCurso = tipo === 'Automática' ? 'basico_auto' : 'basico_sincro';
      const nuevoCurso = (cursos || []).find(c => c.tipoCurso === nuevoTipoCurso && c.activo !== false);
      if (nuevoCurso) {
        updateForm({ tipoMoto: tipo, cursoId: nuevoCurso.id, cursoSeleccionadoManual: false });
      }
      // Sin curso destino no se cambia el tipo: evita dejar un par curso/tipo
      // incompatible (ej. basico_auto con Sincrónica).
      return;
    }
    updateForm({ tipoMoto: tipo });
  };

  // Sedes filtradas por curso
  const sedesPermitidas = useMemo(() => {
    const permitidas = cursoSeleccionado?.sedesPermitidas;
    const activas = (sedes || []).filter(s => s.activo);
    if (!permitidas || permitidas.length === 0) return activas;
    return activas.filter(s => permitidas.includes(s.id));
  }, [sedes, cursoSeleccionado]);

  // FT-048 fase 2: filtro por la ubicación del paso 1 y sedes cercanas.
  // El control es estado local para no añadir campos al formulario ni a la reserva.
  const { estados, municipios, ciudades, config: appConfig } = useContext(AppContext) || {};
  const catalogosGeo = useMemo(
    () => ({ estados: estados || [], municipios: municipios || [], ciudades: ciudades || [] }),
    [estados, municipios, ciudades]
  );
  const ubicacionSedes = useMemo(
    () => filtrarSedesPorUbicacion(sedesPermitidas, {
      ciudadId: form.ciudadId,
      estadoId: form.estadoId,
      catalogos: catalogosGeo,
      incluirCercanas: true,
      radioKm: 50,
    }),
    [sedesPermitidas, form.ciudadId, form.estadoId, catalogosGeo]
  );
  const sedesVisibles = ubicacionSedes.sedes;
  const idsCercanas = useMemo(
    () => new Set(ubicacionSedes.cercanasDisponibles.map((s) => String(s.id))),
    [ubicacionSedes.cercanasDisponibles]
  );
  const sedesPrimarias = sedesVisibles.filter((s) => !idsCercanas.has(String(s.id)));
  const sedesCercanas = sedesVisibles.filter((s) => idsCercanas.has(String(s.id)));
  const etiquetaSede = (s) => etiquetaCortaSede(s, catalogosGeo);

  // Al cambiar de ciudad/estado la lista visible puede dejar fuera la sede ya
  // elegida (p. ej. una sede de Caracas al elegir Guatire). Sin este ajuste el
  // <select> conserva un valor que no existe entre las opciones y se ve vacío
  // aunque sí haya sedes. No toca la selección mientras los catálogos cargan.
  useEffect(() => {
    if (!form.sedeId) return;
    const existeEnCatalogo = (sedes || []).some((s) => String(s.id) === String(form.sedeId));
    if (!existeEnCatalogo) return;
    const sigueVisible = sedesVisibles.some((s) => String(s.id) === String(form.sedeId));
    if (!sigueVisible) updateForm({ sedeId: '' });
  }, [sedes, sedesVisibles, form.sedeId, updateForm]);

  // FT-058: movilidad opcional para quien trae moto propia.
  const movilidadCfg = useMemo(() => appConfig?.movilidad || {}, [appConfig]);
  const sedeSeleccionada = useMemo(
    () => (sedes || []).find(s => String(s.id) === String(form.sedeId)) || null,
    [sedes, form.sedeId]
  );
  const distanciaMovilidad = useMemo(
    () => distanciaMovilidadKm(form.movilidadPin, sedeSeleccionada),
    [form.movilidadPin, sedeSeleccionada]
  );
  const tarifaMovilidad = useMemo(
    () => (distanciaMovilidad
      ? calcularTarifaMovilidad({ config: movilidadCfg, distanciaKm: distanciaMovilidad })
      : null),
    [distanciaMovilidad, movilidadCfg]
  );
  const tasaFXMovilidad = useMemo(() => resolverTasaFXVigente(appConfig || {}), [appConfig]);

  useEffect(() => {
    if (form.traeMoto === 'Sí') return;
    if (!form.movilidadSolicitada && !form.movilidadPin && !form.movilidadAutorizacion) return;
    updateForm({
      movilidadSolicitada: false,
      movilidadPin: null,
      movilidadDireccion: '',
      movilidadDistanciaKm: null,
      movilidadMontoUSD: null,
      movilidadMontoVES: null,
      movilidadSnapshot: null,
      movilidadAutorizacion: false,
    });
  }, [form.traeMoto, form.movilidadSolicitada, form.movilidadPin, form.movilidadAutorizacion, updateForm]);

  useEffect(() => {
    if (form.movilidadSolicitada !== true) return;
    const snapshot = tarifaMovilidad?.disponible
      ? construirSnapshotMovilidad({
          config: movilidadCfg,
          distanciaKm: distanciaMovilidad,
          tasaFX: tasaFXMovilidad,
          calculadoPor: 'cliente',
        })
      : null;
    const monto = snapshot?.montoUSD ?? null;
    const montoVES = snapshot?.montoVES ?? null;
    const distancia = distanciaMovilidad ?? null;
    if (
      form.movilidadDistanciaKm === distancia &&
      form.movilidadMontoUSD === monto &&
      form.movilidadMontoVES === montoVES &&
      form.movilidadSnapshot
    ) return;
    updateForm({
      movilidadDistanciaKm: distancia,
      movilidadMontoUSD: monto,
      movilidadMontoVES: montoVES,
      movilidadSnapshot: snapshot,
    });
  }, [
    form.movilidadSolicitada,
    form.movilidadDistanciaKm,
    form.movilidadMontoUSD,
    form.movilidadMontoVES,
    distanciaMovilidad,
    tarifaMovilidad,
    tasaFXMovilidad,
    movilidadCfg,
    form.movilidadSnapshot,
    updateForm,
  ]);

  return (
    <div className="space-y-4">
      {form.esRecompra ? (
        <>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">¿Sabes andar en bicicleta?</label>
            <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-700 flex items-center gap-2">
              <Bike size={18} className="text-gray-400" />
              <span>Sí</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Tipo de Moto</label>
            <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-700 flex items-center gap-2">
              <Zap size={18} className="text-gray-400" />
              <span>{form.tipoMoto || 'Automática'}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">¿Sabes andar en bicicleta?</label>
            {form.sabeBicicleta && biciContraida ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Bike size={18} className="text-blue-600" />
                  {form.sabeBicicleta}
                  {form.sabeBicicleta === 'No' && (
                    <span className="text-[11px] font-semibold text-blue-700">+${recargoSinBici || 0} USD</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setBiciContraida(false)}
                  className="text-xs font-bold text-blue-700 underline underline-offset-2 px-2 py-1"
                  aria-label="Cambiar respuesta sobre andar en bicicleta"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const cursoActual = cursoSeleccionado;
                      const esEquilibrio = cursoActual?.tipoCurso === 'equilibrio';
                      updateForm({
                        sabeBicicleta: 'Sí',
                        ...(esEquilibrio ? { cursoId: '', cursoSeleccionadoManual: false } : {})
                      });
                      setBiciContraida(true);
                    }}
                    className={`p-4 border-2 rounded-xl transition-colors ${
                      form.sabeBicicleta === 'Sí' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Bike size={24} className="mx-auto mb-1 text-blue-600" />
                    <p className="font-bold text-sm">Sí sé</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cursoEquilibrio = (cursos || []).find(c => c.tipoCurso === 'equilibrio' && c.activo !== false);
                      const tipoInicial = resolverTipoMotoCurso(cursoEquilibrio, form.tipoMoto, 'Automática');
                      updateForm({
                        sabeBicicleta: 'No',
                        tipoMoto: tipoInicial,
                        ...(cursoEquilibrio ? { cursoId: cursoEquilibrio.id, cursoSeleccionadoManual: false } : {})
                      });
                      setBiciContraida(true);
                    }}
                    className={`p-4 border-2 rounded-xl transition-colors ${
                      form.sabeBicicleta === 'No' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Bike size={24} className="mx-auto mb-1 text-gray-400" />
                    <p className="font-bold text-sm">No sé</p>
                  </button>
                </div>
                {form.sabeBicicleta === 'No' && (
                  <p className="text-xs text-blue-700 font-bold mt-1 ml-1">
                    Instrucción especial: +${recargoSinBici || 0} USD
                  </p>
                )}
              </>
            )}
          </div>

          {form.sabeBicicleta && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Tipo de Moto</label>
              {form.tipoMoto && motoContraida ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Zap size={18} className="text-blue-600" />
                    {form.tipoMoto}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMotoContraida(false)}
                    className="text-xs font-bold text-blue-700 underline underline-offset-2 px-2 py-1"
                    aria-label="Cambiar tipo de moto"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleTipoMotoChange('Automática');
                        setMotoContraida(true);
                        desplazarA(sedeRef);
                      }}
                      disabled={bloqueaTipoMoto('Automática')}
                      className={`p-4 border-2 rounded-xl transition-colors ${
                        form.tipoMoto === 'Automática' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      } ${bloqueaTipoMoto('Automática') ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <Zap size={24} className="mx-auto mb-1 text-blue-600" />
                      <p className="font-bold text-sm">Automática</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleTipoMotoChange('Sincrónica');
                        setMotoContraida(true);
                        desplazarA(sedeRef);
                      }}
                      disabled={bloqueaTipoMoto('Sincrónica')}
                      className={`p-4 border-2 rounded-xl transition-colors ${
                        form.tipoMoto === 'Sincrónica' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      } ${bloqueaTipoMoto('Sincrónica') ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <Zap size={24} className="mx-auto mb-1 text-gray-400" />
                      <p className="font-bold text-sm">Sincrónica</p>
                    </button>
                  </div>
                  {cursoSeleccionado && motoIncluida && tiposMotoEscuela.length === 0 && (
                    <p className="text-[11px] text-gray-500 mt-1 ml-1">
                      Este curso no tiene tipos de moto configurados; se permiten ambos.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {esOrigenPublico && (
        <div>
          <SelectorLista
            etiqueta="Sesión"
            placeholder="Selecciona sesión"
            valor={form.cursoId || ''}
            onSeleccionar={handleCursoChange}
            ariaLabel="Seleccionar sesión"
            grupos={[{
              titulo: '',
              opciones: (cursos || []).filter(c => c.activo !== false).map(c => {
                const compat = evaluarCompatibilidad(c, form);
                return {
                  valor: c.id,
                  etiqueta: c.nombre,
                  detalle: compat.ok ? '' : compat.razon,
                  derecha: `$${c.precioBase || 0}`,
                  deshabilitado: !compat.ok,
                };
              }),
            }]}
          />
          {cursoSeleccionado?.descripcion && (
            <p className="text-xs text-gray-500 mt-1 ml-1">{cursoSeleccionado.descripcion}</p>
          )}
        </div>
      )}

      {form.esRecompra ? (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 flex items-center gap-1">
            Sesión Seleccionada <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Fijado</span>
          </label>
          <div className="w-full bg-blue-50 border border-blue-200 rounded-xl py-3 px-4 text-gray-700 flex items-center gap-2">
            <BookOpen size={18} className="text-blue-500" />
            <span>{cursoSeleccionado?.nombre || 'Sesión no encontrada'}</span>
          </div>
        </div>
      ) : esOrigenPublico ? null : esAutomatico && cursoAsignado ? (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 flex items-center gap-1">
            Sesión asignada
          </label>
          <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-700 flex items-center gap-2">
            <BookOpen size={18} className="text-gray-400" />
            <span>{cursoAsignado.nombre}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-1 flex items-center gap-1">
            <Info size={12} />
            {form.sabeBicicleta === 'No'
              ? 'Sesión de equilibrio asignada según tus respuestas'
              : `Asignado para moto ${form.tipoMoto?.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>Elige si sabes andar en bicicleta y el tipo de moto para asignar tu sesión.</span>
        </div>
      )}

      <div ref={sedeRef} className="scroll-mt-24">
        <SelectorLista
          etiqueta="Sede"
          placeholder="Selecciona sede"
          valor={form.sedeId || ''}
          onSeleccionar={(v) => updateForm({ sedeId: v })}
          ariaLabel="Seleccionar sede"
          grupos={[
            {
              titulo: 'Sedes en tu ubicación',
              opciones: sedesPrimarias.map((s) => {
                const texto = etiquetaSede(s);
                const [nombre, ...resto] = texto.split(' - ');
                return { valor: s.id, etiqueta: nombre, detalle: resto.join(' - ') };
              }),
            },
            {
              titulo: 'Otras sedes cercanas',
              opciones: sedesCercanas.map((s) => {
                const texto = etiquetaSede(s);
                const [nombre, ...resto] = texto.split(' - ');
                return { valor: s.id, etiqueta: nombre, detalle: resto.join(' - ') };
              }),
            },
          ].filter((g) => g.opciones.length > 0)}
        />
        {ubicacionSedes.aviso && (
          <p className="mt-1 flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] leading-snug text-slate-600">
            <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
            <span>{ubicacionSedes.aviso}</span>
          </p>
        )}
        {cursoSeleccionado?.sedesPermitidas?.length > 0 && sedesVisibles.length === 0 && (
          <p className="text-xs text-red-700 mt-1 ml-1">
            Esta sesión no está disponible en ninguna sede activa.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">¿Traes tu propia moto?</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => !bloqueaTraeMoto && updateForm({ traeMoto: 'No' })}
            disabled={bloqueaTraeMoto}
            className={`p-4 border-2 rounded-xl transition-colors ${
              form.traeMoto === 'No' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${bloqueaTraeMoto ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <span className="text-2xl">🏍️</span>
            <p className="font-bold text-sm">No</p>
          </button>
          <button
            type="button"
            onClick={() => {
              if (bloqueaMotoPropia) return;
              updateForm({ traeMoto: 'Sí' });
              if (movilidadCfg.activo === true) desplazarA(mapaRef);
            }}
            disabled={bloqueaMotoPropia}
            className={`p-4 border-2 rounded-xl transition-colors ${
              form.traeMoto === 'Sí' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${bloqueaMotoPropia ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <span className="text-2xl">✅</span>
            <p className="font-bold text-sm">Sí</p>
          </button>
        </div>
        {bloqueaTraeMoto && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-600">
            <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
            <span>Esta sesión solo está disponible si traes tu propia moto.</span>
          </p>
        )}
        {bloqueaMotoPropia && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-600">
            <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
            <span>Esta sesión solo está disponible con la moto de Moto App.</span>
          </p>
        )}
      </div>

      {form.traeMoto === 'Sí' && movilidadCfg.activo === true && (
        <div ref={mapaRef} className="scroll-mt-24 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-3">
          <label className="flex items-start gap-2 text-sm font-bold text-gray-800">
            <input
              type="checkbox"
              checked={form.movilidadSolicitada === true}
              onChange={e => {
                if (e.target.checked) {
                  updateForm({ movilidadSolicitada: true });
                  setPistaUbicacion(true);
                  setSheetMovilidad(true);
                } else {
                  limpiarMovilidad();
                  setPistaUbicacion(false);
                  setSheetMovilidad(false);
                }
              }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              ¿Quieres que te busquemos en tu ubicación?
              <span className="block text-[11px] font-normal text-gray-600 mt-0.5">
                Un prestador conduce tu moto hasta la sede y te devuelve al terminar. El costo se paga directo al prestador.
              </span>
            </span>
          </label>

          {form.movilidadSolicitada === true && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="m-0 text-xs font-bold text-gray-800">
                    {form.movilidadPin ? 'Ubicación de recogida marcada' : 'Falta marcar tu ubicación'}
                  </p>
                  {form.movilidadDireccion && (
                    <p className="m-0 truncate text-[11px] text-gray-600">{form.movilidadDireccion}</p>
                  )}
                  {tarifaMovilidad?.disponible && (
                    <p className="m-0 mt-1 text-[11px] font-bold text-blue-800">
                      ${tarifaMovilidad.montoUSD.toFixed(2)} · {distanciaMovilidad.toFixed(1)} km
                    </p>
                  )}
                  {!form.movilidadAutorizacion && (
                    <p className="m-0 mt-1 text-[11px] font-semibold text-amber-700">
                      Falta aceptar las condiciones del traslado.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSheetMovilidad(true)}
                  className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {form.movilidadPin ? 'Ajustar' : 'Marcar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {form.traeMoto === 'Sí' && movilidadCfg.activo === true && sheetMovilidad && form.movilidadSolicitada === true && (
        <div className="fixed inset-0 z-50 flex">
          <section
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="movilidad-sheet-titulo"
            className="relative flex h-dvh w-full flex-col bg-white"
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 pb-2 pt-[calc(10px_+_env(safe-area-inset-top))]">
              <h2 id="movilidad-sheet-titulo" className="m-0 text-base font-extrabold leading-tight text-gray-900">
                Ubicación de recogida
              </h2>
              <button
                type="button"
                onClick={cerrarSheet}
                aria-label="Cerrar mapa de movilidad"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-3 pt-2">
              {!sedeSeleccionada && (
                <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  Selecciona primero la sede para calcular la distancia.
                </p>
              )}

              <SelectorUbicacionMapa
                latitud={form.movilidadPin?.lat}
                longitud={form.movilidadPin?.lng}
                centro={sedeSeleccionada?.coordenadas}
                onChange={(pin) => updateForm({ movilidadPin: pin })}
                onDireccion={({ direccion, lat, lng }) => updateForm({
                  movilidadPin: { lat, lng },
                  movilidadDireccion: direccion || form.movilidadDireccion || '',
                })}
                etiqueta="Tu ubicación de recogida"
                ayuda="Escribe tu dirección, usa tu ubicación o toca el mapa."
                ariaLabel="Mapa para marcar tu ubicación de recogida"
                permitirBuscarDireccion
                permitirGeolocalizacion
                variante="hoja"
                autoUbicar={pistaUbicacion}
              />

              {form.movilidadPin && !sedeSeleccionada?.coordenadas && (
                <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  La sede no tiene ubicación configurada; no podemos calcular la distancia.
                </p>
              )}

              {tarifaMovilidad?.disponible && (
                <div className="rounded-xl bg-white border border-blue-200 p-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-bold text-gray-600">
                      {tarifaMovilidad.modalidad === 'plana' ? 'Tarifa plana' : 'Tarifa por km'} · {distanciaMovilidad.toFixed(1)} km
                    </span>
                    <span className="text-base font-black text-gray-900">
                      ${tarifaMovilidad.montoUSD.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-blue-800 mt-0.5">
                    Bs {calcularMontoVESMovilidad(tarifaMovilidad.montoUSD, tasaFXMovilidad).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Un solo monto por viaje ida y vuelta. Pago directo al prestador, no se suma al pago del curso.
                  </p>
                </div>
              )}

              {tarifaMovilidad && !tarifaMovilidad.disponible && (
                <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  {tarifaMovilidad.motivo === 'fuera-cobertura'
                    ? `Tu ubicación está fuera de la cobertura (${tarifaMovilidad.kmTope} km).`
                    : 'No pudimos cotizar la movilidad para esta ubicación.'}
                </p>
              )}

              <div>
                <label className="flex items-start gap-2 text-[11px] leading-snug text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.movilidadAutorizacion === true}
                    onChange={e => updateForm({ movilidadAutorizacion: e.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Acepto las condiciones del traslado.</span>
                </label>
                <button
                  type="button"
                  onClick={() => setVerCondiciones(v => !v)}
                  className="ml-6 mt-0.5 text-[10.5px] font-bold text-blue-700 underline underline-offset-2"
                >
                  {verCondiciones ? 'Ocultar condiciones' : 'Ver condiciones'}
                </button>
                {verCondiciones && (
                  <p className="mt-1 rounded-lg bg-gray-50 px-2 py-1.5 text-[10.5px] leading-snug text-gray-600">
                    {MOVILIDAD_AUTORIZACION_TEXTO}
                  </p>
                )}
              </div>
            </div>

            <footer className="grid shrink-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2 border-t border-gray-100 px-4 pb-[calc(11px_+_env(safe-area-inset-bottom))] pt-2.5">
              <button
                type="button"
                onClick={() => {
                  limpiarMovilidad();
                  cerrarSheet();
                }}
                className="min-h-12 rounded-xl border border-gray-200 bg-white px-3 text-[12.5px] font-bold text-gray-800 hover:bg-gray-50"
              >
                Quitar solicitud
              </button>
              <button
                type="button"
                onClick={cerrarSheet}
                className="min-h-12 rounded-xl bg-blue-600 px-3 text-[12.5px] font-bold text-white hover:bg-blue-700"
              >
                Listo
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
