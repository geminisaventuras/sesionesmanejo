// @build: 2026-11-23 | id: T-071-FILTROS-SISTEMA | desc: Orquestador del sistema compartido de filtros (barra + sheet móvil + panel de escritorio).
// Componente controlado: no consulta datos, no filtra y no calcula negocio. Solo presenta
// `campos`, refleja `valores` y emite `onChange`, `onAplicar` y `onLimpiar`.
import { useEffect, useRef, useState } from 'react';
import FiltrosBarra from './FiltrosBarra';
import FiltrosPanel from './FiltrosPanel';
import FiltrosSheet from './FiltrosSheet';
import {
  construirResumenActivo,
  construirValoresIniciales,
  contarFiltrosActivos,
  valorPorDefecto,
  valoresIguales,
} from './filtrosHelpers';

const tieneClave = (objeto, clave) =>
  Boolean(objeto) && Object.prototype.hasOwnProperty.call(objeto, clave);

const combinarValores = (campos, iniciales, valores) => ({
  ...construirValoresIniciales(campos, iniciales),
  ...(valores || {}),
});

export default function FiltrosSistema({
  id,
  campos = [],
  valores = {},
  valoresIniciales = {},
  contadorActivo,
  resultados,
  abierto = false,
  onAbrir,
  onCerrar,
  onChange,
  onAplicar,
  onLimpiar,
  aplicarAlInstante = false,
  busqueda,
  resumenActivo,
  accesosRapidos,
  titulo = 'Filtros',
  etiquetaBoton = 'Filtros',
  descripcion = 'Aplica los cambios al confirmar.',
  etiquetaAplicar = 'Aplicar',
  cargando = false,
  error,
  cerrarAlAplicar = true,
  className = '',
  children,
}) {
  const [borrador, setBorrador] = useState(() =>
    combinarValores(campos, valoresIniciales, valores)
  );
  const [esEscritorio, setEsEscritorio] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const botonRef = useRef(null);
  const estabaAbierto = useRef(abierto);
  const abiertoPrevio = useRef(abierto);
  const valoresRef = useRef(valores);
  valoresRef.current = valores;

  // Copia el estado aplicado al borrador cada vez que el sheet se abre (cerrar sin aplicar descarta).
  useEffect(() => {
    if (abierto && !abiertoPrevio.current) {
      setBorrador(combinarValores(campos, valoresIniciales, valoresRef.current));
    }
    abiertoPrevio.current = abierto;
  }, [abierto, campos, valoresIniciales]);

  // Cierra el sheet al cruzar a escritorio y mantiene disponible el breakpoint para el render.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(min-width: 1024px)');
    const alCambiar = (evento) => {
      setEsEscritorio(evento.matches);
      if (evento.matches) onCerrar?.();
    };
    mq.addEventListener?.('change', alCambiar);
    if (mq.matches && abierto) onCerrar?.();
    return () => mq.removeEventListener?.('change', alCambiar);
  }, [abierto, onCerrar]);

  // Retorno de foco al botón que abrió el sheet (solo si seguimos en móvil/tablet).
  useEffect(() => {
    const seCerro = estabaAbierto.current && !abierto;
    estabaAbierto.current = abierto;
    if (seCerro && !esEscritorio) botonRef.current?.focus?.();
  }, [abierto, esEscritorio]);

  const contadorCalculado = Number.isFinite(contadorActivo)
    ? contadorActivo
    : contarFiltrosActivos(campos, valores, valoresIniciales);
  const resumenCalculado =
    Array.isArray(resumenActivo) && resumenActivo.length > 0
      ? resumenActivo
      : construirResumenActivo(campos, valores, valoresIniciales);
  const contadorBorrador = contarFiltrosActivos(campos, borrador, valoresIniciales);

  const manejarCambioBorrador = (campoId, valor) => {
    setBorrador((previo) => ({ ...previo, [campoId]: valor }));
    if (aplicarAlInstante) onChange?.(campoId, valor);
  };

  const manejarLimpiarBorrador = () => {
    const limpio = construirValoresIniciales(campos, valoresIniciales);
    setBorrador(limpio);
    if (aplicarAlInstante) {
      campos.forEach((campo) => {
        const aplicado = tieneClave(valores, campo.id)
          ? valores[campo.id]
          : valorPorDefecto(campo);
        if (!valoresIguales(limpio[campo.id], aplicado)) onChange?.(campo.id, limpio[campo.id]);
      });
    }
  };

  const manejarAplicar = () => {
    if (!aplicarAlInstante) {
      campos.forEach((campo) => {
        const aplicado = tieneClave(valores, campo.id)
          ? valores[campo.id]
          : valorPorDefecto(campo);
        if (!valoresIguales(borrador[campo.id], aplicado)) {
          onChange?.(campo.id, borrador[campo.id]);
        }
      });
    }
    onAplicar?.(borrador);
    if (cerrarAlAplicar) onCerrar?.();
  };

  const manejarLimpiarPanel = () => {
    if (onLimpiar) {
      onLimpiar();
      return;
    }
    const limpio = construirValoresIniciales(campos, valoresIniciales);
    campos.forEach((campo) => {
      const aplicado = tieneClave(valores, campo.id) ? valores[campo.id] : valorPorDefecto(campo);
      if (!valoresIguales(limpio[campo.id], aplicado)) onChange?.(campo.id, limpio[campo.id]);
    });
  };

  const barra = (
    <FiltrosBarra
      id={id}
      abierto={abierto}
      onAbrir={onAbrir}
      contadorActivo={contadorCalculado}
      resumenActivo={resumenCalculado}
      busqueda={busqueda}
      accesosRapidos={accesosRapidos}
      cargando={cargando}
      etiqueta={etiquetaBoton}
      botonRef={botonRef}
      className={className}
    />
  );

  const panel = (
    <FiltrosPanel
      id={id}
      titulo={titulo}
      campos={campos}
      valores={valores}
      onChange={onChange}
      onLimpiar={manejarLimpiarPanel}
      contadorActivo={contadorCalculado}
      resumenActivo={resumenCalculado}
      cargando={cargando}
      error={error}
    />
  );

  const sheet =
    abierto && !esEscritorio ? (
      <FiltrosSheet
        id={id}
        titulo={titulo}
        descripcion={descripcion}
        campos={campos}
        borrador={borrador}
        onCambio={manejarCambioBorrador}
        onLimpiar={manejarLimpiarBorrador}
        onAplicar={manejarAplicar}
        onCerrar={onCerrar}
        contadorBorrador={contadorBorrador}
        resultados={resultados}
        etiquetaAplicar={etiquetaAplicar}
        cargando={cargando}
        error={error}
      />
    ) : null;

  if (!children) {
    return (
      <>
        {barra}
        {panel}
        {sheet}
      </>
    );
  }

  return (
    <>
      {barra}
      <div className="mt-3 grid min-w-0 gap-4 lg:mt-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        {panel}
        <div className="min-w-0">{children}</div>
      </div>
      {sheet}
    </>
  );
}
