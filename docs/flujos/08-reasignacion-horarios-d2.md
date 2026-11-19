# 08 — Reasignación de tutor, cambio de moto, horario y reposición D2

| Campo | Valor |
|---|---|
| ID | FLUJO-08 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente E2E y dictamen de reglas |
| Archivos clave | `AdminReservaDetalle.jsx`, `ModalReasignarInstructor.jsx`, `CambiarHorarioModal.jsx`, `reservaHorarioHelpers.js`, `AdminFinanzas.jsx`, `PagosStaffService.js` |
| Deudas | `B-CROSSCHECK-ADMIN` (CRÍTICO), `B-D2-CONFLICTO-REPOSICION`, `B-ESPEJO-AUDITORIA`, `B-CAMBIO-CANCELADO`, `B-REASSIGN-PAGO-PARCIAL` |

## 1. Objetivo y alcance
Permitir al admin cambiar el tutor, la moto/proveedor, el horario completo o reponer la segunda fecha (D2) de una reserva, dejando rastro en `reprogramaciones`.
No cubre cancelación ni pagos (FLUJO-07) ni la disponibilidad del estudiante (FLUJO-03).

## 2. Actores y rutas
- Solo **admin** (`AdminReservaDetalle`); no hay ruta pública.
- Acciones desde botones del detalle: “Reasignar / Relevo” (`:1073-1087`), “Cambiar proveedor / moto” (`:1102-1115`), “Cambiar Horario” (`:1126-1134`).
- Modales: `ModalReasignarInstructor` y `CambiarHorarioModal` (modos `cambio_total` y `reponer_d2`).

## 3. Reasignación de tutor (`AdminReservaDetalle.reasignarInstructor`, `:276-439`)
### 3.1 Bloqueos previos
- Reserva cancelada (`:282-284`).
- Comisión del instructor ya pagada (`:285-287`).
- Reserva ya compartida (`:288-290`).
- La UI además deshabilita el botón si no hay tutores, está cancelada, pagada o compartida (`:1079-1084`).
### 3.2 Conflicto de horario
- Busca en `reservas` (contexto, máx. 100) otra reserva del tutor destino en las mismas fechas/bloques usando `getHoraIdOcupacion` (`:293-307`).
- Si hay conflicto, **solo advierte y permite continuar** con `window.confirm` (`:308-314`).
- Si hay sesión activa, pide otra confirmación (`:317-327`).
### 3.3 Simple vs split
- `instructorInicioCurso` se infiere de `sesionTotalInicio`, `sesionDiariaInicio`, `moduloEnProgreso`, `tiempoEfectivo > 0`, `pausaActiva` o módulos completados (`:329-340`).
- **Sin inicio:** actualiza `instructorId`, `instructorAnteriorId`, `motivoRelevo`, `reasignadoPor/En`, agrega evento `reasignacion_tutor` y `reprogramacionesCount + 1` (`:351-370`).
- **Con inicio (split):** agrega `instructorOriginalId`, `instructoresInvolucrados` (A y B con porcentajes), `implicadosIds`, `esReservaCompartida: true` y evento con `esSplit` (`:371-420`).
- El porcentaje destino lo valida el modal entre 0 y 100 (`ModalReasignarInstructor.jsx:23-29`, `:142-147`).
### 3.4 Escritura
- Batch atómico: reserva + espejo (`:423-426`).
- El espejo recibe **todos** los campos de auditoría/split y `estadoPago` (`:424`), no solo los campos de ocupación.
- Finanzas consume `esReservaCompartida` + `instructoresInvolucrados[].porcentaje/pagado` (`AdminFinanzas.jsx:53-68`, `PagosStaffService.js:85-88`, `:185-197`).

## 4. Cambio de moto/proveedor (`:442-522`)
- Bloquea cancelada (`:448-450`) y comisión de proveedor pagada (`:451-453`).
- Deriva el proveedor desde la moto destino (`:455-456`).
- Conflicto de moto en las fechas de la reserva; si hay, advierte y permite continuar (`:458-476`).
- Batch: actualiza `motoAsignadaId`, `proveedorId`, IDs anteriores, evento `cambio_moto`, contador y timestamps (`:483-506`).
- Espejo: solo `motoAsignadaId` y `proveedorId` (`:507-510`).

