// @build: 2026-11-24 | id: F-02-VIA-DATOS | desc: Derivaciones puras para la réplica visual "La Vía" con datos reales del catálogo.
//
// Reglas duras:
// - No inventa precios, duraciones ni textos: solo lee campos publicados del curso/pack.
// - No decide gating ni negocio: `bloqueado` y `prerequisitoLabel` llegan desde la vista.
// - Los campos ricos (`dirigidoA`, `formato`) se aplanan solo para chips de tarjeta;
//   el detalle completo usa `TextoEnriquecido`.

import { calcularDias, formatearDias } from '../../../shared/utils/duraciones.js';
import { CURSO_SECUENCIA } from '../../../../constants/cursoSecuencia.js';

export const KM_ETAPAS = Object.freeze({
  equilibrio: { km: 'KM 0', numero: 1, titulo: 'Equilibrio', tipoArte: 'equilibrio' },
  basicas: { km: 'KM 1', numero: 2, titulo: 'Sesiones básicas', tipoArte: 'basicas' },
  practica: { km: 'KM 2', numero: 3, titulo: 'Práctica y refuerzo', tipoArte: 'practica' },
});

export const ETAPAS_NAV = Object.freeze([
  { clave: 'equilibrio', corto: 'KM 0', titulo: 'Equilibrio' },
  { clave: 'basicas', corto: 'KM 1', titulo: 'Básica' },
  { clave: 'practica', corto: 'KM 2', titulo: 'Refuerzo' },
  { clave: 'packs', corto: 'Packs', titulo: 'Ahorra' },
]);

export function formatearDuracion(minutos) {
  const m = Number(minutos);
  if (!Number.isFinite(m) || m <= 0) return null;
  const horas = Math.floor(m / 60);
  const mins = m % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return `${horas}h ${mins} min`;
}

export function duracionCurso(curso) {
  const duracion = formatearDuracion(curso?.duracionTotal);
  const dias = calcularDias(curso?.duracionTotal);
  if (!duracion) return null;
  return dias > 0 ? `${duracion} · ${formatearDias(dias)}` : duracion;
}

export function listaTexto(valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof valor === 'string') {
    return valor.split('\n').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function textoPlano(valor) {
  const texto = String(valor ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return texto || null;
}

export function precioCurso(curso) {
  const crudo = curso?.precioBase;
  if (crudo == null || crudo === '' || typeof crudo === 'boolean') return null;
  const precio = Number(crudo);
  return Number.isFinite(precio) && precio >= 0 ? precio : null;
}

// FT-062: la vitrina muestra "desde" base + recargo de la sede elegida.
// El recargo viene de `informacionPublica/sedes` (proyección pública de `sedes`)
// y se redondea a centavos; nunca inventa un monto si el curso no publica base.
export function precioCursoConSede(curso, sede) {
  const base = precioCurso(curso);
  if (base == null) return null;
  const crudo = sede?.recargo;
  const recargo =
    crudo == null || crudo === '' || typeof crudo === 'boolean' ? 0 : Number(crudo);
  const recargoSeguro = Number.isFinite(recargo) && recargo > 0 ? recargo : 0;
  return Math.round((base + recargoSeguro) * 100) / 100;
}

export function formatearMonto(valor) {
  if (valor == null || valor === '' || typeof valor === 'boolean') return null;
  const monto = Number(valor);
  if (!Number.isFinite(monto)) return null;
  return monto % 1 === 0 ? String(monto) : monto.toFixed(2);
}

export function formatoPrecio(valor) {
  const texto = formatearMonto(valor);
  return texto == null ? null : `$${texto}`;
}

export function prerequisitoLabel(tipoCurso, curso, cursos = []) {
  const prereqs = Array.isArray(curso?.prerequisitos)
    ? curso.prerequisitos
    : CURSO_SECUENCIA[tipoCurso]?.prerequisito || [];
  if (!Array.isArray(prereqs) || prereqs.length === 0) return null;

  const labels = {
    basico_auto: 'Sesión Básica Automática',
    basico_sincro: 'Sesión Básica Sincrónica',
    general: 'Refuerzo Práctico',
  };

  return prereqs
    .map((p) => (cursos || []).find((x) => x.tipoCurso === p)?.nombre || labels[p] || p)
    .join(' o ');
}

export function esBasico(curso) {
  return curso?.tipoCurso === 'basico_auto' || curso?.tipoCurso === 'basico_sincro';
}

export function recomendacionPara({ experiencia, tipoMoto, etapas, cursos = [] }) {
  const equilibrio = etapas?.equilibrio?.[0] || null;
  const basicoAuto = etapas?.basicas?.find((c) => c.tipoCurso === 'basico_auto') || null;
  const basicoSincro = etapas?.basicas?.find((c) => c.tipoCurso === 'basico_sincro') || null;
  const practica = etapas?.practica || [];
  const basicoActivo = tipoMoto === 'sincro' ? basicoSincro : basicoAuto;

  if (experiencia === 'cero') {
    const curso = equilibrio || basicoActivo || practica[0] || cursos[0] || null;
    return {
      clave: equilibrio ? 'equilibrio' : curso?.tipoCurso === 'general' ? 'practica' : 'basicas',
      curso,
      titulo: curso?.nombre || 'Equilibrio y Confianza',
      mensaje:
        'Es el lugar perfecto para comenzar sin presiones. Primero te familiarizas con el peso de la moto y el equilibrio real en pista cerrada; cuando te sientas en confianza, pasas a tu Básica.',
    };
  }

  if (experiencia === 'bici_nervios') {
    const curso = basicoActivo || equilibrio || practica[0] || null;
    return {
      clave: curso && esBasico(curso) ? 'basicas' : curso?.tipoCurso === 'equilibrio' ? 'equilibrio' : 'practica',
      curso,
      titulo: curso?.nombre || 'Sesión Básica',
      mensaje:
        'Ya tienes el equilibrio a tu favor. En pista sin tráfico transformamos esos nervios en control suave de acelerador, giros y frenos.',
    };
  }

  const curso = practica[0] || basicoActivo || equilibrio || null;
  return {
    clave: practica.length > 0 ? 'practica' : curso && esBasico(curso) ? 'basicas' : 'equilibrio',
    curso,
    titulo: curso?.nombre || 'Refuerzo Práctico',
    mensaje:
      'Si ya manejas lo básico, te ayudamos a soltarte de verdad: lectura de calle, cambios de canal seguros y más confianza en avenidas.',
  };
}

export function transmisionDePack(pack) {
  const tipos = (Array.isArray(pack?.cursos) ? pack.cursos : []).map((curso) => curso?.tipoCurso);
  if (tipos.includes('basico_sincro') && !tipos.includes('basico_auto')) return 'sincro';
  if (tipos.includes('basico_auto') && !tipos.includes('basico_sincro')) return 'auto';
  return null;
}

export function nombreCortoEtapa(clave) {
  return KM_ETAPAS[clave]?.km || 'KM';
}

export function scrollASeccion(id) {
  if (typeof document === 'undefined') return;
  const nodo = document.getElementById(id);
  if (!nodo) return;
  const reducido =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  nodo.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
}
