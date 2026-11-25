import React from 'react';
import { useLocation } from 'react-router-dom';
import { ASISTENTE_ACTIVO, RUTAS_ASISTENTE } from '../../utils/asistente';
import AsistenteWidget from './AsistenteWidget';

// Montaje global: solo en las rutas publicas y solo si el asistente esta activado por entorno.
export default function AsistenteFlotante() {
  const { pathname } = useLocation();
  if (!ASISTENTE_ACTIVO) return null;
  if (!RUTAS_ASISTENTE.includes(pathname)) return null;
  return <AsistenteWidget />;
}
