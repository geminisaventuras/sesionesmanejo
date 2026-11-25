#!/usr/bin/env node
// Verificación de reglas de notificaciones contra Firestore DEV real.
// Usa un custom token de un admin y la API REST; no necesita emulador ni JDK.
//
// Uso: node --env-file=.env scripts/verificar-reglas-notificaciones.mjs
import fs from 'node:fs';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROYECTO = 'motoescuela-dev';
const APP_ID = 'motoescuela-pro-v1';
const BASE = `artifacts/${APP_ID}/public/data`;
const RAIZ_REST = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`;
const sa = JSON.parse(fs.readFileSync(path.resolve('sa-dev.json'), 'utf8'));
if (sa.project_id !== PROYECTO) throw new Error('Solo DEV');
const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env'), 'utf8').split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);
const apiKey = env.VITE_FIREBASE_API_KEY;
if (!apiKey) throw new Error('Falta VITE_FIREBASE_API_KEY en .env');

initializeApp({ credential: cert(sa), projectId: PROYECTO });
const adminDb = getFirestore();
const adminAuth = getAuth();
const listaUsuarios = await adminAuth.listUsers(1000);
const adminUid = listaUsuarios.users.find((u) => u.customClaims?.admin === true && !u.disabled)?.uid;
if (!adminUid) throw new Error('No hay un admin con custom claim en DEV');

const ok = [];
const fail = [];
const check = (nombre, condicion, detalle = '') => {
  (condicion ? ok : fail).push(`${condicion ? 'PASS' : 'FAIL'} ${nombre}${detalle ? ` (${detalle})` : ''}`);
};

const docUrl = (ruta) => `${RAIZ_REST}/${ruta.split('/').map(encodeURIComponent).join('/')}`;
const postUrl = (coleccion, id) => `${docUrl(coleccion)}?documentId=${encodeURIComponent(id)}`;

function camposNotificacion(uid, extra = {}) {
  return {
    fields: {
      destinoUid: { stringValue: uid },
      rolDestino: { stringValue: 'admin' },
      tipo: { stringValue: 'sistema_prueba' },
      titulo: { stringValue: 'Prueba' },
      cuerpo: { stringValue: 'Prueba' },
      leida: { booleanValue: false },
      ...extra,
    },
  };
}

function camposSuscripcion(uid, id) {
  return {
    fields: {
      id: { stringValue: id },
      uid: { stringValue: uid },
      endpoint: { stringValue: `https://example.invalid/push/${id}-suficientemente-largo` },
      keys: { mapValue: { fields: { p256dh: { stringValue: 'x'.repeat(40) }, auth: { stringValue: 'y'.repeat(16) } } } },
      activo: { booleanValue: true },
    },
  };
}

function camposPreferencias() {
  return {
    fields: {
      push: { booleanValue: true },
      sonido: { booleanValue: true },
      vibracion: { booleanValue: true },
      categorias: {
        mapValue: {
          fields: {
            reservas: { booleanValue: true }, pagos: { booleanValue: true }, aula: { booleanValue: true },
            finanzas: { booleanValue: true }, movilidad: { booleanValue: true }, sistema: { booleanValue: true },
          },
        },
      },
      silencio: { mapValue: { fields: { activo: { booleanValue: true }, inicio: { stringValue: '22:00' }, fin: { stringValue: '07:00' } } } },
      zonaHoraria: { stringValue: 'America/Caracas' },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };
}

function camposEvento(actorUid, id) {
  return {
    fields: {
      clave: { stringValue: id },
      tipo: { stringValue: 'sistema_prueba' },
      entidadTipo: { stringValue: 'usuario' },
      entidadId: { stringValue: adminUid },
      actorUid: { stringValue: actorUid },
      token: { stringValue: 'reglas' },
      datos: { mapValue: { fields: {} } },
      estado: { stringValue: 'pendiente' },
      intentos: { integerValue: '0' },
      ocurridoEn: { timestampValue: new Date().toISOString() },
    },
  };
}

async function pedir(method, url, token, body, extraHeaders = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, ok: res.ok, texto: await res.text() };
}

const sufijo = Date.now().toString(36);
const otrosUid = `otro_${sufijo}`;
const notifPropia = `regla_${sufijo}_propia`;
const notifAjena = `regla_${sufijo}_ajena`;
const notifCrear = `regla_${sufijo}_crear`;
const eventoPropio = `sistema_prueba__regla_${sufijo}__propio`;
const eventoAjeno = `sistema_prueba__regla_${sufijo}__ajeno`;
const suscripcionPropia = `regla_${sufijo}_propia`;
const suscripcionAjena = `regla_${sufijo}_ajena`;
const prefPropia = adminUid;
const prefAjena = otrosUid;

