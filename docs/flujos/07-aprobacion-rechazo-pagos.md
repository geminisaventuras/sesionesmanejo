# 07 — Aprobación, rechazo y corrección de pagos

| Campo | Valor |
|---|---|
| ID | FLUJO-07 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente prueba E2E y revisión FIRE/MAMBA |
| Archivos clave | `AdminReservaDetalle.jsx`, `ReservaService.js`, `CorreccionPagoService.js`, `CorregirPagoView.jsx`, `AccesoTeoricoService.js`, `firestore.rules` |
| Deudas | `B-ESPEJO-FANTASMA-RECHAZADO`, `B-MOVIMIENTOS-ATOMICOS`, `B-INTENTOS-CORRECCION` |

## 1. Objetivo y alcance
Gestionar el ciclo de vida del pago manual (Pago Móvil): aprobar, rechazar para corrección, corregir la referencia y cancelar.
Cubre reservas individuales, packs y accesos teóricos. No cubre tasas de cambio ni métodos de pago.

## 2. Actores y rutas
- **Admin:** `AdminReservaDetalle` (reserva individual) y `AdminPackDetalle` (pack).
- **Estudiante:** `/corregir-pago/:tipo/:id` con `ProtectedRoute allowedRoles=['estudiante']` (`App.jsx:117-121`).
- Tipos: `reserva`, `pack`, `teorico` (`constants/servicios.js:4-8`).

## 3. Aprobación
### 3.1 Reserva individual (`AdminReservaDetalle.jsx:145-177`)
1. `batch.update` de la reserva: `estadoPago: 'Aprobado'`, `estadoCurso: 'En Curso'` (`:150`).
2. `batch.set` merge del espejo con `estadoPago: 'Aprobado'` (`:152-162`).
3. Actualiza `usuarios/{uid}.updatedAt` para invalidar métricas (`:165-167`).
4. **Después** del commit, registra un movimiento de ingreso (`:171`).
5. No crea notificación; el admin puede enviar la confirmación por WhatsApp manualmente (`:1006-1031`).
### 3.2 Pack (`ReservaService.aprobarReservaPack`, `:957`)
- Pasa maestra y child a `Aprobado` y el espejo a `Aprobado` (`:991-1003`).
- Crea accesos teóricos incluidos en un batch posterior (`:1011-1091`); si falla, devuelve `success` con `batchWarning` (`:1087-1089`).

## 4. Rechazo y corrección
### 4.1 Rechazo individual (`AdminReservaDetalle.rechazarPago`, `:179-273`)
- Actualiza la reserva: `estadoPago: 'Rechazado'`, `rechazadoEn: Date.now()`, `intentosCorreccion + 1`, `motivoRechazo` (`:221-226`).
- El espejo **se mantiene en `Pendiente`** (`:231-240`) para seguir bloqueando el horario mientras el estudiante corrige.
- Construye mensaje de WhatsApp con el link `/corregir-pago/reserva/{id}` (`:252-267`).
- `intentosRestantes = max(0, 3 - intentos)` (`:253`), pero **no hay bloqueo duro** en el handler.
### 4.2 Rechazo de pack (`ReservaService.rechazarReservaPack`, `:1104`)
- Maestra y child a `Rechazado`; espejo queda en `Pendiente` (`:1133-1134`).
### 4.3 Corrección del estudiante (`CorregirPagoView` + `CorreccionPagoService`)
1. La vista carga el detalle (`CorreccionPagoService.obtenerDetalle`), valida que esté rechazado y que no haya agotado intentos (`CorregirPagoView.jsx:43-71`, `:79-82`, `:141`, `:221-228`).
2. Envía `CorreccionPagoService.corregir(tipo, id, nuevaRef, childId)` (`:85`).
3. El facade delega:
   - Reserva → `ReservaService.corregirReferenciaPago(id, ref)` (`CorreccionPagoService.js:188`).
   - Pack → resuelve el child y llama al mismo método (`:191-209`).
   - Teórico → `AccesoTeoricoService.corregirReferenciaPago` (`:211-216`; existe).
4. El servicio exige exactamente 4 caracteres (`ReservaService.js:1358`), actualiza `pagoRef` y `estadoPago: 'Pendiente'`; en packs actualiza child + maestra (`:1370-1398`) y la caché del usuario.
5. La regla permite al estudiante pasar de `Rechazado` a `Pendiente` tocando solo campos de pago (`firestore.rules:162-176`).
6. El espejo **no cambia** en la corrección: sigue `Pendiente`.

