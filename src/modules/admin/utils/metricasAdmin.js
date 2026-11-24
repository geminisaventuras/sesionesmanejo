// @build: 2026-11-23 | id: T-065 / ERR-033 | desc: Cálculos de las tarjetas de Métricas del Negocio y del gráfico de ingresos (USD, fecha de compra VET).

import { esHijaDePack, fechaCompraMs, montoIngresoUSD, referenciaFechaVET } from './resumenAdmin.js';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria.js';

export const tipoDeReserva = (reserva, cursos = []) => {
  if (reserva?.tipoCurso) return reserva.tipoCurso;
  const curso = (cursos || []).find((c) => String(c.id) === String(reserva?.cursoId));
  return curso?.tipoCurso || reserva?.cursoId;
};

export function calcularMetricasNegocio(reservas = [], cursos = []) {
  const conteo = {};
  (reservas || []).forEach((reserva) => {
    if (reserva.estadoPago === 'Aprobado' || reserva.estadoPago === 'Pendiente') {
      const tipo = tipoDeReserva(reserva, cursos);
      if (tipo) conteo[tipo] = (conteo[tipo] || 0) + 1;
    }
  });

  let maxTipo = null;
  let maxCount = 0;
  Object.entries(conteo).forEach(([tipo, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxTipo = tipo;
    }
  });

  let cursoMasVendido = { nombre: 'Sin datos', count: 0 };
  if (maxTipo) {
    const curso = (cursos || []).find(
      (c) => c.tipoCurso === maxTipo || String(c.id) === String(maxTipo)
    );
    cursoMasVendido = { nombre: curso?.nombre || maxTipo, count: maxCount };
  }

  const usuariosEq = new Set();
  const usuariosOtros = new Set();
  (reservas || []).forEach((reserva) => {
    if (tipoDeReserva(reserva, cursos) === 'equilibrio'
      && (reserva.estadoPago === 'Aprobado' || reserva.estadoCurso === 'Aprobado')) {
      usuariosEq.add(reserva.userId);
    }
  });
  (reservas || []).forEach((reserva) => {
    if (tipoDeReserva(reserva, cursos) !== 'equilibrio' && reserva.estadoPago === 'Aprobado') {
      if (usuariosEq.has(reserva.userId)) usuariosOtros.add(reserva.userId);
    }
  });

  const totalEq = usuariosEq.size;
  const totalConv = usuariosOtros.size;
  const pct = totalEq > 0 ? Math.round((totalConv / totalEq) * 100) : 0;

  return {
    cursoMasVendido,
    conversionEquilibrio: { pct, totalEq, totalConv },
  };
}

export const restarDiasVET = (fecha, dias) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia - dias, 12)).toISOString().slice(0, 10);
};

const etiquetaDiaVET = (fecha) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia, 12))
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' });
};

/**
 * Ingresos de los últimos días por FECHA DE COMPRA en USD, con la misma definición
 * del Home (T-065/ERR-033): reservas individuales aprobadas sin hijas de pack +
 * maestras de `reservasPack`. `reserva.fecha` (fecha del curso) no es fecha de pago.
 */
export function calcularIngresosUltimosDias(
  reservas = [],
  { ahora = new Date(), dias = 7, packs = [] } = {}
) {
  const totalDias = Math.max(1, Number(dias) || 7);
  const hoyVET = obtenerFechaVenezuela(referenciaFechaVET(ahora));

  const porDia = new Map();
  for (const doc of [...(reservas || []).filter((r) => !esHijaDePack(r)), ...(packs || [])]) {
    if (doc?.estadoPago !== 'Aprobado' || doc?.estadoCurso === 'Cancelado') continue;
    const ms = fechaCompraMs(doc);
    if (ms === null) continue;
    const dia = obtenerFechaVenezuela(new Date(ms));
    porDia.set(dia, (porDia.get(dia) || 0) + montoIngresoUSD(doc));
  }

  const puntos = [];
  for (let i = totalDias - 1; i >= 0; i--) {
    const fecha = restarDiasVET(hoyVET, i);
    puntos.push({
      label: etiquetaDiaVET(fecha),
      valor: porDia.get(fecha) || 0,
    });
  }
  return puntos;
}
