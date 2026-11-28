#!/usr/bin/env node
// Dispatcher de notificaciones de Motoapp.
//
// Flujo:
//   1. Reclama eventos pendientes del outbox (eventosNotificacion).
//   2. Valida el estado actual en Firestore y resuelve destinatarios.
//   3. Crea notificaciones con id determinista (idempotente, sin PII).
//   4. Envía Web Push (VAPID) a los dispositivos activos.
//
// Seguridad: DEV por defecto (sa-dev.json + .env.push). PROD solo con `--prod`
// y `NOTIFICACIONES_PROD_OK=true`; el service account puede venir del secreto
// `NOTIFICACIONES_SA_JSON` (GitHub Actions) o de sa-prod.json en local.
//
// Uso:
//   node --env-file=.env.push scripts/notificaciones-dispatcher.mjs --once
//   node --env-file=.env.push scripts/notificaciones-dispatcher.mjs --watch
//   node --env-file=.env.push scripts/notificaciones-dispatcher.mjs --dry-run
//   node --env-file=.env.push scripts/notificaciones-dispatcher.mjs --test --uid <uid>
//   NOTIFICACIONES_PROD_OK=true node scripts/notificaciones-dispatcher.mjs --once --prod
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const webpush = require('web-push');
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import {
  TIPOS_EVENTO,
  construirClaveNotificacion,
  debeEnviarPush,
  msDeFecha,
  normalizarPreferencias,
  plantillaNotificacion,
} from '../src/modules/shared/utils/notificacionesHelpers.js';
import { resolverServiceAccount } from './lib/notificaciones-dispatch-config.mjs';
import { validarActorEvento } from './lib/notificaciones-actor.mjs';

const APP_ID = 'motoescuela-pro-v1';
const RUTA_DATOS = `artifacts/${APP_ID}/public/data`;
const LIMITE_EVENTOS = 20;
const LIMITE_NOTIFICACIONES = 50;
const MAX_INTENTOS = 5;

const args = new Set(process.argv.slice(2));
const valorArg = (nombre) => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : null;
};
const MODO = {
  once: args.has('--once'),
  watch: args.has('--watch'),
  dryRun: args.has('--dry-run'),
  test: args.has('--test'),
  prod: args.has('--prod'),
  uid: valorArg('--uid'),
  limite: Number(valorArg('--limit') || LIMITE_EVENTOS),
};

if (args.has('--help') || args.has('-h')) {
  console.log('Uso: node --env-file=.env.push scripts/notificaciones-dispatcher.mjs [--once|--watch] [--dry-run] [--test --uid UID] [--prod]');
  process.exit(0);
}

function cargarServiceAccount() {
  const { sa, proyecto, origen } = resolverServiceAccount({
    prod: MODO.prod,
    env: process.env,
    existeArchivo: (nombre) => fs.existsSync(path.resolve(nombre)),
    leerArchivo: (nombre) => fs.readFileSync(path.resolve(nombre), 'utf8'),
  });
  console.log(`[notif] service account ${origen} proyecto=${proyecto}`);
  return sa;
}

const sa = cargarServiceAccount();
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();
const datos = (coleccion) => db.collection(`${RUTA_DATOS}/${coleccion}`);