## 5. Cancelación
### 5.1 Individual (`AdminReservaDetalle.jsx:185-218`)
- Reserva a `Cancelado`/`Cancelado`; **borra el espejo** (`:187`) y purga locks por instructor/fecha/hora (`:194-218`).
- No envía WhatsApp ni notificación desde este handler.
### 5.2 Pack (`ReservaService.cancelarReservaPack`, `:1153`)
- Maestra/child a `Cancelado`; **borra el espejo** (`:1183`); soft-delete de accesos teóricos (`:1191-1220`); crea notificación `pack_cancelado` (`:1223-1238`).

## 6. Colecciones y campos
| Colección | Campos | Escritura |
|---|---|---|
| `reservas` | `estadoPago`, `estadoCurso`, `rechazadoEn`, `intentosCorreccion`, `motivoRechazo`, `pagoRef` | update (admin/estudiante según regla) |
| `reservasPack` | `estadoPago`, `estado`, `rechazadoEn`, `motivoRechazo`, `pagoRef` | update (admin) |
| `ocupacionConfirmada` | `estadoPago` | set merge / delete (admin) |
| `movimientos` | `tipo`, `monto`, `desc`, `fecha`, `userId` | create (wrapper admin) |
| `accesosTeoricos` | `estadoPago`, `pagoRef` | create/update (pack/corrección) |
| `notificaciones` | `pack_cancelado` | create (cancelación de pack) |

## 7. Estados
| Entidad | Estado inicial | Aprobado | Rechazado | Corregido | Cancelado |
|---|---|---|---|---|---|
| Reserva | `Pendiente` | `Aprobado` | `Rechazado` + intentos+1 | vuelve a `Pendiente` | `Cancelado` |
| Espejo | `Pendiente` | `Aprobado` | sigue `Pendiente` | sigue `Pendiente` | se borra |
| Pack | `Pendiente` | `Aprobado` | `Rechazado` | vuelve a `Pendiente` | `Cancelado` + notificación |

## 8. Estados lógicos (SSOT)
`getEstadoLogico` (`estadoHelpers.js`) deriva el estado visible con precedencia:
`cancelado > pendiente_pago > ausente > tiempo_pendiente > completado > en_curso > asignada`.
- `estadoCurso: 'En Curso'` escrito al aprobar **no** se usa para el estado lógico; el SSOT devuelve `asignada` hasta que haya actividad.

## 9. Reglas de Firestore
| Operación | Regla |
|---|---|
| `reservas.update` (admin) | cualquier campo (`firestore.rules:135-160`) |
| `reservas.update` (estudiante) | solo `pagoRef`, `pagoBanco`, `pagoTelefono`, `pagoCedula`, `estadoPago`; y solo `Rechazado → Pendiente` (`:162-176`) |
| `reservas.update` (instructor) | solo campos de sesión (`:138-159`) |
| `reservas.delete` | denegado (`:186`) |
| `ocupacionConfirmada.update/delete` | solo admin (`:76`) |
| `movimientos.create` | cualquier auth con `userId` propio (**hoy**); todos los llamadores son admin (`:189-193`) |
| `accesosTeoricos` | reglas propias del módulo teórico |

## 10. Invariantes
- Un pago rechazado **no libera** el horario: el espejo sigue `Pendiente`.
- Solo la cancelación borra el espejo y libera el horario.
- El estudiante no puede cambiar el monto ni el estado a `Aprobado`; solo la referencia y volver a `Pendiente`.
- El máximo de intentos es 3 (`MAX_INTENTOS_CORRECCION`), aplicado **solo en la UI**.
- La aprobación individual debe registrar un movimiento de ingreso (no atómico hoy).
- El pack aprobado crea accesos teóricos; si el batch falla, la aprobación igual queda hecha.

## 11. Por qué está diseñado así
- **Pago manual (Pago Móvil):** el admin valida la referencia; no hay pasarela ni webhook.
- **Espejo en `Pendiente` al rechazar:** regla de negocio para no liberar el horario mientras el estudiante corrige (evita doble reserva).
- **Corrección sin backend:** la regla permite al dueño actualizar solo campos de pago y volver a `Pendiente`; no requiere Cloud Functions (Plan Spark).
- **Corrección unificada:** `CorreccionPagoService` normaliza reserva/pack/teórico y delega en los servicios existentes.

