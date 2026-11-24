// @build: 2026-11-23 | id: T-071-FILTROS-INDEX | desc: Exportaciones del sistema compartido de filtros (FT-037).
export { default as FiltrosSistema } from './FiltrosSistema';
export { default as FiltrosBarra } from './FiltrosBarra';
export { default as FiltrosSheet } from './FiltrosSheet';
export { default as FiltrosPanel } from './FiltrosPanel';
export {
  CampoFecha,
  CampoRango,
  CampoSelect,
  CampoChips,
  CampoSwitch,
  CampoFiltro,
  CamposFiltros,
  GrupoCampos,
  CLASES_CONTROL,
} from './FiltrosCampos';
export {
  agruparCampos,
  construirResumenActivo,
  construirValoresIniciales,
  contarFiltrosActivos,
  esCampoActivo,
  etiquetaContador,
  normalizarOpcion,
  normalizarOpciones,
  valorPorDefecto,
  valoresIguales,
} from './filtrosHelpers';
