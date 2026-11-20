# Issues Lote A — lista de trabajo uno por uno

> Regla: **un issue = un cambio = un backup = un test = un deploy**.
> No se implementa nada sin confluencia FIRE/MAMBA y aprobación del Operador.

## Fase 0 — completada (read-only)

| ID | Issue | Estado | Resultado |
|---|---|---|---|
| `ISS-00` | Aclarar alcance de ADR-001 | ✅ | `ADR-002`: solo PIN/PII; lo demás no está rechazado |
| `ISS-01` | Exportar reglas vivas + diff + backup | ✅ | Live DEV/PROD = repo, SHA256 `9F1D26E5...F7D20` |
| `ISS-02` | Auditar packs legacy | ✅ | 0 packs sin `packSnapshot`; no requiere backfill |
| `ISS-03` | Auditar IDs de `accesosTeoricos` | ✅ | 0 IDs `${uid}_${cursoId}`; 8 random + 7 `pack_*` |
| `ISS-04` | Auditar ownership de `instructores` | ✅ | Doc ID = Auth UID; no existe `userId` |
| `ISS-05` | Confirmar estados/caller de `avanzarPack` | ✅ | `bloqueado/activo/completado`; también `vencido` |

Detalle: `docs/analisis/AUDITORIA-FASE0-20261119.md`.

## PIN/PII — congelado por ADR-001

| ID | Issue | Estado |
|---|---|---|
| `ISS-06` | Cerrar `get: true` de `progresoInscripcion` | 🔵 Congelado |
| `ISS-07` | Purga de `pin` histórico | 🔵 Congelado |
| `ISS-08` | Rotación `requiereCambioPin` | 🔵 Congelado |
| `ISS-09` | `EmailService` sin PIN | 🔵 Congelado |
| `ISS-10` | Rediseño A2 del registro | 🔵 Congelado |

## Lote A — reglas y acceso

| ID | Issue | Depende de | Estado |
|---|---|---|---|
| `ISS-11` | `movimientos.create` solo admin; update/delete denegado | ISS-01 | 🟡 Listo para diseño |
| `ISS-12` | `saveMovimiento` no debe pisar `userId` | ISS-11 | ⚪ Pendiente |
| `ISS-13` | `instructores.update` allowlist con `docId == auth.uid`; create/delete admin | ISS-04 | 🟡 Listo para diseño |
| `ISS-14` | `PerfilTab` con `updateDoc` solo allowlist | ISS-04 | 🟡 Listo para diseño |
| `ISS-15` | Gate UI de `TeoricoModuloView` + vencimiento | ISS-03 | 🟡 Listo para diseño |
| `ISS-16` | Migrar accesos a ID `${uid}_${cursoId}` o alternativa | ISS-03 | 🔴 Bloqueante |
| `ISS-17` | Precio teórico exacto; `precio 0` solo admin/pack | ISS-16 | 🟡 Listo para diseño |
| `ISS-18` | Regla de lectura de `modulosTeoricos` | ISS-16 | 🔴 Bloqueante |
| `ISS-19` | `reservasPack.update` dueño: allowlist + transiciones | ISS-05 | 🟡 Listo para diseño |
| `ISS-20` | Child `pack_sub`: pack aprobado/activo, owner, no vencido, curso válido, sin duplicado | ISS-02 | 🟡 Listo para diseño |
| `ISS-21` | Fallback/backfill legacy | ISS-02 | ✅ No requiere backfill; dejar fallback defensivo |

## Dictamen anterior MAMBA — no-PIN

| ID | Issue | Estado |
|---|---|---|
| `ISS-22` | Exigir lock validado en `reservas.create` | 🟡 Listo para diseño |
| `ISS-23` | UX lock: expirado, corrupto, reintento, doble pestaña | 🟡 Listo para diseño |
| `ISS-24` | Verificar mismo ID de lock en los 3 flujos | 🟡 Listo para diseño |
| `ISS-25` | `slotsInstructor` | ⚪ Pendiente |
| `ISS-26` | App Check en monitoreo | ⚪ Pendiente |
| `ISS-27` | Alertas de cuota Spark 50/75/90 | ⚪ Pendiente |
| `ISS-28` | Timezone SSOT `America/Caracas` | ⚪ Pendiente |
| `ISS-29` | C1 multi-admin `admins/{uid}` | ⚪ Pendiente |
| `ISS-30` | Paridad `firebase.json` / índices | ⚪ Pendiente |

## Hallazgos de documentación

| ID | Issue | Estado |
|---|---|---|
| `ISS-31` | Tarjetas de Finanzas con campos legacy | ⚪ Pendiente |
| `ISS-32` | Portal del proveedor sin flags de pago/curso | ⚪ Pendiente |
| `ISS-33` | D2 no detecta `horaIdReposicion` | ⚪ Pendiente |
| `ISS-34` | Aula: heartbeat, revertir, pausa, timestamps | ⚪ Pendiente |
| `ISS-35` | DEV Git sucio / backups locales | ⚪ Pendiente |

## Hallazgo nuevo de la auditoría

| ID | Issue | Estado |
|---|---|---|
| `ISS-36` | **CRÍTICO:** `instructores` guarda `password` con valor no vacío en 2/2 DEV y 2/2 PROD; `isAuth()` permite leerlo. También cédula y datos de pago con valor. Requiere purga, rotación y restricción de lectura/escritura. | 🔴 Bloqueante de seguridad |

## Próximo orden propuesto

1. `ISS-11` — `movimientos.create` admin-only (bajo riesgo, ya aprobado por FIRE).
2. `ISS-13` + `ISS-14` — perfil de instructor (docId = uid + allowlist).
3. `ISS-15` — gate UI de teóricos.
4. `ISS-16` + `ISS-17` + `ISS-18` — migración y reglas de teóricos.
5. `ISS-19` + `ISS-20` — reglas de packs.
6. `ISS-36` — contención de credenciales/PII de instructores.
7. Resto (`ISS-22` a `ISS-35`).

No se inicia el siguiente issue sin backup, prueba en emulador/DEV y confirmación de FIRE/MAMBA cuando corresponda.
