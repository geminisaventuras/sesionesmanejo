# Índice de flujos del sistema

> Leer esta tabla y la ficha del flujo **antes de tocar código**.
> Estados: 🟢 verificado · 🟡 verificado por código (pendiente DEV/revisión) · 🔴 desactualizado · ⚪ pendiente.

| # | Flujo | Estado | Última verificación | Archivos clave | Deudas |
|---|---|---|---|---|---|
| 01 | Inscripción individual | 🟡 | 19/11/2026 (código) | `InscripcionView.jsx`, `AuthService.js`, `ReservaService.js`, `LockService.js` | R-PIN-PII (ADR-001), B123 |
| 02 | Reinscripción y recuperación | 🟡 | 19/11/2026 (código) | `InscripcionView.jsx`, `ReservaService.js`, `AuthService.js`, `firestore.rules` | R-PIN-PII, B123 |
| 03 | Disponibilidad y locks | 🟡 | 19/11/2026 (código) | `useOcupacionConfirmada.js`, `useDisponibilidad.js`, `useDisponibilidadPack.js`, `LockService.js` | B-RATELIMIT-LOCKS, B-ALERTA-CUOTA, B-ESPACIO-LIMITE-100 |
| 04 | Reserva y espejo `ocupacionConfirmada` | 🟡 | 19/11/2026 (código + auditorías) | `ReservaService.js`, `solapamientoHelpers.js`, `ocupacionRepository.js`, `AdminReservaDetalle.jsx` | B-SLOTS-INSTRUCTOR, B-CROSSCHECK-ADMIN, B-ESPEJO-FANTASMA |
| 05 | Compra de pack | ⚪ | — | `ReservaService.crearReservaPack`, `Paso2Pack.jsx` | — |
| 06 | Agendamiento de pack | ⚪ | — | `AgendarPackView.jsx`, `useDisponibilidadPack.js`, `ReservaService.agendarSiguienteCursoPack` | — |
| 07 | Aprobación / rechazo / corrección de pagos | ⚪ | — | `AdminReservaDetalle.jsx`, `ReservaService` (pack) | — |
| 08 | Reasignación de tutor / cambio de horario / D2 | ⚪ | — (BUG-1 desplegado) | `AdminReservaDetalle.jsx` | cross-check admin |
| 09 | Aula virtual y sesiones | ⚪ | — | `AulaVirtualView.jsx`, `useSessionTimer.js` | — |
| 10 | Portales (estudiante / instructor / proveedor) | ⚪ | — | `modules/estudiante`, `InstructorPanel`, `ProveedorPanel` | — |
| 11 | Finanzas y movimientos | ⚪ | — | `AdminFinanzas.jsx`, `FirestoreProvider.saveMovimiento` | regla `movimientos.create` |
| 12 | Teóricos | ⚪ | — | `InscripcionTeoricoView.jsx`, `AdminAccesoTeoricoDetalle.jsx` | — |
| 13 | Operación: deploy, backups, entornos | ⚪ | — | `firebase.json`, `scripts/`, `docs/MIGRACION_PRODUCCION.md` | paridad de config |

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

## Pendiente de documentar (prioridad)
1. 07 Aprobación / rechazo / corrección de pagos.
2. 05/06 Packs (compra y agendamiento).
3. 08 Reasignación de tutor / cambio de horario / D2.
4. Resto.
