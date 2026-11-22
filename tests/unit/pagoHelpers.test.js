import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCorreccionPago } from '../../src/modules/inscripcion/utils/pagoHelpers.js';

test('permite corregir rechazada con menos de 3 intentos', () => {
  assert.equal(validarCorreccionPago({ estadoPago: 'Rechazado', intentosCorreccion: 0 }), null);
  assert.equal(validarCorreccionPago({ estadoPago: 'Rechazado', intentosCorreccion: 2 }), null);
});

test('bloquea al llegar a 3 intentos', () => {
  assert.equal(validarCorreccionPago({ estadoPago: 'Rechazado', intentosCorreccion: 3 }), 'attempts-exhausted');
  assert.equal(validarCorreccionPago({ estadoPago: 'Rechazado', intentosCorreccion: 4 }), 'attempts-exhausted');
});

test('solo permite estado Rechazado', () => {
  assert.equal(validarCorreccionPago({ estadoPago: 'Pendiente' }), 'invalid-state');
  assert.equal(validarCorreccionPago({ estadoPago: 'Aprobado' }), 'invalid-state');
  assert.equal(validarCorreccionPago({ estadoPago: 'Cancelado' }), 'invalid-state');
});

test('reserva inexistente', () => {
  assert.equal(validarCorreccionPago(null), 'not-found');
});
