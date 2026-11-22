// @build: 2026-11-19 | id: FINANCE-UTILS | desc: Cálculos, filtros y compatibilidad del módulo financiero
import {
  comisionInstructorReserva,
  comisionInstructorTotal,
  comisionProveedorReserva,
  construirAsignacionesProveedor,
  esPendienteInstructor
} from '../../shared/utils/finanzasHelpers.js';
import { formatearMonto } from '../../shared/utils/currency.js';
import { CATEGORIAS, FINANZAS_DEFAULT, etiquetaCategoria, tipoCategoria } from './financeConstants.js';

export const hoyVET = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

export const inicioMesVET = () => {
  const fecha = new Date();
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    .toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
};

export const inicioSemanaVET = () => {
  const fecha = new Date();
  const dia = fecha.getDay() || 7;
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() - (dia - 1));
  return lunes.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
};

export const fechaVisible = (fecha) => (fecha ? String(fecha).slice(0, 10) : '—');

export const getFinanzasConfig = (config = {}) => {
  const finanzas = config?.finanzas || {};
  return {
    ...FINANZAS_DEFAULT,
    ...finanzas,
    iva: { ...FINANZAS_DEFAULT.iva, ...(finanzas.iva || {}) }
  };
};

export const inferirCategoriaMovimiento = (mov = {}) => {
  if (mov.categoria && CATEGORIAS[mov.categoria]) return mov.categoria;
  const desc = String(mov.desc || '').toLowerCase();
  if (desc.includes('inscripci') || desc.includes('reserva') || desc.includes('pack') || desc.includes('acceso')) {
    return 'ingreso_reserva';
  }
  if (desc.includes('comisi')) return mov.tipo === 'ingreso' ? 'ingreso_reserva' : 'comision_instructor';
  if (desc.includes('impuesto') || desc.includes('iva') || desc.includes('igtf')) return 'impuesto';
  if (desc.includes('gasto')) return 'gasto_operativo';
  return mov.tipo === 'ingreso' ? 'ingreso_extra' : 'gasto_operativo';
};

export const normalizarMovimiento = (mov = {}) => {
  const categoria = inferirCategoriaMovimiento(mov);
  return {
    ...mov,
    categoria,
    categoriaLabel: etiquetaCategoria(categoria),
    tipo: mov.tipo || tipoCategoria(categoria),
    monto: Number(mov.monto) || 0,
    moneda: mov.moneda || 'USD',
    fecha: fechaVisible(mov.fecha),
    estado: mov.estado || 'confirmado',
    origen: mov.origen || (categoria === 'ingreso_reserva' ? 'reserva' : 'manual'),
    descripcionVisible: mov.desc || etiquetaCategoria(categoria)
  };
};

export const calcularDeudas = ({ reservas = [], instructores = [], proveedores = [], config = {} }) => {
  const deudasInst = instructores.map((instructor) => {
    const pendientes = reservas.filter((r) => esPendienteInstructor(r, instructor.id));
    return {
      ...instructor,
      tipo: 'instructor',
      deuda: pendientes.reduce((acc, r) => acc + comisionInstructorReserva(r, instructor.id), 0),
      reservaIds: pendientes.map((r) => r.id)
    };
  }).filter((i) => i.deuda > 0);

  // D2-FINANZAS: la deuda de proveedor se calcula por asignaciones pendientes,
  // no por comisión completa. Incluye al proveedor de reposición de D2.
  const reservasAprobadas = reservas.filter((r) => r.estadoPago === 'Aprobado');
  const deudasProv = proveedores.map((proveedor) => {
    const asignaciones = [];
    reservasAprobadas.forEach((reserva) => {
      construirAsignacionesProveedor(reserva, config).forEach((asignacion) => {
        if (asignacion.pagado === true) return;
        if (asignacion.proveedorId == null || asignacion.proveedorId === '') return;
        if (String(asignacion.proveedorId) !== String(proveedor.id)) return;
        asignaciones.push({
          reservaId: reserva.id,
          dia: asignacion.dia,
          monto: asignacion.monto
        });
      });
    });

    const deuda = Math.round(
      asignaciones.reduce((acc, asignacion) => acc + (Number(asignacion.monto) || 0), 0) * 100
    ) / 100;

    return {
      ...proveedor,
      tipo: 'proveedor',
      deuda,
      reservaIds: [...new Set(asignaciones.map((asignacion) => asignacion.reservaId))],
      asignaciones
    };
  }).filter((p) => p.deuda > 0);

  return {
    deudasInst,
    deudasProv,
    total: [...deudasInst, ...deudasProv].reduce((acc, item) => acc + item.deuda, 0)
  };
};

export const calcularResumen = ({ reservas = [], movimientos = [], config = {} }) => {
  const aprobadas = reservas.filter((r) => r.estadoPago === 'Aprobado');
  const ingresosDevengados = aprobadas.reduce((acc, r) => acc + (Number(r.pagoTotalMoneda) || 0), 0);
  const comisionesDevengadas = aprobadas.reduce(
    (acc, r) => acc + comisionInstructorTotal(r) + comisionProveedorReserva(r, config),
    0
  );

  const normalizados = (movimientos || []).map(normalizarMovimiento);
  const delMes = normalizados.filter((m) => m.fecha >= inicioMesVET());
  const ingresosCaja = delMes.filter((m) => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0);
  const egresosCaja = delMes.filter((m) => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0);
  const utilidadCaja = ingresosCaja - egresosCaja;
  const deudas = calcularDeudas({ reservas, instructores: [], proveedores: [], config });

  return {
    ingresosDevengados,
    comisionesDevengadas,
    utilidadDevengada: ingresosDevengados - comisionesDevengadas,
    ingresosCaja,
    egresosCaja,
    utilidadCaja,
    margen: ingresosCaja > 0 ? (utilidadCaja / ingresosCaja) * 100 : 0,
    deudasPersonal: deudas.total,
    movimientosMes: delMes
  };
};

export const ordenarMovimientos = (movimientos = []) => movimientos
  .map(normalizarMovimiento)
  .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

export const filtrarMovimientos = (movimientos = [], { tipo = 'todos', categoria = 'todas', desde = '', hasta = '', texto = '' } = {}) => {
  const termino = texto.trim().toLowerCase();
  return ordenarMovimientos(movimientos).filter((mov) => {
    if (tipo !== 'todos' && mov.tipo !== tipo) return false;
    if (categoria !== 'todas' && mov.categoria !== categoria) return false;
    if (desde && mov.fecha < desde) return false;
    if (hasta && mov.fecha > hasta) return false;
    if (termino && !`${mov.descripcionVisible} ${mov.categoriaLabel} ${mov.referencia || ''}`.toLowerCase().includes(termino)) return false;
    return true;
  });
};

export const resumenPorCategoria = (movimientos = []) => {
  const mapa = new Map();
  ordenarMovimientos(movimientos).forEach((mov) => {
    const actual = mapa.get(mov.categoria) || {
      categoria: mov.categoria,
      label: mov.categoriaLabel,
      tipo: mov.tipo,
      cantidad: 0,
      total: 0
    };
    actual.cantidad += 1;
    actual.total += mov.monto;
    mapa.set(mov.categoria, actual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
};

export const descargarCSV = (nombre, filas = []) => {
  if (!filas.length) return;
  const columnas = Object.keys(filas[0]);
  const escapar = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const contenido = [
    columnas.map(escapar).join(','),
    ...filas.map((fila) => columnas.map((col) => escapar(fila[col])).join(','))
  ].join('\n');
  const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombre}-${hoyVET()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const montoDe = (monto, moneda) => formatearMonto(monto, moneda);

