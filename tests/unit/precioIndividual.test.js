import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularPrecioIndividual,
  resolverTraeMotoIndividual,
  resolverTasaFXVigente,
  resolverComisionProveedorIndividual,
  calcularPagoTotalVES,
} from '../../src/modules/inscripcion/utils/precioIndividual.js';

const curso = (extra = {}) => ({
  id: 'curso1',
  precioBase: 35,
  comisionInstructor: 15,
  comisionProveedor: 10,
  comisionProveedorPorSede: {},
  motoIncluida: true,
  permiteTraerMotoPropia: true,
  precioAlquilerMoto: 0,
  ...extra,
});

const config = (extra = {}) => ({
  precioBase: 35,
  recargoGuarenas: 5,
  recargoSinBici: 0,
  descuentoMotoPropia: 0,
  descuentoPromo: 0,
  monedaCobroClientes: 'EUR',
  tasaUSD: 600,
  tasaEUR: 700,
  ...extra,
});

test('precio base sin recargos: snapshot y comisiones', () => {
  const snap = calcularPrecioIndividual({
    curso: curso(),
    config: config(),
    sede: { id: 'sede1', nombre: 'Caracas' },
    sedeId: 'sede1',
    sabeBicicleta: 'Sí',
    traeMoto: 'No',
  });
  assert.equal(snap.precioBase, 35);
  assert.equal(snap.precioTotal, 35);
  assert.equal(snap.comisionInstructor, 15);
  assert.equal(snap.comisionProveedor, 10);
  assert.equal(snap.deficitComision, -10);
  assert.equal(snap.moneda, 'USD');
  assert.equal(snap.tasaFX, 700);
  assert.equal(snap.pagoTotalVES, 24500);
});

test('sede Guarenas suma recargo', () => {
  const snap = calcularPrecioIndividual({
    curso: curso(),
    config: config(),
    sede: { id: 'sede1', nombre: 'Guarenas' },
    sedeId: 'sede1',
    sabeBicicleta: 'Sí',
    traeMoto: 'No',
  });
  assert.equal(snap.guarenas, true);
  assert.equal(snap.recargoSede, 5);
  assert.equal(snap.precioTotal, 40);
});

test('sin bicicleta suma recargo y se refleja en VES congelado', () => {
  const snap = calcularPrecioIndividual({
    curso: curso(),
    config: config({ recargoSinBici: 10, monedaCobroClientes: 'USD', tasaUSD: 123.45 }),
    sede: { id: 'sede1', nombre: 'Caracas' },
    sedeId: 'sede1',
    sabeBicicleta: 'No',
    traeMoto: 'No',
  });
  assert.equal(snap.recargoSinBici, 10);
  assert.equal(snap.precioTotal, 45);
  assert.equal(snap.tasaFX, 123.45);
  assert.equal(snap.pagoTotalVES, 5555.25);
});

test('moto propia: descuento, comisión de proveedor 0 y déficit propio', () => {
  const snap = calcularPrecioIndividual({
    curso: curso(),
    config: config({ descuentoMotoPropia: 5 }),
    sede: { id: 'sede1', nombre: 'Caracas' },
    sedeId: 'sede1',
    sabeBicicleta: 'Sí',
    traeMoto: 'Sí',
  });
  assert.equal(snap.traeMoto, 'Sí');
  assert.equal(snap.descuentoMotoPropia, 5);
  assert.equal(snap.precioTotal, 30);
  assert.equal(snap.comisionProveedor, 0);
  assert.equal(snap.deficitComision, -15);
});

