# 13 — Operación: deploy, backups y entornos

| Campo | Valor |
|---|---|
| ID | FLUJO-13 |
| Estado | 🟡 Verificado por configuración y memoria (19/11/2026); pendiente checklist formal |
| Archivos clave | `package.json`, `firebase.json`, `.firebaserc`, `vite.config.js`, `docs/MIGRACION_PRODUCCION.md`, `ARRANQUE_MEMORIA_IA.md`, `INSTRUCCIONES_A_LA_IA.md` |
| Deudas | `B-DEV-GIT-SUCIO` (CRÍTICO), `B-REGLAS-FUENTE-DUDOSA` (CRÍTICO), `B-FIREBASE-JSON-PARIDAD` |

## 1. Objetivo y alcance
Definir cómo se pasa código, reglas y documentación de DEV a PROD, cómo se respaldan los archivos y cómo se revierte.
No cubre la lógica de negocio de cada flujo; esos están en las fichas 01-12.

## 2. Entornos e identificadores
| Entorno | Carpeta | Proyecto Firebase | `appId` interno | Git origin |
|---|---|---|---|---|
| DEV | `C:\motoescuela-app` | `motoescuela-dev` (`.firebaserc`) | `motoescuela-pro-v1` | `asomototurismo/sesionesmanejo` |
| PROD | `C:\motoescuela-pro` | `motoescuelapp` (`.firebaserc` default) | `motoescuela-pro-v1` | `geminisaventuras/sesionesmanejo` |

