# Índice de flujos del sistema

> Leer esta tabla y la ficha del flujo **antes de tocar código**.
> Estados: 🟢 verificado · 🟡 verificado por código (pendiente DEV/revisión) · 🔴 desactualizado · ⚪ pendiente.

| # | Flujo | Estado | Última verificación | Archivos clave | Deudas |
|---|---|---|---|---|---|
| 01 | Inscripción individual | 🟡 | 19/11/2026 (código) | `InscripcionView.jsx`, `AuthService.js`, `ReservaService.js`, `LockService.js` | R-PIN-PII (ADR-001), B123 |
| 02 | Reinscripción y recuperación | 🟡 | 19/11/2026 (código) | `InscripcionView.jsx`, `ReservaService.js`, `AuthService.js`, `firestore.rules` | R-PIN-PII, B123 |
| 03 | Disponibilidad y locks | 🟡 | 19/11/2026 (código) | `useOcupacionConfirmada.js`, `useDisponibilidad.js`, `useDisponibilidadPack.js`, `LockService.js` | B-RATELIMIT-LOCKS, B-ALERTA-CUOTA, B-ESPACIO-LIMITE-100 |
| 04 | Reserva y espejo `ocupacionConfirmada` | 🟡 | 19/11/2026 (código + auditorías) | `ReservaService.js`, `solapamientoHelpers.js`, `ocupacionRepository.js`, `AdminReservaDetalle.jsx` | B-SLOTS-INSTRUCTOR, B-CROSSCHECK-ADMIN, B-ESPEJO-FANTASMA |
| 05 | Compra de pack | 🟡 | 19/11/2026 (código) | `PacksPublicosView.jsx`, `VistaPacks.jsx`, `InscripcionView.jsx`, `ReservaService.crearReservaPack` | B-PACK-RULES-OWNER, B-PACK-RULES-CHILD, B-PACK-PRECIOS-CLIENTE, B-PACK-PRECIO-TEORICOS, B-PACK-DOBLE-COMPRA |
| 06 | Agendamiento de pack | 🟡 | 19/11/2026 (código) | `AgendarPackView.jsx`, `useDisponibilidadPack.js`, `ReservaService.agendarSiguienteCursoPack`, `avanzarPackTrasCompletarCurso` | B-PACK-RULES-OWNER, B-PACK-RULES-CHILD, B-PACK-AVANCE-FIRE-AND-FORGET |
| 07 | Aprobación / rechazo / corrección de pagos | 🟡 | 19/11/2026 (código) | `AdminReservaDetalle.jsx`, `ReservaService.js`, `CorreccionPagoService.js`, `CorregirPagoView.jsx` | B-ESPEJO-FANTASMA, B-MOVIMIENTOS-ATOMICOS, B-INTENTOS-CORRECCION |
| 08 | Reasignación de tutor / cambio de horario / D2 | 🟡 | 19/11/2026 (código) | `AdminReservaDetalle.jsx`, `CambiarHorarioModal.jsx`, `ModalReasignarInstructor.jsx`, `reservaHorarioHelpers.js` | B-CROSSCHECK-ADMIN, B-D2-CONFLICTO-REPOSICION, B-ESPEJO-AUDITORIA, B-CAMBIO-CANCELADO |
| 09 | Aula virtual y sesiones | 🟡 | 19/11/2026 (código) | `AulaVirtualView.jsx`, `useSessionTimer.js`, `RelojSesion`, `ModuloItem` | B-AULA-PRESENCIA-HEARTBEAT, B-AULA-TZ, B-REVERTIR-MODULO, B-PAUSA-60, B-AULA-TIMESTAMPS-CLIENTE |
| 10 | Portales (estudiante / instructor / proveedor) | 🟡 | 19/11/2026 (código) | `EstudiantePanel.jsx`, `InstructorPanel.jsx`, `ProveedorPanel.jsx`, `PerfilTab.jsx` | B-INSTRUCTOR-PERFIL-RULES, B-PROVEEDOR-MIRROR-PAGOS, B-INSTRUCTOR-SPLIT-VISIBILIDAD |
| 11 | Finanzas y movimientos | 🟡 | 19/11/2026 (código) | `AdminFinanzas.jsx`, `PagosStaffService.js`, `FirestoreProvider.js`, `StaffFinanzasView.jsx` | B-FINANZAS-CAMPOS-LEGACY, B-MOVIMIENTOS-USERID, B-MOVIMIENTOS-RULE, B-PAGOS-MONTO-LIBRE, B-PAGOS-PROVEEDOR-LEGACY |
| 12 | Teóricos | 🟡 | 19/11/2026 (código) | `TeoricoCursoView.jsx`, `TeoricoModuloView.jsx`, `AccesoTeoricoService.js`, `ProgresoTeoricoService.js` | B-TEORICO-MODULO-BYPASS, B-TEORICO-PRECIO-CLIENTE, B-TEORICO-VENCIMIENTO, B-TEORICO-DOBLE-COMPRA, B-TEORICO-QUIZ-CLIENTE |
| 13 | Operación: deploy, backups, entornos | 🟡 | 19/11/2026 (config + repos) | `package.json`, `firebase.json`, `.firebaserc`, `vite.config.js`, `ARRANQUE_MEMORIA_IA.md` | B-DEV-GIT-SUCIO, B-REGLAS-FUENTE-DUDOSA, B-FIREBASE-JSON-PARIDAD, B-PWA-CACHE-STALE |