## 5. Cambio de horario y D2 (`cambiarHorario`, `:524-742`)
### 5.1 Modo `reponer_d2` (`:531-632`)
- Requiere `nuevaFecha2`, `horaIdReposicion` y motivo (`:534-536`).
- Solo disponible para cursos de 2 días con D1 pasado o módulos completados (`CambiarHorarioModal.jsx:19-25`).
- D1 (`fecha`, `horaId`) queda **inmutable**; cambia `fecha2`, `horaIdReposicion`, `motoReposicionId` (`:560-567`, `:582-589`).
- Evento `post_inicio_reposicion` con antes/después, motivo, categoría y notas (`:569-580`).
- Espejo: set explícito con D1, D2, instructor, moto, estadoPago y proveedor (`:591-606`).
- Purga locks de D1 y D2 (`:608-613`).
- WhatsApp de reposición (`:617-627`).
### 5.2 Modo `cambio_total` (`:634-742`)
- Requiere `nuevaFecha` y `nuevoHoraId`; `fecha2` se calcula automáticamente para cursos de 2 días (`CambiarHorarioModal.jsx:47-52`).
- Confirmación extra si la reserva está aprobada o hay sesión activa (`:655-676`).
- Evento `pre_inicio_total` con `horarioAnterior`/`horarioNuevo` (`:682-693`).
- Actualiza `fecha`, `fecha2`, `horaId` y **limpia** `horaIdReposicion`/`motoReposicionId` (`:695-710`).
- Espejo: set con **todos** los campos de actualización + `estadoPago` (`:713`), incluida la auditoría.
- Purga locks de las fechas anteriores (`:715-719`).
- WhatsApp de reprogramación (`:723-733`).

## 6. Validaciones del modal (`CambiarHorarioModal.jsx`)
- Calcula bloqueos admin/proveedor y locks activos (`:54-62`, `:124-168`).
- Advierte conflictos de instructor/moto con la ocupación confirmada (`:170-208`).
- **Solo bloquea duro** si el horario está bloqueado por admin o proveedor (`:221-244`); los conflictos de instructor/moto quedan como advertencia y **no impiden confirmar**.
- `verificarDisponibilidadInstructor` compara solo `r.horaId`, no `horaIdReposicion` (`reservaHorarioHelpers.js:41-51`); lo mismo para moto (`:67-78`).
- El modal no cambia instructor; para eso se usa la reasignación.

## 7. Datos y eventos
| Campo | Uso |
|---|---|
| `instructorId`, `instructorAnteriorId`, `instructorOriginalId` | Tutor actual y trazabilidad |
| `instructoresInvolucrados[]` | Split: `id`, `nombre`, `porcentaje`, `pagado`, `pagadoEn` |
| `implicadosIds` | Permite lectura a ambos tutores (regla `reservas.read`) |
| `esReservaCompartida` | Activa lógica de finanzas compartidas |
| `reprogramaciones[]` | Auditoría: `reasignacion_tutor`, `cambio_moto`, `post_inicio_reposicion`, `pre_inicio_total` |
| `reprogramacionesCount`, `ultimaReprogramacion` | Contador y última fecha |
| `fecha2`, `horaIdReposicion`, `motoReposicionId` | D2 |
## 8. Reglas de Firestore
| Operación | Regla |
|---|---|
| `reservas.read` | admin, dueño, instructor o miembro de `implicadosIds` (`firestore.rules:100-105`) |
| `reservas.update` (admin) | cualquier campo (`:135-160`) |
| `reservas.update` (instructor) | solo campos de sesión (`:138-159`) |
| `reservas.update` (dueño) | solo pago/`estudiantePresente` (`:161-183`) |
| `reservas.delete` | denegado (`:186`) |
| `ocupacionConfirmada` | lectura auth; update/delete admin; create dueño (`:69-77`) |
| `reprogramaciones` | sin regla específica; el admin puede reescribir el array |

## 9. Invariantes
- Reasignar no cambia `estadoPago` ni `estadoCurso`.
- En split, los porcentajes de A y B suman 100.
- En D2, `fecha` y `horaId` de D1 no cambian.
- Un cambio total limpia `horaIdReposicion` y `motoReposicionId`.
- Cada acción agrega un evento a `reprogramaciones` y sube el contador.
- El espejo debe reflejar ocupación, no auditoría (hoy se viola en reasignación y cambio total).

## 10. Por qué está diseñado así
- **Flexibilidad operativa:** el admin resuelve ausencias, motos averiadas y reprogramaciones sin cancelar.
- **Split:** si A ya inició, conserva parte de la comisión; B cobra el resto.
- **D2:** permite reponer la segunda sesión sin mover la primera.
- **Auditoría en la reserva:** deja el motivo y el antes/después para disputas y finanzas.
- **Purga de locks:** evita bloqueos fantasma al mover horarios.

## 11. Dependencias críticas
- FLUJO-04 (espejo) para que la ocupación siga siendo correcta.
- FLUJO-03 (locks) y `obtenerLocksDeReserva` para liberar D1/D2.
- FLUJO-07 (pago) porque no se reasigna una cancelada.
- FLUJO-11 (finanzas) para split y comisiones.
- WhatsAppService para notificar reprogramaciones.