- El `appId` de Firestore es **idéntico** en ambos proyectos (`INSTRUCCIONES_A_LA_IA.md:68-72`); lo que cambia es el proyecto Firebase.
- Los remotos Git son distintos: DEV apunta a `asomototurismo` y PROD a `geminisaventuras`. No son intercambiables.
- `package.json` solo define `dev`, `build` y `preview`; **no hay script de deploy**.
- `firebase.json` publica `dist`, con rewrite a `index.html` y cabeceras de seguridad (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

## 3. Fuente de verdad y estado de Git
- **Regla del proyecto:** se modifica primero en DEV; PROD recibe copia y es el repo que se commitea/pushea (`INSTRUCCIONES_A_LA_IA.md:33`, regla 11).
- **DEV no está limpio:** `main` está `ahead 3, behind 8` y hay cientos de archivos modificados/untracked (incluidos `docs/`, `src/`, `firestore.rules`, `.firebaserc`). La fuente de verdad real es el **filesystem de DEV**, no su Git.
- **PROD está limpio:** `main...origin/main`; el hash exacto se consulta con `git log -1`.
- Los backups (`backup/`), `.env`, `sa-dev.json`, `sa-prod.json` están ignorados por Git. Los `.mjs` de diagnóstico también se ignoran en PROD.
- `firestore.rules` **sí está trackeado** en PROD, aunque `INSTRUCCIONES_A_LA_IA.md:57` diga que las reglas viven solo en la consola.

## 4. Protocolo de backup
Antes de modificar cualquier archivo:
```bash
mkdir -p backup/$(dirname RUTA)
cp RUTA "backup/RUTA.backup-$(date +%Y%m%d-%H%M%S)"
```
- Los backups se preservan con timestamp y no se sobrescriben (`ARRANQUE_MEMORIA_IA.md:810-816`).
- Para sincronizaciones se usan carpetas `backup/pre-sync-*` con copia de `docs/` y memoria.
- Para datos se usan scripts `.mjs` con `firebase-admin`, **dry-run por defecto** y `--apply` para escribir; dejan backup JSON (`ARRANQUE_MEMORIA_IA.md:1106`, `:1216`).
- Los backups locales no están versionados; no sirven como respaldo offsite.

## 5. Secuencia de deploy (DEV → PROD)
1. **Verificar carpeta y proyecto:** `pwd`, `cat .firebaserc`; confirmar que se está en `motoescuela-pro` y proyecto `motoescuelapp`.
2. **Backup** de los archivos que se van a tocar (timestamped).
3. **Build en DEV:** `npm run build`; smoke local.
4. **Copiar** `src/`, `public/`, configuración y docs de DEV a PROD (excluyendo `node_modules`, `dist`, `.env`, service accounts).
5. **Verificar paridad** con SHA256 de los archivos copiados; 0 diferencias.
6. **Instalar dependencias** si cambió `package-lock.json` (`npm ci` o `npm install`).
7. **Build en PROD:** `npm run build`.
8. **Deploy Hosting:** `firebase deploy --only hosting --project motoescuelapp` (comando usado en `ARRANQUE_MEMORIA_IA.md:1450`).
9. **Reglas/índices** solo si cambiaron: revisar diff, probar en emulador si es posible y desplegar con `--only firestore:rules,firestore:indexes`.
10. **Smoke test E2E** en PROD (ver §8).
11. **Commit + push** en PROD (regla del proyecto: commit solo al pasar a producción).
12. **Verificar** `origin/main` y registrar release de Hosting.

> El commit de Git **no** coincide necesariamente con el release live de Hosting. Hay que verificar ambos por separado.

## 6. Reglas e índices
- `firebase.json` de PROD referencia `firestore.rules` y `firestore.indexes.json`; el de DEV solo referencia `firestore.rules`.
- **Paridad pendiente:** DEV no tiene bloque `firestore.indexes` en `firebase.json`; un deploy desde DEV no arrastraría índices.
- Las reglas son código sensible: un cambio puede romper login, reservas, pagos o portales. Requieren dictamen FIRE/MAMBA y prueba en emulador antes de PROD.
## 7. PWA y caché
- `vite.config.js` usa `VitePWA` con `registerType: 'autoUpdate'` y precachea `js/css/html/ico/png/svg/woff2`.
- Tras un deploy, un cliente puede seguir ejecutando chunks viejos hasta que el service worker actualice; el “autoUpdate” no garantiza que la pestaña abierta reciba el cambio.
- Para smoke test: recargar forzado / cerrar pestañas / verificar hash del chunk en Network.
- No hay `Cache-Control` explícito para `index.html` en `firebase.json`; verificar comportamiento de Hosting y evitar caching agresivo del HTML.

## 8. Smoke test mínimo post-deploy
1. Home y catálogo público (`/`, `/sesiones`, `/packs`, `/teorico`).
2. Login de estudiante, instructor y admin.
3. Reserva individual: disponibilidad, lock, pago, corrección.
4. Pack: compra, aprobación, agendamiento y avance.
5. Aula: iniciar módulo, pausa, cierre y avance de pack.
6. Proveedor: portal, calendario y bloqueo.
7. Teóricos: compra, aprobación y acceso.
8. Consola del navegador: 0 errores `permission-denied` inesperados; chunks 200.
9. Hosting: verificar que el release live corresponde al build recién subido.

## 9. Rollback
- **Hosting:** listar releases y volver a la anterior (`firebase hosting:releases:list` / `firebase hosting:rollback --project motoescuelapp`). **[POR VERIFICAR]** el comando exacto según CLI 15.x.
- **Reglas:** restaurar `firestore.rules.backup-*` o el commit anterior y redesplegar; la consola conserva historial.
- **Código:** `git revert` del commit de PROD o checkout del commit anterior; rebuild + deploy.
- **Datos:** restaurar el JSON de backup con el script correspondiente (dry-run → `--apply`); nunca editar a mano sin backup.
- **PWA:** tras rollback, forzar recarga; el service worker puede conservar el bundle nuevo.

## 10. Migraciones y scripts de datos
- Scripts `.mjs` con `firebase-admin`, service account del entorno correcto.
- Deben ser **dry-run por defecto**, imprimir resumen y requerir `--apply`.
- Guardar backup JSON antes de escribir y registrar el resultado.
- En PROD los `.mjs` están ignorados por Git (`*.mjs`), así que el script no queda versionado; documentar su propósito en la ficha o en el commit.
- Nunca ejecutar un script de DEV contra PROD ni viceversa; verificar `projectId` y service account.

## 11. Secretos y configuración
- `.env`, `.env.*`, `sa-dev.json` y `sa-prod.json` están ignorados; nunca se commitean ni se copian al chat.
- El `appId` `motoescuela-pro-v1` no es secreto; el proyecto Firebase sí cambia por entorno.
- Las claves de EmailJS/WhatsApp/config viven en `.env` o configuración; no hardcodear en docs.
## 12. Invariantes
- Se modifica **primero en DEV**; PROD recibe copia verificada.
- Todo cambio de archivo tiene backup timestamped previo.
- No se despliega sin `npm run build` exitoso.
- PROD debe quedar limpio (`main...origin/main`) después del commit.
- Las reglas se despliegan solo con diff revisado y, si es posible, emulador.
- El commit se hace en PROD **después** de desplegar, no antes.
- Los secretos y service accounts nunca entran a Git.

## 13. Qué se rompe si se cambia
- **Deploy desde la carpeta equivocada:** se publica el proyecto Firebase incorrecto.
- **Copiar sin hash:** se pierde un archivo o se mezcla una versión vieja.
- **Omitir el build:** Hosting publica `dist` viejo.
- **Desplegar reglas sin revisar:** se bloquean login, reservas o portales.
- **Force push/rebase en PROD:** se pierde trazabilidad del release.
- **No forzar recarga:** el usuario sigue con el bundle viejo por PWA.
- **Restaurar un backup viejo sobre datos nuevos:** pérdida de datos.

## 14. Costos y cuotas
- Build local: ~27-30 s según memoria (`ARRANQUE_MEMORIA_IA.md:1449`).
- Hosting: transferencia y releases; sin Functions (Plan Spark).
- Firestore: lecturas/escrituras de la app y de los scripts de migración.
- Los scripts de diagnóstico pueden consumir cuota; ejecutar con límites y dry-run.

## 15. Errores e idempotencia
- Reintentar `firebase deploy` del mismo build es seguro; crea un release nuevo.
- Un deploy de reglas fallido no debería dejar reglas a medias; **[POR VERIFICAR]** comportamiento exacto y plan de rollback.
- Copia parcial DEV→PROD: detectar con SHA256; no confiar en “copié todo”.
- Conflicto de Git en PROD: resolver antes de commit; no hacer force push.
- PWA: el service worker puede servir el bundle anterior; no confundir con un deploy fallido.
- Scripts de datos: sin `--apply` no escriben; con `--apply` deben ser idempotentes o tener backup.

## 16. Checklist de release
- [ ] `pwd` = `C:\motoescuela-pro`; `.firebaserc` = `motoescuelapp`.
- [ ] Backup timestamped de archivos a tocar.
- [ ] `npm run build` en DEV y smoke local.
- [ ] Copia DEV→PROD de `src`, `public`, config y docs.
- [ ] SHA256 DEV↔PROD = 0 diferencias.
- [ ] `npm ci` si cambió el lock.
- [ ] `npm run build` en PROD.
- [ ] `firebase deploy --only hosting --project motoescuelapp`.
- [ ] Reglas/índices solo si cambiaron, con diff y backup.
- [ ] Smoke test §8 en PROD.
- [ ] Commit + push en PROD; `origin/main` actualizado.
- [ ] Registrar release de Hosting y commit.

## 17. Riesgos, hallazgos y deudas
- **`B-DEV-GIT-SUCIO` (CRÍTICO):** DEV tiene `main` ahead 3/behind 8 y cientos de archivos modificados/untracked; la fuente de verdad es el filesystem, no Git. Un fallo de disco o un `git clean` puede perder trabajo. PROD está limpio (`main...origin/main`).
- **`B-REGLAS-FUENTE-DUDOSA` (CRÍTICO):** `INSTRUCCIONES_A_LA_IA.md:57` dice que las reglas viven solo en la consola, pero `firestore.rules` está trackeado y `firebase.json` lo despliega. Si alguien edita la consola, el próximo deploy puede sobrescribir ese cambio (o viceversa). Verificar la fuente efectiva.
- **`B-FIREBASE-JSON-PARIDAD`:** DEV no tiene `firestore.indexes` en `firebase.json`; PROD sí. Un deploy desde DEV no arrastraría índices.
- **`B-PWA-CACHE-STALE`:** `registerType: autoUpdate` no garantiza que la pestaña abierta reciba el bundle nuevo; smoke test con recarga forzada.
- **`B-NO-DEPLOY-SCRIPT`:** no hay script npm de deploy; el comando es manual y depende de estar en la carpeta/proyecto correcto.
- **`B-REMOTES-DISTINTOS`:** DEV y PROD apuntan a cuentas GitHub distintas (`asomototurismo` vs `geminisaventuras`); no asumir un origen único.
- **`B-BACKUPS-LOCAL-ONLY`:** los backups están ignorados por Git y viven en el mismo disco; no hay respaldo offsite.
- **`B-MIGRACION-DOC-OUTDATED`:** `docs/MIGRACION_PRODUCCION.md:73-80` describe reglas pendientes y una migración manual que ya no refleja el estado actual.
- **`B-DEPLOY-RULES-SIN-EMULADOR`:** no hay evidencia de prueba de reglas en emulador antes de PROD; alto riesgo de regresión.
- **`B-HOSTING-VS-COMMIT`:** el commit de Git no es el release live; hay que verificar ambos.

## 18. Supuestos / por verificar
- [SUPUESTO] Firebase CLI está autenticado y `--project motoescuelapp` es el proyecto correcto.
- [SUPUESTO] PROD es el repo de release y DEV el de trabajo.
- [SUPUESTO] Los backups locales son restaurables.
- [POR VERIFICAR] Si las reglas desplegadas en la consola coinciden con `firestore.rules`.
- [POR VERIFICAR] Comando exacto de rollback de Hosting en CLI 15.x.
- [POR VERIFICAR] Comportamiento de caché de `index.html` en Hosting.

## 19. Contradicciones detectadas
- “Las reglas viven en la consola” vs `firestore.rules` trackeado y desplegado desde archivo.
- “No commitear en DEV” vs cientos de cambios sin commit y sin respaldo offsite.
- `MIGRACION_PRODUCCION` dice reglas pendientes; el repo ya las tiene.
- DEV y PROD tienen `firebase.json` distintos (índices).
- El commit de Git y el release de Hosting son cosas distintas.

## 20. Enlaces
`docs/MIGRACION_PRODUCCION.md`, `ARRANQUE_MEMORIA_IA.md` (protocolo), `INSTRUCCIONES_A_LA_IA.md`, `firebase.json`, `.firebaserc`, `vite.config.js`, `docs/flujos/INDICE.md`.

## 21. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (config, memoria y estado de repos) | Deek |


