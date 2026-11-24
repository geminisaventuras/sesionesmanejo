// @build: 2026-11-23 | id: T-065 | desc: Cálculos de las tarjetas de Métricas del Negocio y del gráfico de ingresos.
//
// Réplica exacta de los cálculos que ya mostraba AdminResumen (mismos filtros y
// redondeos) para compartirlos entre el Home y la pantalla /admin/metricas sin
// alterar ningún KPI.

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

const fechaDePago = (reserva) => reserva.createdAt?.toDate?.() || (reserva.fecha ? new Date(reserva.fecha) : null);

export function calcularIngresosUltimosDias(reservas = [], { ahora = new Date(), dias = 7 } = {}) {
  const lista = reservas || [];
  const totalDias = Math.max(1, Number(dias) || 7);
  const puntos = [];

  for (let i = totalDias - 1; i >= 0; i--) {
    const dia = new Date(ahora);
    dia.setDate(dia.getDate() - i);
    const fechaStr = dia.toISOString().split('T')[0];
    const total = lista
      .filter((reserva) => {
        if (reserva.estadoPago !== 'Aprobado') return false;
        const fecha = fechaDePago(reserva);
        return fecha && fecha.toISOString().split('T')[0] === fechaStr;
      })
      .reduce((acc, reserva) => acc + (Number(reserva.pagoTotalMoneda) || 0), 0);

    puntos.push({
      label: dia.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      valor: total,
    });
  }

  return puntos;
}
