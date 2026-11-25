// @build: 2026-11-24 | id: EMULADOS-CATALOGO | desc: Catálogo único de emuladores con carga diferida
import React from 'react';
import { Compass, ShieldCheck, Target, Zap } from 'lucide-react';

// Los simuladores se cargan solo al abrir su página: no pesan en el hub ni en el Reto Vial.
const EmuladoCarril = React.lazy(() => import('./entrenador_t_ctico_de_carril_1_2_3_y_puntos_ciegos.tsx'));
const EmuladoTclocs = React.lazy(() => import('./inspector_visual_t_clocs_360.tsx'));
const EmuladoSlpr = React.lazy(() => import('./simulador_de_inclinaci_n_y_contramanillar_slpr.tsx'));
const EmuladoCabina = React.lazy(() => import('./cabina_controles_sin_mirar.tsx'));

export const EMULADOS = [
  {
    id: 'carril',
    titulo: 'Carril 1-2-3 y puntos ciegos',
    resumen: 'Simulador en vivo, laboratorio de posiciones y desafío táctico de 8 casos.',
    detalle: 'SEE · 3 sub-tabs',
    icono: Target,
    accent: 'bg-blue-50 text-[#2563EB] border-blue-200',
    Componente: EmuladoCarril,
  },
  {
    id: 'tclocs',
    titulo: 'Inspector visual T-CLOCS 360',
    resumen: 'Recorrido guiado por las 7 áreas de inspección antes de rodar.',
    detalle: '7 áreas · checklist',
    icono: ShieldCheck,
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Componente: EmuladoTclocs,
  },
  {
    id: 'slpr',
    titulo: 'Inclinación y contramanillar',
    resumen: 'Curvas en vivo con inclinación, postura y reto de contramanillar.',
    detalle: 'SLPR · giroscopio',
    icono: Zap,
    accent: 'bg-indigo-50 text-[#4F46E5] border-indigo-200',
    Componente: EmuladoSlpr,
  },
  {
    id: 'cabina',
    titulo: 'Cabina: controles sin mirar',
    resumen: 'Explora los mandos, reto de memoria y postura sin mirar el manubrio.',
    detalle: 'Explorar · reto · postura',
    icono: Compass,
    accent: 'bg-amber-50 text-amber-700 border-amber-200',
    Componente: EmuladoCabina,
  },
];

export const obtenerEmulado = (id) => EMULADOS.find((modulo) => modulo.id === id) || null;