## 12. Dependencias críticas
- FLUJO-04 (espejo) depende de que aprobar/rechazar/cancelar mantengan los estados correctos.
- FLUJO-01/05/06 crean las reservas que este flujo aprueba.
- FLUJO-11 (finanzas) consume `movimientos`.
- WhatsAppService construye los mensajes y links de corrección.

## 13. Qué se rompe si se cambia
- **Borrar el espejo al rechazar:** doble reserva durante la corrección.
- **Permitir al estudiante cambiar otros campos:** fraude (monto, curso, instructor).
- **Quitar la regla `Rechazado → Pendiente`:** la corrección deja de funcionar.
- **Cambiar el tope de intentos solo en la UI:** ya es blando; endurecerlo requiere regla/servicio.
- **Hacer atómico el movimiento sin transacción:** si se mueve mal, se pierde el ingreso o se duplica.
- **Quitar la purga de locks al cancelar:** quedan bloqueos fantasma.

## 14. Costos y cuotas
- Aprobar: 1 batch (reserva + espejo + usuario) + 1 movimiento (otra escritura).
- Rechazar: 1 batch; cancelar: batch + `getDocs` de locks por instructor + borrados.
- Corrección: 1-2 `getDoc` + 1 batch; sin listeners.
- Pack: transacción + batch de accesos teóricos + posible notificación.

## 15. Errores e idempotencia
- Aprobar dos veces: el batch es idempotente en estado, pero puede duplicar el movimiento si se reintenta.
- Movimiento falla tras aprobar: la reserva queda `Aprobado` y el ingreso no se registra; la UI muestra error.
- Corrección con estado cambiado: `permission-denied` → aviso “El estado de tu pago cambió” (`CorregirPagoView.jsx:90-97`).
- Intento 4: la vista bloquea; el admin puede seguir rechazando (sin tope duro).
- Pack cancelado: la corrección se bloquea con `pack-cancelado` (`CorreccionPagoService.js:74-80`).

## 16. Pruebas
- Aprobar individual y pack; verificar espejo `Aprobado` y movimiento.
- Rechazar; verificar espejo `Pendiente` y link de corrección.
- Corregir referencia (reserva, pack, teórico); verificar `Pendiente` y `pagoRef`.
- Agotar 3 intentos; verificar bloqueo de UI.
- Cancelar; verificar borrado de espejo y purga de locks.
- Permisos: estudiante no puede aprobar ni cambiar monto; instructor no puede tocar pagos.

## 17. Riesgos, hallazgos y deudas
- `B-ESPEJO-FANTASMA-RECHAZADO`: rechazos que nunca se corrigen ni cancelan bloquean el horario.
- `B-MOVIMIENTOS-ATOMICOS` (nueva): el movimiento de ingreso se crea después del commit; si falla, no hay rollback.
- `B-INTENTOS-CORRECCION` (nueva): el tope de 3 intentos es solo UI; no hay regla ni validación en el servicio.
- [POR VERIFICAR] ¿El pack aprobado registra movimiento de ingreso? En `aprobarReservaPack` no se crea.
- `rechazadoEn` es número (`Date.now()`) en individual y `Timestamp` en packs; inconsistencia de tipo.
- Aprobar escribe `estadoCurso: 'En Curso'` de inmediato; el SSOT lo ignora, pero es dato engañoso.
- La regla `movimientos.create` permite a cualquier auth crear movimientos propios; hoy solo la usan admin.

## 18. Supuestos / por verificar
- [SUPUESTO] El admin siempre revisa el pago antes de aprobar.
- [SUPUESTO] El estudiante conserva acceso al WhatsApp/teléfono declarado.
- [POR VERIFICAR] Movimiento de ingreso en packs y en teóricos.

## 19. Contradicciones detectadas
- `ARRANQUE`/`BITACORA` describen 3 estados de sesión (`Asignada`, `En Curso`, `Completado`); al aprobar se escribe `estadoCurso: 'En Curso'` aunque el SSOT devuelve `asignada`. No rompe la UI (el SSOT manda), pero el campo queda inconsistente.
- El límite de 3 intentos se presenta como regla, pero solo está implementado en la vista.

## 20. Enlaces
`docs/flujos/04-reserva-y-espejo.md`, `docs/flujos/11-finanzas-movimientos.md`, `docs/decisiones/ADR-001-riesgo-pin-pii-aceptado.md`, `constants/servicios.js`.

## 21. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |

