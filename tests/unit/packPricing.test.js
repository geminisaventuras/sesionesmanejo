import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularPreciosPack,
  resolverTraeMoto,
  seleccionarValoresCurso,
  sumarProrrateados,
} from '../../src/modules/inscripcion/utils/packPricing.js';

const curso = (id, precioBase, comisionInstructor = 0, comisionProveedor = 0, extra = {}) => ({
  id,
  precioBase,
  comisionInstructor,
  comisionProveedor,
  motoIncluida: true,
  permiteTraerMotoPropia: true,
  ...extra,
});

test('2 cursos con descuento porcentual: suma exacta y centavos', () => {
  const precios = calcularPreciosPack({
    cursos: [curso('a', 100, 20, 10), curso('b', 50, 10, 5)],
    descuentoTipo: 'porcentaje',
    descuentoValor: 10,
  });
  assert.equal(precios.precioBaseTotal, 150);
  assert.equal(precios.descuentoMonto, 15);
  assert.equal(precios.precioTotal, 135);
  assert.deepEqual(precios.preciosProrrateados, [90, 45]);
  assert.equal(sumarProrrateados(precios), 135);
});

test('3 cursos con 33%: el último absorbe el residuo', () => {
  const precios = calcularPreciosPack({
    cursos: [curso('a', 100), curso('b', 100), curso('c', 100)],
    descuentoTipo: 'porcentaje',
    descuentoValor: 33,
  });
  assert.equal(precios.precioTotal, 201);
  assert.deepEqual(precios.preciosProrrateados, [67, 67, 67]);
  assert.equal(sumarProrrateados(precios), 201);
});

test('teóricos incluidos: base combinada, descuento y total', () => {
  const precios = calcularPreciosPack({
    cursos: [curso('a', 100), curso('b', 50)],
    cursosTeoricos: [{ id: 't1', precio: 30 }],
    sumarTeoricosAlPrecio: true,
    descuentoTipo: 'porcentaje',
    descuentoValor: 10,
  });
  assert.equal(precios.baseSesiones, 150);
  assert.equal(precios.baseTeoricos, 30);
  assert.equal(precios.precioBaseTotal, 180);
  assert.equal(precios.descuentoMonto, 18);
  assert.equal(precios.precioTotal, 162);
  assert.equal(sumarProrrateados(precios), 162);
  assert.equal(precios.teoricosIncluidos, true);
  assert.deepEqual(precios.teoricosPrecios, [30]);
});

test('moto propia: comisión de proveedor 0 y déficit propio', () => {
  const precios = calcularPreciosPack({
    cursos: [curso('a', 100, 20, 10)],
    descuentoTipo: 'monto',
    descuentoValor: 0,
  });
  const empresa = seleccionarValoresCurso(precios, 0, 'No', { motoAsignadaId: 'm1', proveedorId: 'p1' });
  const propia = seleccionarValoresCurso(precios, 0, 'Sí', { motoAsignadaId: 'm1', proveedorId: 'p1' });
  assert.equal(empresa.comisionProveedor, 10);
  assert.equal(empresa.motoAsignadaId, 'm1');
  assert.equal(propia.comisionProveedor, 0);
  assert.equal(propia.motoAsignadaId, null);
  assert.equal(propia.proveedorId, null);
  assert.equal(propia.deficitComision, 20 - 100);
  assert.equal(empresa.deficitComision, 30 - 100);
});

test('resolverTraeMoto usa la configuración congelada, no el cliente', () => {
  const conMoto = { motoIncluidaPorCurso: [true], permiteTraerMotoPropiaPorCurso: [true] };
  assert.equal(resolverTraeMoto(conMoto, 0, 'a', { a: 'Sí' }), 'Sí');
  assert.equal(resolverTraeMoto(conMoto, 0, 'a', { a: 'No' }), 'No');
  const sinMoto = { motoIncluidaPorCurso: [false], permiteTraerMotoPropiaPorCurso: [true] };
  assert.equal(resolverTraeMoto(sinMoto, 0, 'a', { a: 'No' }), 'Sí');
  const soloEscuela = { motoIncluidaPorCurso: [true], permiteTraerMotoPropiaPorCurso: [false] };
  assert.equal(resolverTraeMoto(soloEscuela, 0, 'a', { a: 'Sí' }), 'No');
});
