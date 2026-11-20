// @build: 2026-11-19 | id: FINANCE-CONSTANTS | desc: Catálogos y configuración fiscal del módulo financiero

export const FINANZAS_DEFAULT = {
  iva: {
    activo: false,
    cobrarEnCheckout: false,
    tasa: 16,
    rif: '',
    razonSocial: '',
    direccionFiscal: '',
    telefono: '',
    correo: '',
    numeracion: ''
  },
  categoriasIngreso: ['ingreso_reserva', 'ingreso_extra', 'ajuste', 'devolucion'],
  categoriasEgreso: [
    'comision_instructor',
    'comision_proveedor',
    'pago_extra_personal',
    'gasto_operativo',
    'impuesto',
    'ajuste',
    'devolucion'
  ]
};

export const CATEGORIAS = {
  ingreso_reserva: { tipo: 'ingreso', label: 'Ingreso por reserva', icono: 'BookOpen' },
  ingreso_extra: { tipo: 'ingreso', label: 'Ingreso extra', icono: 'PlusCircle' },
  comision_instructor: { tipo: 'egreso', label: 'Comisión instructor', icono: 'User' },
  comision_proveedor: { tipo: 'egreso', label: 'Comisión proveedor', icono: 'Truck' },
  pago_extra_personal: { tipo: 'egreso', label: 'Pago extra a personal', icono: 'Wallet' },
  gasto_operativo: { tipo: 'egreso', label: 'Gasto operativo', icono: 'Receipt' },
  impuesto: { tipo: 'egreso', label: 'Impuesto', icono: 'Landmark' },
  ajuste: { tipo: 'egreso', label: 'Ajuste', icono: 'SlidersHorizontal' },
  devolucion: { tipo: 'egreso', label: 'Devolución', icono: 'RotateCcw' }
};

export const METODOS_PAGO_FINANZAS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'pago_movil', label: 'Pago Móvil' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'usdt', label: 'USDT' },
  { id: 'otro', label: 'Otro' }
];

export const etiquetaCategoria = (categoria) => CATEGORIAS[categoria]?.label || 'Otro';
export const tipoCategoria = (categoria) => CATEGORIAS[categoria]?.tipo || 'egreso';
export const categoriasPorTipo = (tipo) => Object.entries(CATEGORIAS)
  .filter(([, meta]) => meta.tipo === tipo)
  .map(([id, meta]) => ({ id, ...meta }));