const VAPID_PUBLIC_KEY = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = String(process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = String(process.env.VAPID_SUBJECT || 'mailto:soporte@motoapp.website').trim();
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error('Faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY. Usa node --env-file=.env.push.');
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const cacheRoles = new Map();
let rolesPorUid = null;

async function cargarRolesPorUid() {
  if (rolesPorUid) return rolesPorUid;
  rolesPorUid = new Map();
  try {
    const [admin, instructor, proveedor, movilidad] = await Promise.all([
      datos('notificacionesRoles').doc('admin').get(),
      datos('notificacionesRoles').doc('instructor').get(),
      datos('notificacionesRoles').doc('proveedor').get(),
      datos('notificacionesRoles').doc('movilidad').get(),
    ]);
    for (const [rol, snap] of [['admin', admin], ['instructor', instructor], ['proveedor', proveedor], ['movilidad', movilidad]]) {
      if (!snap.exists) continue;
      for (const uid of snap.data()?.uids || []) rolesPorUid.set(String(uid), rol);
    }
  } catch {
    // La colección de roles es opcional; se cae al directorio legacy.
  }
  return rolesPorUid;
}

async function rolDe(uid, pista = null) {
  if (!uid) return null;
  if (pista) return pista;
  if (cacheRoles.has(uid)) return cacheRoles.get(uid);
  const mapa = await cargarRolesPorUid();
  let rol = mapa.get(String(uid)) || 'estudiante';
  if (!mapa.has(String(uid))) {
    try {
      const [admin, instructor, proveedor, movilidad] = await Promise.all([
        datos('admins').doc(uid).get(),
        datos('instructores').doc(uid).get(),
        datos('proveedores').doc(uid).get(),
        datos('prestadoresMovilidad').doc(uid).get(),
      ]);
      if (admin.exists) rol = 'admin';
      else if (instructor.exists) rol = 'instructor';
      else if (proveedor.exists) rol = 'proveedor';
      else if (movilidad.exists) rol = 'movilidad';
    } catch {
      rol = 'estudiante';
    }
  }
  cacheRoles.set(uid, rol);
  return rol;
}

async function admins() {
  // Fuente principal: UIDs sincronizados desde Auth por el script de roles.
  try {
    const rolesSnap = await datos('notificacionesRoles').doc('admin').get();
    const uids = rolesSnap.exists ? rolesSnap.data()?.uids : null;
    if (Array.isArray(uids) && uids.length > 0) return uids.filter(Boolean);
  } catch {
    // Sin colección de roles: se intenta el directorio legacy.
  }
  const snap = await datos('admins').get();
  return snap.docs
    .map((d) => d.data()?.uid || (String(d.id).length > 20 ? d.id : null))
    .filter(Boolean);
}

function agregar(destinatarios, uid, rol, ctx = {}) {
  if (!uid) return;
  const clave = String(uid);
  if (destinatarios.has(clave)) return;
  destinatarios.set(clave, { uid: clave, rol, ctx });
}

// ERR-095: un actor autenticado no puede forjar eventos sensibles de otra
// entidad. El evento se rechaza sin notificar y sin reintentos.
function actorNoAutorizado(tipo, motivo) {
  const error = new Error(`Actor no autorizado para ${tipo} (${motivo})`);
  error.code = 'ACTOR_NO_AUTORIZADO';
  return error;
}

function exigirActor(validacion, tipo) {
  if (!validacion?.ok) throw actorNoAutorizado(tipo, validacion?.motivo || 'denegado');
}

async function destinatariosDe(evento) {
  const destinatarios = new Map();
  const incluirActor = new Set(['reserva_creada', 'sistema_prueba']);

  if (evento.tipo === 'sistema_prueba') {
    exigirActor(validarActorEvento({ tipo: evento.tipo, actorUid: evento.actorUid, actorRol: null, entidad: null }), evento.tipo);
    agregar(destinatarios, evento.actorUid, await rolDe(evento.actorUid), { entidadId: evento.entidadId });
    return [...destinatarios.values()];
  }

  if (evento.entidadTipo === 'reserva') {
    const snap = await datos('reservas').doc(String(evento.entidadId)).get();
    if (!snap.exists) throw new Error(`Reserva ${evento.entidadId} no existe`);
    const reserva = { id: snap.id, ...snap.data() };
    exigirActor(
      validarActorEvento({
        tipo: evento.tipo,
        actorUid: evento.actorUid,
        actorRol: evento.actorUid ? await rolDe(evento.actorUid) : null,
        entidad: reserva,
      }),
      evento.tipo
    );
    const ctx = {
      entidadId: reserva.id,
      reservaId: reserva.id,
      packReservaId: reserva.packReservaId || null,
    };
    const esAula = ['sesion_iniciada', 'sesion_pausada', 'sesion_finalizada', 'emergencia_aula'].includes(evento.tipo);
    if (evento.tipo === 'reserva_creada' || evento.tipo === 'pago_aprobado' || evento.tipo === 'pago_rechazado') {
      agregar(destinatarios, reserva.userId, 'estudiante', ctx);
    }
    if (!esAula && evento.tipo !== 'pago_aprobado' && evento.tipo !== 'pago_rechazado') {
      // reprogramación/cancelación/asignación: también al instructor y proveedor
      if (reserva.instructorId) agregar(destinatarios, reserva.instructorId, 'instructor', ctx);
      if (reserva.proveedorId) agregar(destinatarios, reserva.proveedorId, 'proveedor', ctx);
      if (reserva.proveedorReposicionId) agregar(destinatarios, reserva.proveedorReposicionId, 'proveedor', ctx);
    }
    if (['sesion_iniciada', 'sesion_pausada', 'sesion_finalizada', 'emergencia_aula', 'reserva_creada', 'pago_aprobado', 'pago_rechazado'].includes(evento.tipo)) {
      if (reserva.instructorId && esAula) agregar(destinatarios, reserva.instructorId, 'instructor', ctx);
    }
    for (const uid of await admins()) agregar(destinatarios, uid, 'admin', ctx);
    if (evento.actorUid) {
      const actorRol = destinatarios.get(String(evento.actorUid))?.rol;
      // El admin que crea una reserva no necesita su propia alarma; el
      // estudiante sí recibe la confirmación (sin sonido).
      const actorEsAdminEnReserva = evento.tipo === 'reserva_creada' && actorRol === 'admin';
      if (!incluirActor.has(evento.tipo) || actorEsAdminEnReserva) {
        destinatarios.delete(String(evento.actorUid));
      }
    }
    return [...destinatarios.values()];
  }

  if (evento.entidadTipo === 'pagoStaff') {
    const snap = await datos('pagosStaff').doc(String(evento.entidadId)).get();
    if (!snap.exists) throw new Error(`Pago ${evento.entidadId} no existe`);
    const pago = snap.data();
    exigirActor(
      validarActorEvento({
        tipo: evento.tipo,
        actorUid: evento.actorUid,
        actorRol: evento.actorUid ? await rolDe(evento.actorUid) : null,
        entidad: pago,
      }),
      evento.tipo
    );
    const uid = pago.staffId || pago.userId || pago.beneficiarioId || pago.instructorId || pago.proveedorId;
    const rol = await rolDe(uid);
    agregar(destinatarios, uid, rol === 'admin' ? 'instructor' : rol, { entidadId: evento.entidadId });
    for (const admin of await admins()) agregar(destinatarios, admin, 'admin', { entidadId: evento.entidadId });
    if (evento.actorUid) destinatarios.delete(String(evento.actorUid));
    return [...destinatarios.values()];
  }

  if (evento.entidadTipo === 'deudaProveedor') {
    const snap = await datos('deudasProveedor').doc(String(evento.entidadId)).get();
    if (!snap.exists) throw new Error(`Deuda ${evento.entidadId} no existe`);
    const deuda = snap.data();
    exigirActor(
      validarActorEvento({
        tipo: evento.tipo,
        actorUid: evento.actorUid,
        actorRol: evento.actorUid ? await rolDe(evento.actorUid) : null,
        entidad: deuda,
      }),
      evento.tipo
    );
    const uid = deuda.proveedorId || deuda.proveedorUid || deuda.userId;
    agregar(destinatarios, uid, 'proveedor', { entidadId: evento.entidadId });
    for (const admin of await admins()) agregar(destinatarios, admin, 'admin', { entidadId: evento.entidadId });
    if (evento.actorUid) destinatarios.delete(String(evento.actorUid));
    return [...destinatarios.values()];
  }

  if (evento.entidadTipo === 'movilidad') {
    const snap = await datos('solicitudesMovilidad').doc(String(evento.entidadId)).get();
    if (!snap.exists) throw new Error(`Solicitud ${evento.entidadId} no existe`);
    const solicitud = snap.data();
    exigirActor(
      validarActorEvento({
        tipo: evento.tipo,
        actorUid: evento.actorUid,
        actorRol: evento.actorUid ? await rolDe(evento.actorUid) : null,
        entidad: solicitud,
      }),
      evento.tipo
    );
    const ctx = { entidadId: evento.entidadId, movilidadId: evento.entidadId };
    if (solicitud.userId) agregar(destinatarios, solicitud.userId, 'estudiante', ctx);
    if (solicitud.prestadorId) agregar(destinatarios, solicitud.prestadorId, 'movilidad', ctx);
    for (const admin of await admins()) agregar(destinatarios, admin, 'admin', ctx);
    if (!incluirActor.has(evento.tipo) && evento.actorUid) destinatarios.delete(String(evento.actorUid));
    return [...destinatarios.values()];
  }

  throw new Error(`Entidad no soportada: ${evento.entidadTipo}`);
}

async function preferenciasDe(uid) {
  try {
    const snap = await datos('preferenciasNotificacion').doc(String(uid)).get();
    return normalizarPreferencias(snap.exists() ? snap.data() : {});
  } catch {
    return normalizarPreferencias();
  }
}

async function suscripcionesDe(uid) {
  const snap = await datos('pushSuscripciones')
    .where('uid', '==', String(uid))
    .where('activo', '==', true)
    .get();
  return snap.docs;
}

function payloadPush(notificacion) {
  return JSON.stringify({
    titulo: notificacion.titulo,
    cuerpo: notificacion.cuerpo,
    categoria: notificacion.categoria,
    prioridad: notificacion.prioridad,
    ruta: notificacion.ruta,
    tag: notificacion.claveDedupe,
    vibrar: notificacion.prioridad === 'alta' || notificacion.prioridad === 'critica',
    sonido: notificacion.sonido !== false,
  });
}

async function enviarPush(notificacion, ref) {
  const subs = await suscripcionesDe(notificacion.destinoUid);
  if (subs.length === 0) {
    if (!MODO.dryRun) {
      await ref.update({ pushEnviado: true, pushMotivo: 'sin-dispositivos', pushUltimoIntentoEn: FieldValue.serverTimestamp() });
    }
    return 0;
  }
  let enviados = 0;
  let ultimoError = null;
  for (const sub of subs) {
    const data = sub.data();
    if (!data.endpoint || !data.keys?.p256dh || !data.keys?.auth) continue;
    if (MODO.dryRun) {
      enviados += 1;
      continue;
    }
    try {
      await webpush.sendNotification(
        { endpoint: data.endpoint, keys: { p256dh: data.keys.p256dh, auth: data.keys.auth } },
        payloadPush(notificacion),
        {
          TTL: 3600,
          urgency: notificacion.prioridad === 'critica' ? 'high' : 'normal',
        }
      );
      enviados += 1;
      await sub.ref.update({ lastSeenAt: FieldValue.serverTimestamp(), ultimoEnvioOk: FieldValue.serverTimestamp() }).catch(() => {});
    } catch (error) {
      ultimoError = `${error?.statusCode || ''} ${error?.body || error?.message || 'error'}`.trim();
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await sub.ref.update({ activo: false, desactivadoEn: FieldValue.serverTimestamp(), motivoBaja: 'push-404-410' }).catch(() => {});
      }
    }
  }
  if (!MODO.dryRun) {
    await ref.update({
      pushEnviado: enviados > 0,
      pushIntentos: FieldValue.increment(1),
      pushUltimoIntentoEn: FieldValue.serverTimestamp(),
      ...(enviados > 0 ? { pushEnviadoEn: FieldValue.serverTimestamp() } : {}),
      ...(ultimoError && enviados === 0 ? { pushError: ultimoError.slice(0, 300) } : {}),
    });
  }
  return enviados;
}

