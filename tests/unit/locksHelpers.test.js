import test from 'node:test';
import assert from 'node:assert/strict';
import { clasificarConflictoLock } from '../../src/modules/inscripcion/utils/locksHelpers.js';

const now = 100_000;
const activo = (userId, expiresMs = 200_000) => ({ userId, expiresAt: expiresMs });

test('lock propio vigente se clasifica como lock-own-active', () => {
  assert.equal(clasificarConflictoLock(activo('u1'), 'u1', now), 'lock-own-active');
});

test('lock ajeno vigente se clasifica como lock-owner-mismatch', () => {
  assert.equal(clasificarConflictoLock(activo('u2'), 'u1', now), 'lock-owner-mismatch');
});

test('lock vencido no es conflicto (permite toma)', () => {
  assert.equal(clasificarConflictoLock(activo('u2', 50_000), 'u1', now), null);
  assert.equal(clasificarConflictoLock(activo('u1', 50_000), 'u1', now), null);
});

test('soporta Timestamp de Firestore y seconds', () => {
  assert.equal(clasificarConflictoLock({ userId: 'u1', expiresAt: { toMillis: () => 200_000 } }, 'u1', now), 'lock-own-active');
  assert.equal(clasificarConflictoLock({ userId: 'u2', expiresAt: { seconds: 200 } }, 'u1', now), 'lock-owner-mismatch');
});

test('sin lock no hay conflicto', () => {
  assert.equal(clasificarConflictoLock(null, 'u1', now), null);
});