test('alquiler de moto solo si no trae moto y el curso incluye moto', () => {
  const conAlquiler = calcularPrecioIndividual({
    curso: curso({ precioAlquilerMoto: 8 }),
    config: config(),
    sede: { id: 'sede1', nombre: 'Caracas' },
    sedeId: 'sede1',
    sabeBicicleta: 'Sí',
    traeMoto: 'No',
  });
  assert.equal(conAlquiler.recargoAlquilerMoto, 8);
  assert.equal(conAlquiler.precioTotal, 43);

  const sinMoto = calcularPrecioIndividual({
    curso: curso({ precioAlquilerMoto: 8, motoIncluida: false }),
    config: config(),
    sede: { id: 'sede1', nombre: 'Caracas' },
    sedeId: 'sede1',
    sabeBicicleta: 'Sí',
    traeMoto: 'Sí',
  });
  assert.equal(sinMoto.recargoAlquilerMoto, 0);
  assert.equal(sinMoto.precioTotal, 35);
});

test('comisión de proveedor por sede con fallback a la base', () => {
  const c = curso({ comisionProveedor: 10, comisionProveedorPorSede: { sede1: 12 } });
  assert.equal(resolverComisionProveedorIndividual({ curso: c, sedeId: 'sede1', traeMoto: 'No' }), 12);
  assert.equal(resolverComisionProveedorIndividual({ curso: c, sedeId: 'sede2', traeMoto: 'No' }), 10);
  assert.equal(resolverComisionProveedorIndividual({ curso: c, sedeId: 'sede1', traeMoto: 'Sí' }), 0);
});

test('descuento promocional se aplica sobre el total y no baja de cero', () => {
  const snap = calcularPrecioIndividual({
    curso: curso({ precioBase: 35 }),
    config: config({ descuentoPromo: 5 }),
    sede: { id: 'sede1', nombre: 'Caracas' },
    sedeId: 'sede1',
    sabeBicicleta: 'Sí',
    traeMoto: 'No',
  });
  assert.equal(snap.precioTotal, 30);

  assert.throws(() => calcularPrecioIndividual({
    curso: curso({ precioBase: 10 }),
    config: config({ descuentoPromo: 10 }),
    sede: { id: 'sede1', nombre: 'Caracas' },
    sedeId: 'sede1',
    sabeBicicleta: 'Sí',
    traeMoto: 'No',
  }), /mayor que cero/);
});

test('resolverTraeMotoIndividual fuerza el catálogo sobre el payload', () => {
  assert.equal(resolverTraeMotoIndividual({ motoIncluida: false }, 'No'), 'Sí');
  assert.equal(resolverTraeMotoIndividual({ permiteTraerMotoPropia: false }, 'Sí'), 'No');
  assert.equal(resolverTraeMotoIndividual({}, 'Sí'), 'Sí');
  assert.equal(resolverTraeMotoIndividual({}, 'No'), 'No');
});

test('tasa FX: USD SSOT con fallback a 1 si la tasa no es válida', () => {
  assert.equal(resolverTasaFXVigente({ monedaCobroClientes: 'EUR', tasaEUR: '840.85' }), 840.85);
  assert.equal(resolverTasaFXVigente({ monedaCobroClientes: 'USD', tasaUSD: '846.51' }), 846.51);
  assert.equal(resolverTasaFXVigente({ monedaCobroClientes: 'EUR', tasaEUR: 0 }), 1);
  assert.equal(resolverTasaFXVigente({ monedaCobroClientes: 'USD' }), 1);
});

test('conversión USD→VES congelada redondea a centavos', () => {
  assert.equal(calcularPagoTotalVES(35, 700), 24500);
  assert.equal(calcularPagoTotalVES(13.5, 919.82), 12417.57);
  assert.equal(calcularPagoTotalVES(81, 860.17), 69673.77);
  assert.equal(calcularPagoTotalVES(35, 0), 35);
});

test('el curso debe tener precio base válido', () => {
  assert.throws(() => calcularPrecioIndividual({
    curso: { id: 'c', precioBase: 0, motoIncluida: true },
    config: { precioBase: 0 },
    sede: { id: 'sede1', nombre: 'Caracas' },
    sedeId: 'sede1',
    sabeBicicleta: 'Sí',
    traeMoto: 'No',
  }), /precio base válido/);
});