async function crearNotificacion(evento, destinatario) {
  const plantilla = plantillaNotificacion(evento.tipo, destinatario.rol, destinatario.ctx);
  if (!plantilla) return null;
  const clave = construirClaveNotificacion(evento.clave, destinatario.uid);
  const ref = datos('notificaciones').doc(clave);
  const existente = await ref.get();
  if (existente.exists) return { existente: true, ref };

  const prefs = await preferenciasDe(destinatario.uid);
  const pushPendiente = debeEnviarPush(prefs, plantilla.categoria, plantilla.prioridad);
  const data = {
    destinoUid: String(destinatario.uid),
    rolDestino: destinatario.rol,
    tipo: evento.tipo,
    categoria: plantilla.categoria,
    prioridad: plantilla.prioridad,
    titulo: plantilla.titulo,
    cuerpo: plantilla.cuerpo,
    ruta: plantilla.ruta,
    entidadTipo: evento.entidadTipo,
    entidadId: String(evento.entidadId),
    claveEvento: evento.clave,
    claveDedupe: clave,
    sonido: plantilla.sonido !== false,
    actorUid: evento.actorUid || null,
    leida: false,
    estado: 'nueva',
    createdAt: FieldValue.serverTimestamp(),
    pushEnviado: !pushPendiente,
    pushPendiente,
    pushIntentos: 0,
    ...(pushPendiente ? {} : { pushMotivo: 'preferencias' }),
    origen: 'dispatcher',
  };
  if (!MODO.dryRun) await ref.set(data);
  return { ref, data, pushPendiente };
}

