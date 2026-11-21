// Códigos de instituciones bancarias usadas en Pago Móvil.
// La lista es solo de presentación; no cambia reglas de pago.
export const BANCOS = [
  { nombre: 'Venezuela', codigo: '0102' },
  { nombre: 'Banco Venezolano de Crédito', codigo: '0104' },
  { nombre: 'Mercantil', codigo: '0105' },
  { nombre: 'Provincial', codigo: '0108' },
  { nombre: 'Bancaribe', codigo: '0114' },
  { nombre: 'Banco Exterior', codigo: '0115' },
  { nombre: 'Banco Caroní', codigo: '0128' },
  { nombre: 'Banesco', codigo: '0134' },
  { nombre: 'Banco Sofitasa', codigo: '0137' },
  { nombre: 'Banco Plaza', codigo: '0138' },
  { nombre: 'Bangente', codigo: '0146' },
  { nombre: 'BFC Banco Fondo Común', codigo: '0151' },
  { nombre: '100% Banco', codigo: '0156' },
  { nombre: 'DelSur Banco Universal', codigo: '0157' },
  { nombre: 'Tesoro', codigo: '0163' },
  { nombre: 'Bancrecer', codigo: '0168' },
  { nombre: 'R4 Banco Microfinanciero', codigo: '0169' },
  { nombre: 'Banco Activo', codigo: '0171' },
  { nombre: 'Bancamiga', codigo: '0172' },
  { nombre: 'Banco Internacional de Desarrollo', codigo: '0173' },
  { nombre: 'Banplus', codigo: '0174' },
  { nombre: 'Banco Digital de los Trabajadores (BDT)', codigo: '0175' },
  { nombre: 'BANFANB', codigo: '0177' },
  { nombre: 'N58 Banco Digital', codigo: '0178' },
  { nombre: 'BNC', codigo: '0191' },
  { nombre: 'TodoTicket', codigo: '' },
  { nombre: 'Ubii Pagos', codigo: '' }
];

export const BANCOS_NOMBRES = BANCOS.map(banco => banco.nombre);

export const BANCOS_CODIGOS = BANCOS.reduce((acc, banco) => {
  acc[banco.nombre] = banco.codigo;
  return acc;
}, {});
