#!/usr/bin/env node
// Sincroniza los UIDs que reciben notificaciones por rol.
// DEV por defecto; PROD solo con `--prod` y `NOTIFICACIONES_PROD_OK=true`.
// No imprime correos, nombres ni teléfonos: solo conteos.
//
// Uso: node scripts/sincronizar-roles-notificaciones.mjs [--prod]
import fs from 'node:fs';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { resolverServiceAccount } from './lib/notificaciones-dispatch-config.mjs';

const APP_ID = 'motoescuela-pro-v1';
const RUTA = `artifacts/${APP_ID}/public/data`;
const { sa } = resolverServiceAccount({
  prod: process.argv.includes('--prod'),
  env: process.env,
  existeArchivo: (nombre) => fs.existsSync(path.resolve(nombre)),
  leerArchivo: (nombre) => fs.readFileSync(path.resolve(nombre), 'utf8'),
});
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();
const auth = getAuth();

async function listarTodos() {
  const usuarios = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    usuarios.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return usuarios;
}

const usuarios = await listarTodos();
const admins = usuarios.filter((u) => u.customClaims?.admin === true && !u.disabled).map((u) => u.uid);
const instructores = [];
const proveedores = [];
const movilidad = [];

for (const u of usuarios) {
  if (u.disabled) continue;
  const [inst, prov, mov] = await Promise.all([
    db.doc(`${RUTA}/instructores/${u.uid}`).get(),
    db.doc(`${RUTA}/proveedores/${u.uid}`).get(),
    db.doc(`${RUTA}/prestadoresMovilidad/${u.uid}`).get(),
  ]);
  if (inst.exists) instructores.push(u.uid);
  if (prov.exists) proveedores.push(u.uid);
  if (mov.exists) movilidad.push(u.uid);
}

const ahora = FieldValue.serverTimestamp();
const roles = [
  ['admin', admins],
  ['instructor', instructores],
  ['proveedor', proveedores],
  ['movilidad', movilidad],
];
for (const [rol, uids] of roles) {
  await db.doc(`${RUTA}/notificacionesRoles/${rol}`).set({
    rol,
    uids: [...new Set(uids)].sort(),
    actualizadoEn: ahora,
  }, { merge: true });
}
console.log(`[roles-notif] admin=${admins.length} instructor=${instructores.length} proveedor=${proveedores.length} movilidad=${movilidad.length} proyecto=${sa.project_id}`);