async function procesarEvento(doc) {
  const ref = datos('eventosNotificacion').doc(doc.id);
  let evento = doc.data();
  if (!TIPOS_EVENTO.includes(evento.tipo)) throw new Error(`Tipo inválido ${evento.tipo}`);

  if (!MODO.dryRun) {
    const reclamado = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      const actual = snap.data();
      if (actual.estado !== 'pendiente') return null;
      tx.update(ref, { estado: 'procesando', tomadoEn: FieldValue.serverTimestamp() });
      return { ...actual, id: snap.id };
    });
    if (!reclamado) return { omitido: true };
    evento = reclamado;
  }

  const destinatarios = await destinatariosDe(evento);
  let creadas = 0;
  let push = 0;
  for (const destinatario of destinatarios) {
    const notif = await crearNotificacion(evento, destinatario);
    if (!notif || notif.existente) continue;
    creadas += 1;
    if (notif.pushPendiente) {
      push += await enviarPush({ ...notif.data, id: notif.ref.id }, notif.ref);
    }
  }

  if (!MODO.dryRun) {
    await ref.update({
      estado: 'procesado',
      procesadoEn: FieldValue.serverTimestamp(),
      notificacionesCreadas: FieldValue.increment(creadas),
      pushEnviados: FieldValue.increment(push),
      intentos: FieldValue.increment(1),
    });
  }
  return { creadas, push, destinatarios: destinatarios.length };
}

