// Enlaces directos del asistente (FT-061 / ERR-077).
// El Worker responde con rutas relativas en texto plano ("revisa /packs").
// Este modulo las convierte en enlaces SOLO si estan en la allowlist publica;
// nunca enlaza rutas internas de admin ni URLs de dominios ajenos.
export const RUTAS_ENLAZABLES = Object.freeze([
  '/inscripcion',
  '/packs',
  '/sesiones',
  '/teorico',
  '/emulados',
  '/evaluacion',
  '/reto-vial',
]);

const DOMINIO = '(?:https?:\\/\\/)?(?:www\\.)?motoapp\\.website';
const PATRON = new RegExp(
  `(?:${DOMINIO})?(?:${RUTAS_ENLAZABLES.map(escaparRuta).join('|')})\\/?(?![\\w/-])`,
  'gi',
);

function escaparRuta(ruta) {
  return ruta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Devuelve la ruta interna permitida o null si el texto no es una ruta publica. */
export function normalizarRutaEnlace(texto) {
  const valor = String(texto ?? '').trim();
  const absoluto = valor.match(/^https?:\/\/(?:www\.)?motoapp\.website(\/[^\s]*)$/i);
  const ruta = (absoluto ? absoluto[1] : valor).replace(/[.,;:!?]+$/, '').replace(/\/+$/, '');
  const permitida = RUTAS_ENLAZABLES.find((candidata) => candidata === ruta.toLowerCase());
  return permitida || null;
}

// Evita enlazar "/packs" dentro de otra URL o de un identificador (https://otro.com/packs).
function inicioValido(texto, indice, coincidencia) {
  if (/^https?:\/\//i.test(coincidencia)) return true;
  if (indice === 0) return true;
  return !/[A-Za-z0-9._~:/?#@!$&*+,;=%-]/.test(texto[indice - 1]);
}

/**
 * Divide una respuesta en segmentos de texto y enlaces internos.
 * @returns {Array<{tipo:'texto'|'enlace', valor:string, ruta?:string}>}
 */
export function segmentarEnlacesAsistente(texto) {
  const original = String(texto ?? '');
  const segmentos = [];
  let ultimo = 0;
  PATRON.lastIndex = 0;
  let coincidencia = PATRON.exec(original);
  while (coincidencia) {
    const ruta = normalizarRutaEnlace(coincidencia[0]);
    if (!ruta || !inicioValido(original, coincidencia.index, coincidencia[0])) {
      coincidencia = PATRON.exec(original);
      continue;
    }
    if (coincidencia.index > ultimo) {
      segmentos.push({ tipo: 'texto', valor: original.slice(ultimo, coincidencia.index) });
    }
    segmentos.push({ tipo: 'enlace', valor: coincidencia[0], ruta });
    ultimo = coincidencia.index + coincidencia[0].length;
    coincidencia = PATRON.exec(original);
  }
  if (ultimo < original.length) segmentos.push({ tipo: 'texto', valor: original.slice(ultimo) });
  return segmentos;
}