## Mapa de dependencias (resumen)

```mermaid
graph LR
  A[01 Inscripción individual] --> B[02 Reinscripción/recuperación]
  A --> C[03 Disponibilidad y locks]
  A --> D[04 Reserva y espejo]
  E[05 Compra de pack] --> C
  E --> D
  F[06 Agendamiento de pack] --> C
  F --> D
  D --> G[07 Pagos]
  G --> H[08 Reasignación/horarios]
  D --> I[09 Aula virtual]
  D --> J[10 Portales]
  G --> K[11 Finanzas]
```

## Hallazgos detectados al documentar
- **Contradicción de `instructoresPermitidos`:** el flujo individual es **fail-closed** (`InscripcionView.jsx:105-109`) y el de packs es **fail-open** (`useDisponibilidadPack.js:43-50`), aunque `BITACORA_EXPERIENCIAL.md` afirma que quedaron homologados. No se tocó; requiere dictamen FIRE/MAMBA.
- **PIN mostrado:** la memoria dice “tras Paso 1”; el código demuestra que solo se muestra **después del pago** (`InscripcionView.jsx:1699-1710`). Documentado en FLUJO-01/02.
- **Campo `reserva.pin`:** se escribe pero **no se lee**; es una segunda copia del PIN visible para instructores.
- **Movimiento de ingreso no atómico:** en la aprobación individual se crea después del commit; si falla, el pago queda aprobado sin movimiento (`AdminReservaDetalle.jsx:171`). En packs no se crea movimiento. Deuda `B-MOVIMIENTOS-ATOMICOS`.
- **Límite de 3 intentos solo UI:** `rechazarPago` no valida el tope; la regla tampoco. Deuda `B-INTENTOS-CORRECCION`.
- **`estadoCurso: 'En Curso'` al aprobar:** el SSOT (`getEstadoLogico`) lo ignora y devuelve `asignada`; dato engañoso.
- **`rechazadoEn`:** número en individual, `Timestamp` en packs.
- **Reglas de packs permiten autoaprobación (CRÍTICO):** el dueño de `reservasPack` puede actualizar cualquier campo, incluido `estadoPago`/precio/vencimiento (`firestore.rules:243-251`); además la child `pack_sub` puede nacer `Aprobado` sin validar que la maestra esté aprobada (`:107-133`). Deudas `B-PACK-RULES-OWNER` y `B-PACK-RULES-CHILD`.
- **Precio de pack con teóricos:** la UI suma los teóricos si `sumarTeoricosAlPrecio`, pero `crearReservaPack` calcula solo con `pack.cursoIds`; `pagoTotalMoneda` y `pagoTotalVES` pueden divergir. Deuda `B-PACK-PRECIO-TEORICOS`.
- **Precios/comisiones desde el cliente:** el backend usa `cursoSnapshot` enviado por el navegador; las reglas solo exigen `precio > 0`. Deuda `B-PACK-PRECIOS-CLIENTE`.
- **Avance de pack fire-and-forget:** si falla, el pack queda en el curso actual sin reintento. Deuda `B-PACK-AVANCE-FIRE-AND-FORGET`.
- **Doble compra de pack:** el chequeo de pack activo es previo a la transacción y fail-open. Deuda `B-PACK-DOBLE-COMPRA`.
- **Auto-jump desactivado en packs:** `AgendarPackView.jsx:302` neutraliza el salto automático a la primera fecha libre.
- **Conflictos D2 no detectados:** `verificarDisponibilidadInstructor/Moto` compara solo `horaId`, no `horaIdReposicion` (`reservaHorarioHelpers.js:41-78`). Deuda `B-D2-CONFLICTO-REPOSICION`.
- **Auditoría copiada al espejo:** reasignación y cambio total escriben `reprogramaciones`, motivos y split en `ocupacionConfirmada`, legible por cualquier autenticado. Deuda `B-ESPEJO-AUDITORIA`.
- **Cambio de horario en canceladas:** el botón y el handler no bloquean `estadoPago === 'Cancelado'`. Deuda `B-CAMBIO-CANCELADO`.
- **Auditoría mutable:** `reprogramaciones` vive en la reserva y el admin puede reescribirla; no hay log inmutable. Deuda `B-REPROG-AUDIT-MUTABLE`.
- **Presencia sin heartbeat periódico:** el estudiante solo actualiza `estudiantePresente` al montar/visibility/online; si espera >2 min, el instructor no puede iniciar el primer módulo. Deuda `B-AULA-PRESENCIA-HEARTBEAT`.
- **Revertir módulo no revierte el estado:** `estadoCurso` sigue `Aprobado` y el pack ya pudo avanzar. Deuda `B-REVERTIR-MODULO`.
- **Pausa >60 min inconsistente:** limpia `pausaActiva`/`moduloEnProgreso` sin registrar la pausa ni finalizar el curso. Deuda `B-PAUSA-60`.
- **Timestamps de sesión en cliente:** `Date.now()` del navegador alimenta tiempos y finanzas; sin validación de servidor. Deuda `B-AULA-TIMESTAMPS-CLIENTE`.
- **Zona horaria del aula:** fechas en Caracas vs hora de inicio en hora local del navegador. Deuda `B-AULA-TZ`.
- **Tarjetas de Finanzas con campos legacy:** `gananciaNeta`/`deudas` usan `pagoInstructor`/`pagoProveedor`, que las reservas no escriben (`AdminFinanzas.jsx:48-49`); muestran deuda 0 y ganancia = ingresos. Deuda `B-FINANZAS-CAMPOS-LEGACY`.
- **Movimientos atribuidos al admin:** `saveMovimiento` pisa el `userId` recibido con el uid del admin (`FirestoreProvider.js:154-157`). Deuda `B-MOVIMIENTOS-USERID`.
- **`movimientos.create` abierto:** cualquier autenticado puede crear movimientos propios (`firestore.rules:191`). Deuda `B-MOVIMIENTOS-RULE`.
- **Pago sin reconciliación:** `PagosStaffService.crearPago` acepta `montoTotal` sin compararlo con `detalles[].comision`. Deuda `B-PAGOS-MONTO-LIBRE`.
- **Proveedor con doble ruta:** `AdminFinanzas` paga sin `pagosStaff` ni transacción; el modal sí. Deuda `B-PAGOS-PROVEEDOR-LEGACY`.
- **Perfil de instructor bloqueado por reglas (CRÍTICO):** `PerfilTab` guarda en `instructores`, pero la regla solo permite escritura admin (`firestore.rules:85`); el botón siempre falla. Deuda `B-INSTRUCTOR-PERFIL-RULES`.
- **Portal del proveedor sin datos de pago (CRÍTICO):** el espejo no escribe `pagadoProveedor` ni `estadoCurso`; muestra cobrado 0, todo por cobrar y completadas 0. Deuda `B-PROVEEDOR-MIRROR-PAGOS`.
- **Colaborador de split invisible:** el panel del instructor filtra por `instructorId`; el colaborador solo ve la clase en Finanzas. Deuda `B-INSTRUCTOR-SPLIT-VISIBILIDAD`.
- **Límites de portales:** instructor 100 reservas, proveedor 500 espejos; historial truncado sin aviso. Deuda `B-PORTAL-LIMITS`.
- **Bypass de módulos teóricos (CRÍTICO):** `TeoricoModuloView` no valida acceso; cualquier usuario autenticado abre el módulo por URL y lo completa. Deuda `B-TEORICO-MODULO-BYPASS`.
- **Precio teórico desde el cliente (CRÍTICO):** `crearAcceso` acepta el `precio` enviado por el navegador; la regla solo exige `precio > 0`. Deuda `B-TEORICO-PRECIO-CLIENTE`.
- **Vencimiento teórico ignorado:** `TeoricoCursoView` no revisa `vencimiento`; un acceso temporal vencido sigue abierto. Deuda `B-TEORICO-VENCIMIENTO`.
- **Doble compra teórica:** el pre-check no es transaccional. Deuda `B-TEORICO-DOBLE-COMPRA`.
- **Quiz calculado en cliente:** el puntaje se envía desde el navegador sin validación. Deuda `B-TEORICO-QUIZ-CLIENTE`.
- **DEV con Git sucio (CRÍTICO):** `main` ahead 3/behind 8 y cientos de archivos sin commit; la fuente de verdad es el filesystem. Deuda `B-DEV-GIT-SUCIO`.
- **Fuente de reglas dudosa (CRÍTICO):** la memoria dice “reglas solo en consola”, pero `firestore.rules` está trackeado y se despliega desde archivo. Deuda `B-REGLAS-FUENTE-DUDOSA`.
- **Paridad de `firebase.json`:** DEV no declara `firestore.indexes`; PROD sí. Deuda `B-FIREBASE-JSON-PARIDAD`.
- **PWA y deploy manual:** no hay script de deploy y el service worker puede servir bundles viejos. Deudas `B-PWA-CACHE-STALE`, `B-NO-DEPLOY-SCRIPT`.

## Reglas de actualización
1. Si cambia el código de un flujo → actualizar su ficha en el mismo release.
2. Si aparece una decisión de riesgo → crear ADR y enlazarlo.
3. Si una ficha queda 🔴 → no se toca el flujo hasta verificarla y actualizarla.
4. Las fichas se editan en DEV y se sincronizan a PROD.

## Fichas disponibles
- `01-inscripcion-individual.md`
- `02-reinscripcion-recuperacion.md`
- `03-disponibilidad-locks.md`
- `04-reserva-y-espejo.md`
- `05-compra-pack.md`
- `06-agendamiento-pack.md`
- `07-aprobacion-rechazo-pagos.md`
- `08-reasignacion-horarios-d2.md`
- `09-aula-virtual-sesiones.md`
- `10-portales.md`
- `11-finanzas-movimientos.md`
- `12-teoricos.md`
- `13-operacion-deploy-backups.md`

## Pendiente de documentar (prioridad)
**Ninguno: 13/13 flujos documentados.** Siguiente fase: análisis de críticos y regresión antes de tocar código.
1. Dictamen de reglas de packs/teóricos/portales.
2. Plan de pruebas de regresión por flujo.
3. Corrección por lotes con backup, build, smoke y deploy.