async function recuperarAtascados() {
  const snap = await datos('eventosNotificacion')
    .where('estado', '==', 'procesando')
    .limit(20)
    .get();
  const corte = Date.now() - 5 * 60 * 1000;
  for (const doc of snap.docs) {
    const tomado = msDeFecha(doc.data().tomadoEn);
    if (tomado > 0 && tomado < corte) {
      if (!MODO.dryRun) {
        await doc.ref.update({
          estado: 'pendiente',
          error: 'recuperado de procesando atascado',
          ultimoIntentoEn: FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
      console.warn(`[notif] evento atascado recuperado: ${doc.id}`);
    }
  }
}

async function procesarPendientes() {
  const snap = await datos('eventosNotificacion')
    .where('estado', '==', 'pendiente')
    .limit(Math.max(1, Math.min(MODO.limite, 50)))
    .get();
  const docs = [...snap.docs].sort((a, b) => msDeFecha(a.data().ocurridoEn) - msDeFecha(b.data().ocurridoEn));
  let total = 0;
  for (const doc of docs) {
    try {
      const res = await procesarEvento(doc);
      if (res && !res.omitido) {
        total += 1;
        console.log(`[notif] ${doc.data().tipo} ${doc.id}: ${res.creadas} inbox, ${res.push} push, ${res.destinatarios} destinatarios`);
      }
    } catch (error) {
      if (error?.code === 'ACTOR_NO_AUTORIZADO') {
        // Rechazo definitivo: no se notifica ni se reintenta como transitorio.
        console.warn(`[notif] rechazado ${doc.id} ${doc.data().tipo}: actor-no-autorizado`);
        if (!MODO.dryRun) {
          await datos('eventosNotificacion').doc(doc.id).update({
            estado: 'fallido',
            error: 'actor-no-autorizado',
            ultimoIntentoEn: FieldValue.serverTimestamp(),
          }).catch(() => {});
        }
        continue;
      }
      const intentos = Number(doc.data().intentos || 0) + 1;
      console.warn(`[notif] Error ${doc.id}:`, error?.message || error);
      if (!MODO.dryRun) {
        await datos('eventosNotificacion').doc(doc.id).update({
          // Se devuelve a pendiente para reintentar con backoff natural del
          // ciclo; al agotar intentos queda fallido y deja de reintentarse.
          estado: intentos >= MAX_INTENTOS ? 'fallido' : 'pendiente',
          intentos,
          error: String(error?.message || error).slice(0, 300),
          ultimoIntentoEn: FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
    }
  }
  return total;
}

async function procesarNotificacionesPendientes() {
  const snap = await datos('notificaciones')
    .where('pushEnviado', '==', false)
    .limit(LIMITE_NOTIFICACIONES)
    .get();
  let enviados = 0;
  for (const doc of snap.docs) {
    const notif = { id: doc.id, ...doc.data() };
    if (notif.pushPendiente === false) {
      if (!MODO.dryRun) await doc.ref.update({ pushEnviado: true, pushMotivo: 'preferencias' }).catch(() => {});
      continue;
    }
    if (Number(notif.pushIntentos || 0) >= 5) {
      if (!MODO.dryRun) await doc.ref.update({ pushEnviado: true, pushMotivo: 'reintentos-agotados' }).catch(() => {});
      continue;
    }
    const cantidad = await enviarPush(notif, doc.ref);
    enviados += cantidad;
  }
  return enviados;
}

async function testPush(uid) {
  if (!uid) throw new Error('Falta --uid');
  const rol = await rolDe(uid);
  const plantilla = plantillaNotificacion('sistema_prueba', rol, { entidadId: uid });
  const notificacion = {
    destinoUid: uid,
    categoria: plantilla.categoria,
    prioridad: plantilla.prioridad,
    titulo: plantilla.titulo,
    cuerpo: plantilla.cuerpo,
    ruta: plantilla.ruta,
    claveDedupe: `test__${uid}__${Date.now()}`,
    sonido: true,
  };
  const subs = await suscripcionesDe(uid);
  let enviados = 0;
  for (const sub of subs) {
    const data = sub.data();
    try {
      await webpush.sendNotification(
        { endpoint: data.endpoint, keys: { p256dh: data.keys.p256dh, auth: data.keys.auth } },
        payloadPush(notificacion),
        { TTL: 600, urgency: 'normal' }
      );
      enviados += 1;
    } catch (error) {
      console.warn(`[notif] test fallo ${data.plataforma || 'dispositivo'}:`, error?.statusCode || error?.message);
    }
  }
  console.log(`[notif] test uid=${uid} rol=${rol} dispositivos=${subs.length} enviados=${enviados}`);
}

async function ejecutar() {
  if (MODO.test) {
    // Sin --uid: prueba a todos los admins (workflow_dispatch test=true).
    const destino = MODO.uid ? [MODO.uid] : await admins();
    if (destino.length === 0) {
      console.log('[notif] test sin admins en notificacionesRoles/admin');
      return;
    }
    for (const uid of destino) await testPush(uid);
    return;
  }
  await recuperarAtascados();
  const eventos = await procesarPendientes();
  const push = await procesarNotificacionesPendientes();
  console.log(`[notif] ${MODO.dryRun ? 'dry-run' : 'ciclo'} eventos=${eventos} push=${push} proyecto=${sa.project_id}`);
}

if (MODO.watch) {
  console.log(`[notif] watcher activo (cada 15 s). Proyecto ${sa.project_id}.`);
  await ejecutar().catch((e) => console.warn('[notif] ciclo falló:', e?.message || e));
  const timer = setInterval(() => {
    ejecutar().catch((e) => console.warn('[notif] ciclo falló:', e?.message || e));
  }, 15000);
  const cerrar = () => {
    clearInterval(timer);
    console.log('[notif] watcher detenido.');
    process.exit(0);
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
} else {
  await ejecutar().catch((e) => {
    console.error('[notif] error:', e?.message || e);
    process.exitCode = 1;
  });
  process.exit();
}