## 12. Qué se rompe si se cambia
- **No actualizar el espejo:** doble reserva del mismo tutor/moto.
- **No purgar locks:** horarios bloqueados 10 min.
- **No limpiar D2 en cambio total:** D2 obsoleta contamina disponibilidad (BUG-2/F1).
- **No guardar split:** finanzas paga comisión completa al tutor equivocado.
- **Mover D1 en modo D2:** el alumno pierde la fecha original.
## 13. Costos y cuotas
- Reasignar: 1 batch (reserva + espejo).
- Cambiar moto: 1 batch (reserva + espejo).
- Cambiar horario/D2: 1 batch + `getDocs` de locks + borrados.
- El modal consulta locks y bloqueos admin/proveedor; sin listeners masivos.

## 14. Errores e idempotencia
- Doble clic en reasignar: el modal bloquea con `isSubmitting`, pero el handler no tiene idempotency key; podría duplicar evento/contador.
- Cambio de horario repetido: agrega eventos nuevos; no hay idempotencia.
- `reprogramacionesCount` en reasignación usa `increment(1)` (atómico); en horario usa lectura + 1 (no atómico).
- El batch reserva+espejo es atómico; si falla, no queda a medias.
- `arrayUnion` no deduplica eventos porque cada uno lleva id/timestamp únicos.

## 15. Pruebas
- Reasignar antes de iniciar: verificar comisión completa al nuevo tutor.
- Reasignar después de iniciar: verificar split, `instructoresInvolucrados` y finanzas.
- Cambiar moto: verificar proveedor, espejo y evento.
- Reponer D2: verificar D1 inmutable, D2 nueva, espejo, locks y WhatsApp.
- Cambio total: verificar limpieza de D2, espejo y locks.
- Intentar cambiar horario de una reserva cancelada (hoy la UI lo permite).
- Provocar conflicto D2 con otra reserva que use `horaIdReposicion` y verificar si el modal lo detecta (hoy no).

## 16. Riesgos, hallazgos y deudas
- **`B-CROSSCHECK-ADMIN` (CRÍTICO):** el cambio de horario no tiene cross-check duro; el modal solo advierte conflictos de instructor/moto y el handler confía en el modal. Puede crear doble asignación.
- **`B-D2-CONFLICTO-REPOSICION`:** `verificarDisponibilidadInstructor/Moto` compara solo `r.horaId`, no `horaIdReposicion` (`reservaHorarioHelpers.js:41-78`); los conflictos de D2 pueden pasar desapercibidos.
- **`B-ESPEJO-AUDITORIA`:** reasignación y cambio total escriben `reprogramaciones`, motivos, `instructoresInvolucrados` y notas en `ocupacionConfirmada`, que es legible por cualquier autenticado; además infla el espejo.
- **`B-CAMBIO-CANCELADO`:** el botón “Cambiar Horario” no se deshabilita para canceladas (`:1126-1134`) y el handler no valida `estadoPago === 'Cancelado'`.
- **`B-REPROG-AUDIT-MUTABLE`:** la auditoría vive en la reserva y el admin puede reescribirla; no hay colección de auditoría inmutable.
- **`B-REPROG-COUNT-RACE`:** `reprogramacionesCount` usa lectura + 1 en los cambios de horario.
- **`B-D2-PROVEEDOR` [POR VERIFICAR]:** cambiar `motoReposicionId` no actualiza `proveedorId`; finanzas de proveedor usa `motoAsignadaId`, no la moto de reposición.
- **`B-REASSIGN-PAGO-PARCIAL` [POR VERIFICAR]:** el bloqueo usa `pagadoInstructor` global; si un participante del split ya cobró, la reserva queda compartida y no se reasigna, pero conviene validar el caso.

## 17. Supuestos / por verificar
- [SUPUESTO] El admin revisa las advertencias antes de confirmar.
- [SUPUESTO] `ocupacionConfirmada` está fresca y completa (máx. 100).
- [SUPUESTO] El split solo se usa con porcentajes 0-100 del modal.
- [POR VERIFICAR] Pago de proveedor cuando cambia la moto de reposición.
- [POR VERIFICAR] Reservas con D2 y locks en `motoReposicionId` distinto.

## 18. Contradicciones detectadas
- El modal presenta “conflictos” pero solo bloquea admin/proveedor; instructor/moto son advertencias.
- La auditoría se guarda, pero no es inmutable y se copia al espejo público.
- “Cambiar Horario” está disponible en reservas canceladas, aunque el flujo de negocio dice que no debería.
- El helper de disponibilidad ignora el bloque de reposición, aunque D2 usa `horaIdReposicion`.

## 19. Enlaces
`docs/flujos/03-disponibilidad-locks.md`, `docs/flujos/04-reserva-y-espejo.md`, `docs/flujos/07-aprobacion-rechazo-pagos.md`, `docs/flujos/11-finanzas-movimientos.md`, `firestore.rules`.

## 20. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |


