# Auditoría Fase 0 — ISS-00 a ISS-05

| Campo | Valor |
|---|---|
| Fecha | 19/11/2026 |
| Modo | **Read-only** (sin escrituras en Firestore, sin cambios de código ni reglas) |
| Método | `firebase-admin` con `sa-dev.json` / `sa-prod.json` + Firebase Rules API |
| Backups | `backup/audit-rules-2026-11-20T00-23-02-743Z/` en DEV y PROD |
| Resumen | `backup/audit-fase0-2026-11-20T00-23-02-743Z/summary.json` |

## ISS-01 — Reglas vivas vs repo

| Entorno | Release | Ruleset | SHA256 |
|---|---|---|---|
| DEV | `projects/motoescuela-dev/releases/cloud.firestore` | `9941e0c3-...` | `9F1D26E5...F7D20` |
| PROD | `projects/motoescuelapp/releases/cloud.firestore` | `bfd8e500-...` | `9F1D26E5...F7D20` |

- Las reglas vivas de DEV y PROD son **idénticas entre sí** y **idénticas al `firestore.rules` del repo**.
- Se guardó copia de la fuente viva en `backup/audit-rules-.../firestore.rules.live`.
- **Conclusión:** Ola 0 completada. `B-REGLAS-FUENTE-DUDOSA` queda resuelta para el estado actual; no se desplegarán reglas sin diff y backup.

## ISS-02 — Packs legacy

| Métrica | DEV | PROD |
|---|---:|---:|
| Packs totales | 27 | 9 |
| Activos + aprobados | 16 | 5 |
| Sin `packSnapshot.cursoIds` | 0 | 0 |
| Sin `cursoIds` raíz | 16 | 5 |
| Sin ambos | 0 | 0 |
| `subReservas.estado` | activo 27 / bloqueado 63 / completado 7 | activo 7 / bloqueado 4 / completado 12 |

- **No hay packs legacy sin `packSnapshot`.** Los 16/5 sin `cursoIds` raíz son modernos y usan snapshot.
- Los estados reales de `subReservas` son `activo`, `bloqueado` y `completado`; **no existe `pendiente`**.
- PROD ya tiene packs en `vencido` (1), `completado` (2) y `cancelado` (1).
- **Conclusión:** no se requiere backfill inmediato. La regla puede usar `packSnapshot.cursoIds` y dejar un fallback legacy defensivo, pero no hay datos que lo activen hoy.

## ISS-03 — IDs de `accesosTeoricos`

| Métrica | DEV | PROD |
|---|---:|---:|
| Accesos totales | 15 | 0 |
| IDs que coinciden con `${uid}_${cursoId}` | **0** | 0 |
| IDs aleatorios de 20 caracteres | 8 | 0 |
| IDs de pack `pack_{packReservaId}_{cursoId}` | 7 | 0 |
| Origen pack / standalone | 7 / 8 | — |

- Los accesos standalone usan IDs aleatorios (`doc(collection(...))`).
- Los accesos de pack usan `pack_${packReservaId}_${ctId}` (`ReservaService.js:1026`).
- **Ningún ID actual sirve para la regla propuesta por FIRE** (`get(accesosTeoricos/{uid}_{cursoId})`).
- **Conclusión:** `ISS-16` es bloqueante. Sin migración a ID determinístico `${uid}_${cursoId}`, la regla de lectura de módulos no puede desplegarse.

## ISS-04 — Documentos de instructores

| Métrica | DEV | PROD |
|---|---:|---:|
| Instructores | 2 | 2 |
| Doc ID = UID de Auth | **2** | **2** |
| Campo `userId` | 0 | 0 |
| Campo `uid` | 2 | 0 |
| Campos presentes | incluye `password`, `cedula`, `pagoBanco`, `pagoCedula`, `pagoTelefono` | incluye `password`, `cedula`, `pagoBanco`, `pagoCedula`, `pagoTelefono` |
| Campos con valor no vacío | `password` 2/2, `cedula` 2/2, `pagoCedula` 2/2, `pagoTelefono` 2/2 | `password` 2/2, `cedula` 2/2, `pagoCedula` 2/2, `pagoTelefono` 2/2 |

- El ownership correcto es **`docId == request.auth.uid`**, no `resource.data.userId`.
- El cliente `saveInstructor` usa `setDoc` con el objeto completo; la regla debe permitir solo el allowlist y el cliente debe usar `updateDoc`.
- **Hallazgo crítico colateral:** los documentos de `instructores` contienen el campo `password` **con valor no vacío en 2/2 DEV y 2/2 PROD**, y la regla de lectura es `isAuth()`, por lo que **cualquier autenticado puede leerlos**. También contienen cédula y datos de pago con valor (2/2). Requiere issue propio (`ISS-36`), fuera del PIN estudiantil y de ADR-001.

## ISS-05 — Estados y caller de `avanzarPack`

- `crearReservaPack` crea `subReservas` con `bloqueado` para los cursos futuros (`ReservaService.js:508-513`).
- `avanzarPackTrasCompletarCurso`:
  - marca `completado`;
  - activa el siguiente;
  - si vence, escribe `estado: 'vencido'` (`:1460-1466`);
  - si es el último, `estado: 'completado'` (`:1475-1483`).
- El comentario del servicio dice “lo llaman instructor (fire-and-forget) y estudiante (reparación)” (`:1412-1413`); el hook `useSessionTimer` solo expone la acción al instructor (`:606-617`), pero la regla debe decidir si acepta reparación del estudiante.
- **Conclusión:** cualquier regla de `estado` debe permitir `activo → completado` y `activo → vencido`; no debe permitir reversas desde `cancelado`/`vencido` a `activo`.

## Bloqueos que quedan para escribir reglas

1. `ISS-16`: migrar IDs de accesos teóricos o definir alternativa.
2. `ISS-19/20`: definir transiciones exactas de packs con `bloqueado` y `vencido`.
3. `ISS-13`: usar `docId == auth.uid` en instructores.
4. `ISS-36`: credenciales/PII de instructores expuestas.
5. `ISS-11`: `movimientos.create` admin-only.

## Evidencia

- Reglas vivas: `backup/audit-rules-2026-11-20T00-23-02-743Z/firestore.rules.live`.
- Resumen agregado: `backup/audit-fase0-2026-11-20T00-23-02-743Z/summary.json`.
- No se incluyeron valores de PII ni credenciales en este informe.

## ISS-36A — Contención de credencial aplicada (19/11/2026)

- **Código:** `StaffService.crearStaff` ya no persiste `password`; `FormPersonal` no prellena ni reenvía la clave al editar; `saveInstructor` y `saveProveedorRaw` eliminan `password` antes de escribir.
- **Datos DEV:** 2 instructores y 4 proveedores sin `password` después de la purga.
- **Datos PROD:** 2 instructores y 2 proveedores sin `password` después de la purga.
- **Deploy:** `firebase deploy --only hosting --project motoescuelapp` exitoso; `https://motoescuelapp.web.app` y chunk nuevo responden 200.
- **Backups:** `backup/purge-staff-password-2026-11-20T00-46-29-234Z` (DEV) y `backup/purge-staff-password-2026-11-20T00-52-19-807Z` (PROD). No se copiaron valores de `password`, solo metadatos.
- **Pendiente:** `ISS-36B` (PII legible por cualquier autenticado) e `ISS-36C` (rotación de contraseñas staff). Las cuentas de Firebase Auth no se modificaron.
