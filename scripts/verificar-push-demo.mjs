#!/usr/bin/env node
// Demo de registro Web Push en la PWA construida (vite preview en 5173).
// Usa el perfil admin guardado. No imprime endpoints ni PII.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ORIGEN = 'http://127.0.0.1:5173';
const perfil = path.resolve('tests/.auth/admin-profile');
if (!fs.existsSync(perfil)) throw new Error('Falta el perfil admin guardado');
const sa = JSON.parse(fs.readFileSync('sa-dev.json', 'utf8'));
if (sa.project_id !== 'motoescuela-dev') throw new Error('Solo DEV');
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

const uids = await (async () => {
  const { getAuth } = await import('firebase-admin/auth');
  const lista = await getAuth().listUsers(1000);
  return lista.users.filter((u) => u.customClaims?.admin === true && !u.disabled).map((u) => u.uid);
})();
const adminUid = uids[0];
if (!adminUid) throw new Error('Sin admin');

const context = await chromium.launchPersistentContext(perfil, {
  headless: false,
  viewport: { width: 412, height: 915 },
  permissions: ['notifications'],
});
await context.clearPermissions();
await context.grantPermissions(['notifications'], { origin: ORIGEN });
const page = await context.newPage();
const errores = [];
page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) errores.push(`${msg.type()}: ${msg.text().slice(0, 220)}`);
});
page.on('pageerror', (err) => errores.push(`pageerror: ${String(err?.message || err).slice(0, 220)}`));
await page.goto(`${ORIGEN}/notificaciones/ajustes`, { waitUntil: 'domcontentloaded' });
await page.getByText('Ajustes de alertas').waitFor({ timeout: 20000 });

const permiso = await page.evaluate(() => (typeof Notification !== 'undefined' ? Notification.permission : 'sin-api'));
const boton = page.getByRole('button', { name: /Activar notificaciones|Reintentar/ });
if (await boton.count()) {
  await boton.first().click();
}
await page.waitForTimeout(15000);
const texto = await page.locator('body').innerText();
const activo = /Activas en este dispositivo/i.test(texto);
const registros = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  return regs.map((r) => ({ scope: r.scope, active: Boolean(r.active), waiting: Boolean(r.waiting), installing: Boolean(r.installing) }));
});
const swListo = await page.evaluate(async () => {
  try {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
    ]);
    return { ok: true, scope: reg.scope, pushManager: Boolean(reg.pushManager) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
const sub = await db.collection(`artifacts/motoescuela-pro-v1/public/data/pushSuscripciones`)
  .where('uid', '==', adminUid)
  .where('activo', '==', true)
  .get();
console.log(JSON.stringify({
  permiso,
  activoEnUI: activo,
  registros,
  swListo,
  suscripciones: sub.size,
  plataformas: sub.docs.map((d) => d.data()?.plataforma),
  errores: errores.slice(0, 6),
  texto: texto.slice(-700),
}, null, 2));
await context.close();
process.exit(activo && sub.size > 0 ? 0 : 1);
