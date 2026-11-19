# 04 — Reserva y espejo `ocupacionConfirmada`

| Campo | Valor |
|---|---|
| ID | FLUJO-04 |
| Estado | 🟡 Verificado por código (19/11/2026); BUG-2 desplegado y auditado |
| Archivos clave | `ReservaService.js`, `solapamientoHelpers.js`, `ocupacionRepository.js`, `AdminReservaDetalle.jsx`, `firestore.rules` |
| Deudas | `B-SLOTS-INSTRUCTOR` (CRÍTICO), `B-CROSSCHECK-ADMIN` (CRÍTICO), `B-ESPEJO-FANTASMA-RECHAZADO`, `B-MIRROR-WHITELIST` |

## 1. Objetivo y alcance
Crear reservas de forma atómica, mantener el espejo público de ocupación y reflejar los cambios de estado del admin.
Cubre: `crearReserva`, `crearReservaPack`, `agendarSiguienteCursoPack`, aprobación/rechazo/cancelación, reasignación, cambio de horario y reposición D2.

## 2. Modelo del espejo
`ocupacionConfirmada/{reservaId}` (mismo ID que la reserva):
`userId`, `fecha`, `fecha2`, `horaId`, `horaIdReposicion`, `instructorId`, `tipoCurso`, `motoAsignadaId`, `motoReposicionId`, `traeMoto`, `sedeId`, `estadoPago`, `proveedorId`.
- Se escribe en la **misma transacción** que la reserva (individual `ReservaService.js:352-366`; pack `:645-659`; siguiente curso `:914-928`).
- ID = ID de la reserva; no contiene PII de nombre/cédula.
- Estados activos para disponibilidad: `Pendiente` y `Aprobado` (`useOcupacionConfirmada.js:13`).

## 3. Creación de reservas
### 3.1 Individual (`crearReserva`, `ReservaService.js:206`)
- Valida campos, identidad y prerequisitos.
- **Cross-check BUG-2** antes de la transacción (`:272-284`): 2 queries al espejo + 1 a `ocupacionTemporal`; fail-closed.
- Transacción: valida lock (`:291-310`), crea reserva `Pendiente`, escribe espejo y borra `locks` + `ocupacionTemporal`.
### 3.2 Compra de pack (`crearReservaPack`, `:385`)
- Freno de pack activo (fail-open ante error de red).
- Cross-check (`:423-434`).
- Transacción: lee pack y lock, resuelve cursos, crea child `Pendiente` + espejo `Pendiente` (`:645-659`), crea maestra y borra locks.
### 3.3 Siguiente curso del pack (`agendarSiguienteCursoPack`, `:693`)
- Valida maestra, subReservas y curso actual.
- Cross-check (`:712-723`).
- Transacción: child con `estadoPago: 'Aprobado'` (ya pagó el pack), espejo `Aprobado` (`:914-928`), actualiza maestra y borra locks.

## 4. Cambios desde el admin
| Acción | Archivo | Efecto en el espejo |
|---|---|---|
| Aprobar pago | `AdminReservaDetalle.jsx:152-153` | set merge con `Aprobado` |
| Rechazar (corregir) | `:231-240` | queda `Pendiente` (sigue bloqueando) |
| Cancelar | `:187` | **delete** del espejo (libera horario) |
| Reasignar tutor | `:345`, `:424` | set con `{...datosActualizacion}` (incluye auditoría) |
| Cambiar moto | `:481-507` | set con nueva moto |
| Reponer D2 | `:549-592` | set con `fecha2`, `horaIdReposicion`, `motoReposicionId` |
| Cambio total de horario | `:680-713` | set con nuevo horario; limpia D2 (BUG-2/F1) |
| Aprobar pack | `ReservaService.js:991-1003` | espejo `Aprobado` |
| Rechazar pack | `:1133-1134` | queda `Pendiente` |
| Cancelar pack | `:1160-1183` | delete del espejo |

## 5. Reglas
| Operación | Regla |
|---|---|
| `ocupacionConfirmada.read` | cualquier autenticado (`firestore.rules:70`) |
| `ocupacionConfirmada.create` | dueño, atado a la reserva creada en la misma transacción (`:71-75`) |
| `ocupacionConfirmada.update/delete` | solo admin (`:76`) |
| `reservas.read` | admin, dueño, instructor o implicado (`:100-105`) |
| `reservas.create` | dueño, precio > 0, estados permitidos; **sin exigir lock ni ocupación** (`:107-133`) |
| `reservas.update` | admin, instructor (campos de sesión) o estudiante (campos limitados) (`:135-184`) |
| `reservas.delete` | denegado (`:186`) |

## 6. Estados
| Entidad | Estados | Transiciones |
|---|---|---|
| Reserva | `Pendiente` | `Aprobado`, `Rechazado`, `Cancelado` |
| Espejo | `Pendiente`/`Aprobado` | `Aprobado`, se mantiene `Pendiente` al rechazar, se borra al cancelar |

