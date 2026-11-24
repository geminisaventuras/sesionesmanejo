// @build: 2026-11-22 | id: ERR-018-D9 | desc: Detección pura de conflictos de tutor/moto al reprogramar (bloqueante, sin override silencioso).
import { ESTADOS_OCUPAN, getHoraIdOcupacion, getMotoIdOcupacion } from '../../shared/utils/reservaHelpers.js';

const normalizarId = (valor) => (valor === null || valor === undefined ? '' : String(valor).trim());

const normalizarFechas = (fechas) => {
  const vistas = new Set();
  const resultado = [];
  for (const fecha of fechas || []) {
    const valor = typeof fecha === 'string' ? fecha.trim() : '';
    if (!valor || vistas.has(valor)) continue;
    vistas.add(valor);
    resultado.push(valor);
  }
  return resultado;
};

/**
 * D9: compara el bloque/moto EFECTIVOS de cada fecha candidata contra la
 * ocupación confirmada. Puras: sin Firestore.
 *
 * - Excluye la propia reserva por id (nunca se bloquea a sí misma).
 * - Solo cuentan reservas `Aprobado`/`Pendiente` (canceladas no bloquean).
 * - En D2 resuelve `horaIdReposicion`/`motoReposicionId` vía helpers SSOT.
 */
export function detectarConflictosReprogramacion({
  reserva,
  ocupacionConfirmada = [],
  fechas = [],
  horaId,
  instructorId,
  motoId,
  excluirReservaId
} = {}) {
  const vacio = { bloqueado: false, conflictos: [] };
  const bloque = normalizarId(horaId);
  const fechasValidas = normalizarFechas(fechas);
  const excluir = normalizarId(excluirReservaId ?? reserva?.id);
  const tutor = normalizarId(instructorId ?? reserva?.instructorId);
  const moto = normalizarId(motoId);

  if (!reserva || !bloque || fechasValidas.length === 0) return vacio;

  const conflictos = [];
  const vistos = new Set();

  const agregar = (conflicto) => {
    const clave = `${conflicto.tipo}|${conflicto.reservaId ?? ''}|${conflicto.fecha}|${conflicto.horaId}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    conflictos.push(conflicto);
  };

  for (const r of ocupacionConfirmada || []) {
    if (!r) continue;
    if (r.id != null && String(r.id) === excluir) continue;
    if (!ESTADOS_OCUPAN.includes(r.estadoPago)) continue;

    for (const fecha of fechasValidas) {
      const bloqueR = getHoraIdOcupacion(r, fecha);
      if (bloqueR == null || String(bloqueR) !== bloque) continue;

      if (tutor && String(r.instructorId) === tutor) {
        agregar({
          tipo: 'instructor',
          reservaId: r.id ?? null,
          fecha,
          horaId: bloque,
          instructorId: tutor
        });
      }

      if (moto && r.traeMoto !== 'Sí') {
        const motoR = getMotoIdOcupacion(r, fecha);
        if (motoR != null && String(motoR) === moto) {
          agregar({
            tipo: 'moto',
            reservaId: r.id ?? null,
            fecha,
            horaId: bloque,
            motoId: moto
          });
        }
      }
    }
  }

  return { bloqueado: conflictos.length > 0, conflictos };
}

/**
 * Mensaje para UI/servicio. No expone PII: solo tipo, fecha, bloque y el ID
 * interno de la reserva en conflicto (contexto admin).
 */
export function mensajeConflictoReprogramacion(conflictos = []) {
  if (!Array.isArray(conflictos) || conflictos.length === 0) {
    return 'El nuevo horario no tiene conflictos de tutor ni de moto.';
  }
  const detalle = conflictos
    .map(c => `${c.tipo === 'moto' ? 'Moto' : 'Tutor'} ocupado el ${c.fecha} (${c.horaId})${c.reservaId ? ` · reserva ${c.reservaId}` : ''}`)
    .join('; ');
  return `El nuevo horario tiene conflictos: ${detalle}. Elige otro bloque.`;
}
