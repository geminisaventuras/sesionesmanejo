// @build: 2026-11-24 | id: F-02-PACKS-VIA-DATOS | desc: Derivaciones puras para la réplica "Packs de La Vía" con datos reales.
//
// Reglas duras:
// - No recalcula el precio base del pack: lo recibe de `resolverPrecioPackPublico`/`calcularPrecio`.
// - El recargo de sede se suma por sesión (semántica T-103: `recargo × número de sesiones`).
// - No inventa descuentos, sedes ni teóricos; solo lee `recargosSede`, `cursos` y `teoricosCount`.

export const KM_POR_TIPO = Object.freeze({
  equilibrio: 'KM 0',
  basico_auto: 'KM 1',
  basico_sincro: 'KM 1',
  general: 'KM 2',
  otro: 'KM 2',
});

export function kmDeCurso(curso) {
  return KM_POR_TIPO[curso?.tipoCurso] || 'KM 2';
}

export function sesionesDelPack(pack) {
  return Array.isArray(pack?.cursos) ? pack.cursos.filter(Boolean) : [];
}

export function etapasKmDelPack(pack) {
  const presentes = new Set(sesionesDelPack(pack).map(kmDeCurso));
  return ['KM 0', 'KM 1', 'KM 2'].filter((km) => presentes.has(km));
}

export function transmisionDePack(pack) {
  const tipos = sesionesDelPack(pack).map((curso) => curso.tipoCurso);
  if (tipos.includes('basico_sincro') && !tipos.includes('basico_auto')) return 'sincro';
  if (tipos.includes('basico_auto') && !tipos.includes('basico_sincro')) return 'auto';
  return null;
}

export function perfilDePack(pack) {
  return etapasKmDelPack(pack).includes('KM 0') ? 'cero' : 'equilibrio';
}

export function nombreVisiblePack(pack) {
  const nombre = String(pack?.nombre ?? '').trim();
  if (!nombre) return 'Pack de sesiones';
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export function etiquetaCortaPack(pack) {
  if (pack?.cubreRutaCompleta) return 'Ruta Completa · 3 etapas';
  const etapas = etapasKmDelPack(pack).length;
  return etapas > 0 ? `Desde Básica · ${etapas} ${etapas === 1 ? 'etapa' : 'etapas'}` : 'Pack de sesiones';
}

export function badgePack(pack) {
  if (pack?.cubreRutaCompleta) return 'Ideal desde cero';
  return 'Ya tienes equilibrio';
}

export function sedesDePacks(packs = []) {
  const mapa = new Map();
  (Array.isArray(packs) ? packs : []).forEach((pack) => {
    const lista = Array.isArray(pack?.recargosSede) ? pack.recargosSede : [];
    lista.forEach((sede) => {
      if (!sede || typeof sede !== 'object') return;
      const id = String(sede.id ?? '').trim();
      const nombre = typeof sede.nombre === 'string' ? sede.nombre.trim() : '';
      if (!id || !nombre || mapa.has(id)) return;
      mapa.set(id, {
        id,
        nombre,
        recargo: Math.max(0, Number(sede.recargo) || 0),
      });
    });
  });
  return [...mapa.values()];
}

/**
 * Recargo aplicable del pack para una sede. Si el pack declara `recargosSede`,
 * solo esas sedes están permitidas; si no declara ninguna, se asume sin recargo.
 */
export function recargoParaSede(pack, sedeId) {
  const lista = Array.isArray(pack?.recargosSede) ? pack.recargosSede : [];
  if (lista.length === 0) return { permitida: true, recargo: 0 };
  const sede = lista.find((item) => String(item?.id) === String(sedeId));
  if (!sede) return { permitida: false, recargo: 0 };
  return { permitida: true, recargo: Math.max(0, Number(sede.recargo) || 0) };
}

/**
 * Aplica el recargo de sede al total ya calculado. `precio` viene del resolutor real:
 * { base, final, ahorro }. El descuento no cambia; el recargo se suma a base y final.
 */
export function precioConSede({ precio, pack, sedeId }) {
  if (!precio || precio.estado === 'no_disponible') return null;
  const base = Number(precio.base);
  const final = Number(precio.final);
  if (!Number.isFinite(base) || !Number.isFinite(final)) return null;

  const sesiones = sesionesDelPack(pack).length || (Array.isArray(pack?.cursoIds) ? pack.cursoIds.length : 0);
  const { permitida, recargo } = recargoParaSede(pack, sedeId);
  const recargoTotal = recargo * sesiones;
  const baseConSede = base + recargoTotal;
  const finalConSede = final + recargoTotal;
  const ahorro = Number.isFinite(Number(precio.ahorro))
    ? Number(precio.ahorro)
    : Math.max(0, base - final);

  return {
    permitida,
    sesiones,
    recargoPorSesion: recargo,
    recargoTotal,
    base: baseConSede,
    final: finalConSede,
    ahorro,
    porcentajeOff: baseConSede > 0 ? Math.round((ahorro / baseConSede) * 100) : 0,
  };
}

export function recomendacionPack({ packs = [], experiencia = 'cero', transmision = 'auto' }) {
  const lista = (Array.isArray(packs) ? packs : []).filter((pack) => sesionesDelPack(pack).length > 0);
  if (lista.length === 0) return null;

  const conTransmision = lista.filter((pack) => transmisionDePack(pack) === transmision);
  const candidatos = conTransmision.length > 0 ? conTransmision : lista;
  const perfilBuscado = experiencia === 'cero' ? 'cero' : 'equilibrio';

  return (
    candidatos.find((pack) => perfilDePack(pack) === perfilBuscado) ||
    candidatos.find((pack) => perfilDePack(pack) === 'cero') ||
    candidatos[0]
  );
}

export function transmisionesDisponibles(packs = []) {
  const tipos = new Set(
    (Array.isArray(packs) ? packs : []).map((pack) => transmisionDePack(pack)).filter(Boolean)
  );
  return [...tipos];
}
