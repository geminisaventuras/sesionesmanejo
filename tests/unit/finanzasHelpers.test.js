import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularTotalPago,
  comisionProveedorReserva,
  comisionInstructorReserva,
} from '../../src/modules/shared/utils/finanzasHelpers.js';

const detalles = (...comisiones) => comisiones.map((comision) => ({ comision }));

test('calcularTotalPago usa la suma del detalle y acepta total coincidente', () => {
  assert.equal(calcularTotalPago(detalles(30, 15), { montoTotal: 45 }), 45);
});

test('calcularTotalPago rechaza total distinto al detalle', () => {
  assert.throws(
    () => calcularTotalPago(detalles(30, 15), { montoTotal: 40 }),
    /no coincide con la suma de comisiones/
  );
});

test('calcularTotalPago sin montoTotal devuelve la suma', () => {
  assert.equal(calcularTotalPago(detalles(33.33, 11.67)), 45);
});

test('calcularTotalPago valida VES contra tasa', () => {
  assert.equal(calcularTotalPago(detalles(30, 15), { montoTotalVES: 45000, tasaAplicada: 1000 }), 45);
  assert.throws(
    () => calcularTotalPago(detalles(30, 15), { montoTotalVES: 40000, tasaAplicada: 1000 }),
    /no coincide con el total por la tasa/
  );
});

test('calcularTotalPago tolera redondeo de centavos', () => {
  assert.equal(calcularTotalPago(detalles(44.995), { montoTotal: 45 }), 45);
});

test('comisionProveedorReserva usa congelada y cae a config solo si falta', () => {
  assert.equal(comisionProveedorReserva({ comisionProveedor: 7 }, { pagoProveedor: 10 }), 7);
  assert.equal(comisionProveedorReserva({ comisionProveedor: 0 }, { pagoProveedor: 10 }), 0);
  assert.equal(comisionProveedorReserva({}, { pagoProveedor: 10 }), 10);
});

test('comisionInstructorReserva respeta colaboración y porcentaje compartido', () => {
  assert.equal(comisionInstructorReserva({ instructorId: 'i1', comisionInstructor: 15 }, 'i1'), 15);
  assert.equal(comisionInstructorReserva({ instructorId: 'i2', comisionInstructor: 15 }, 'i1'), 0);
  assert.equal(comisionInstructorReserva({
    esReservaCompartida: true,
    comisionInstructor: 20,
    instructoresInvolucrados: [{ id: 'i1', porcentaje: 50 }],
  }, 'i1'), 10);
});