try {
  const customToken = await adminAuth.createCustomToken(adminUid);
  const login = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!login.ok) throw new Error(`No se pudo autenticar: ${login.status}`);
  const { idToken } = await login.json();

  await adminDb.doc(`${BASE}/notificaciones/${notifPropia}`).set({ destinoUid: adminUid, tipo: 'sistema_prueba', titulo: 'Propia', cuerpo: 'Propia', leida: false });
  await adminDb.doc(`${BASE}/notificaciones/${notifAjena}`).set({ destinoUid: otrosUid, tipo: 'sistema_prueba', titulo: 'Ajena', cuerpo: 'Ajena', leida: false });

  const leerPropia = await pedir('GET', docUrl(`${BASE}/notificaciones/${notifPropia}`), idToken);
  check('lee su propia notificación', leerPropia.status === 200, `status=${leerPropia.status}`);

  const leerAjena = await pedir('GET', docUrl(`${BASE}/notificaciones/${notifAjena}`), idToken);
  check('no lee notificación ajena', leerAjena.status === 403, `status=${leerAjena.status}`);

  const crearNotif = await pedir('POST', postUrl(`${BASE}/notificaciones`, notifCrear), idToken, camposNotificacion(adminUid));
  check('cliente no puede crear notificación', crearNotif.status === 403, `status=${crearNotif.status}`);

  const marcarPropia = await pedir('PATCH', `${docUrl(`${BASE}/notificaciones/${notifPropia}`)}?updateMask.fieldPaths=leida`, idToken, { fields: { leida: { booleanValue: true } } });
  check('marca leída su notificación', marcarPropia.status === 200, `status=${marcarPropia.status}`);

  const marcarAjena = await pedir('PATCH', `${docUrl(`${BASE}/notificaciones/${notifAjena}`)}?updateMask.fieldPaths=leida`, idToken, { fields: { leida: { booleanValue: true } } });
  check('no modifica notificación ajena', marcarAjena.status === 403, `status=${marcarAjena.status}`);

  const evPropio = await pedir('POST', postUrl(`${BASE}/eventosNotificacion`, eventoPropio), idToken, camposEvento(adminUid, eventoPropio));
  check('crea evento propio en outbox', evPropio.status === 200, `status=${evPropio.status}`);

  const evAjeno = await pedir('POST', postUrl(`${BASE}/eventosNotificacion`, eventoAjeno), idToken, camposEvento(otrosUid, eventoAjeno));
  check('no crea evento suplantando a otro', evAjeno.status === 403, `status=${evAjeno.status}`);

  const leerEvento = await pedir('GET', docUrl(`${BASE}/eventosNotificacion/${eventoPropio}`), idToken);
  check('no lee el outbox', leerEvento.status === 403, `status=${leerEvento.status}`);

  const subPropia = await pedir('POST', postUrl(`${BASE}/pushSuscripciones`, suscripcionPropia), idToken, camposSuscripcion(adminUid, suscripcionPropia));
  check('registra su dispositivo', subPropia.status === 200, `status=${subPropia.status}`);

  const subAjena = await pedir('POST', postUrl(`${BASE}/pushSuscripciones`, suscripcionAjena), idToken, camposSuscripcion(otrosUid, suscripcionAjena));
  check('no registra dispositivo de otro uid', subAjena.status === 403, `status=${subAjena.status}`);

  const pref = await pedir('PATCH', `${docUrl(`${BASE}/preferenciasNotificacion/${prefPropia}`)}?updateMask.fieldPaths=push&updateMask.fieldPaths=sonido&updateMask.fieldPaths=vibracion&updateMask.fieldPaths=categorias&updateMask.fieldPaths=silencio&updateMask.fieldPaths=zonaHoraria&updateMask.fieldPaths=updatedAt`, idToken, camposPreferencias());
  check('guarda sus preferencias', pref.status === 200, `status=${pref.status}`);

  const prefOtra = await pedir('PATCH', `${docUrl(`${BASE}/preferenciasNotificacion/${prefAjena}`)}?updateMask.fieldPaths=push&updateMask.fieldPaths=sonido&updateMask.fieldPaths=vibracion&updateMask.fieldPaths=categorias&updateMask.fieldPaths=silencio&updateMask.fieldPaths=zonaHoraria&updateMask.fieldPaths=updatedAt`, idToken, camposPreferencias());
  check('no escribe preferencias de otro uid', prefOtra.status === 403, `status=${prefOtra.status}`);
} catch (error) {
  fail.push(`FAIL verificacion (${error?.message || error})`);
} finally {
  const limpiar = [
    `${BASE}/notificaciones/${notifPropia}`,
    `${BASE}/notificaciones/${notifAjena}`,
    `${BASE}/notificaciones/${notifCrear}`,
    `${BASE}/eventosNotificacion/${eventoPropio}`,
    `${BASE}/eventosNotificacion/${eventoAjeno}`,
    `${BASE}/pushSuscripciones/${suscripcionPropia}`,
    `${BASE}/pushSuscripciones/${suscripcionAjena}`,
    `${BASE}/preferenciasNotificacion/${prefPropia}`,
    `${BASE}/preferenciasNotificacion/${prefAjena}`,
  ];
  for (const ruta of limpiar) await adminDb.doc(ruta).delete().catch(() => {});
}

for (const linea of [...ok, ...fail]) console.log(linea);
console.log(`\nRESUMEN: ${ok.length} pass, ${fail.length} fail`);
process.exit(fail.length ? 1 : 0);