## 7. Invariantes
- Reserva y espejo son **atómicos** (misma transacción).
- El espejo no contiene PII sensible.
- El lock se valida y se borra en la misma transacción.
- BUG-2: ningún flujo de creación continúa si el cross-check falla (fail-closed).
- El espejo debe reflejar exactamente el estado de pago de la reserva.
- D2: `horaIdReposicion`/`motoReposicionId` mandan sobre `horaId`/`motoAsignadaId` (`getHoraIdOcupacion`).
- Un cambio total de horario invalida la reposición D2 previa (se limpian los campos).

## 8. Por qué está diseñado así
- **Colección espejo `ocupacionConfirmada` (ARRANQUE 23/06/2026):** resuelve el fallo BOLA que impedía a los estudiantes leer reservas ajenas. Es pública para usuarios autenticados y sin PII sensible.
- **Sincronización atómica:** reserva + espejo en la misma transacción; al cancelar se borra el espejo para liberar el horario.
- **Regla de negocio del rechazo:** el espejo queda `Pendiente` para seguir bloqueando el horario mientras el estudiante corrige el pago; solo cancelar lo borra.
- **BUG-2 (19/11/2026):** cross-check previo a la transacción para impedir solapamientos por locks expirados; fail-closed y `traceId`.
- **Plan Spark:** el SDK cliente no permite queries dentro de transacciones; de ahí el pre-check externo.

## 9. Dependencias críticas
- FLUJO-01/05/06 crean reservas y espejo; FLUJO-03 lee el espejo; FLUJO-07/08 actualizan estados.
- El cross-check usa `solapamientoHelpers` + `ocupacionRepository` y consulta `ocupacionTemporal`.
- Las reglas de `reservas` y `ocupacionConfirmada` son la última barrera (hoy insuficiente, ver deudas).

## 10. Qué se rompe si se cambia
- **Cambiar el ID del espejo:** los listeners de disponibilidad dejan de ver la ocupación.
- **Escribir el espejo fuera de la transacción:** aparecen reservas sin espejo o espejos huérfanos.
- **Cambiar los estados activos:** se liberan u ocultan horarios.
- **Borrar el espejo al rechazar:** riesgo de doble reserva durante la corrección.
- **Quitar el cross-check:** vuelve el solapamiento Simon/Milena.
- **No limpiar D2 en un cambio total:** `horaIdReposicion` obsoleto contamina la disponibilidad.
- **Agregar campos sensibles al espejo:** expone PII a todos los auth.

## 11. Costos y cuotas
- Cross-check por creación: 2 queries al espejo (máx. 200 docs cada una) + 1 a `ocupacionTemporal`.
- Transacción: reserva + espejo + borrado de 2 locks (individual); pack agrega maestra/child.
- Los listeners de disponibilidad consumen lecturas por cada fecha abierta.

## 12. Errores y recuperación
- `slot-occupied` → el servicio libera el lock y la UI resetea el estado.
- `ocupacion-no-verificable` → fail-closed, mantiene el lock para reintentar.
- `transaction-failed` (lock ausente/expirado, pack inválido) → mensaje genérico; no se crea nada.
- Espejo faltante por datos legacy → auditoría de fantasmas (0 en PROD al 19/11).

## 13. Pruebas y auditorías
- Replay DEV: **79/79** slots de instructor y **76/76** de moto detectados; 0 mismatches y 0 falsos positivos (19/11/2026).
- PROD: **0 espejos fantasma**, **0 colisiones existentes**, **0 locks activos** en el rango auditado (19/11/2026).
- Pruebas negativas: crear sin lock (regla pendiente), doble submit, lock expirado, D2 cruzado.
- Regresión: aprobar/rechazar/cancelar/reasignar/cambiar horario/reponer D2.

## 14. Riesgos y deudas
- `B-SLOTS-INSTRUCTOR` (CRÍTICO): cierre estructural del TOCTOU con IDs determinísticos y reglas.
- `B-CROSSCHECK-ADMIN` (CRÍTICO): extender el cross-check a `cambiarHorario`, `reasignarInstructor` y reposición D2.
- `B-ESPEJO-FANTASMA-RECHAZADO`: rechazos sin corregir que bloquean horarios.
- `B-MIRROR-WHITELIST`: el `batch.set` del admin propaga auditoría por spread; evaluar whitelist.
- `reprogramaciones` se copia al espejo en `cambiarHorario` y crece sin cota.

## 15. Supuestos / por verificar
- [SUPUESTO] El volumen por fecha no supera el límite de 200 por query del cross-check.
- [POR VERIFICAR] Impacto real de la regla `reservas.create` sin lock (creación directa desde cliente).

## 16. Enlaces
`docs/flujos/01-inscripcion-individual.md`, `docs/flujos/03-disponibilidad-locks.md`, `docs/decisiones/ADR-001-riesgo-pin-pii-aceptado.md`, `ARRANQUE_MEMORIA_IA.md` (auditorías 19/11).

## 17. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código + auditorías) | Deek |

