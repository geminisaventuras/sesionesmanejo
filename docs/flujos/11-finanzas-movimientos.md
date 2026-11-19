# 11 — Finanzas y movimientos

| Campo | Valor |
|---|---|
| ID | FLUJO-11 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente auditoría con datos reales |
| Archivos clave | `AdminFinanzas.jsx`, `PagosStaffService.js`, `FirestoreProvider.js`, `StaffFinanzasView.jsx`, `ModalRegistrarPago.jsx`, `TabCuentaPorCobrar.jsx`, `FinanzasTab.jsx`, `firestore.rules` |
| Deudas | `B-FINANZAS-CAMPOS-LEGACY` (CRÍTICO), `B-MOVIMIENTOS-USERID`, `B-MOVIMIENTOS-RULE`, `B-PAGOS-MONTO-LIBRE`, `B-PAGOS-PROVEEDOR-LEGACY` |

## 1. Objetivo y alcance
Registrar ingresos, calcular comisiones/deudas, pagar a instructores y proveedores, y mostrar el ledger al admin y al staff.
No cubre la validación del pago del estudiante (FLUJO-07) ni el cálculo de precios (FLUJO-01/05).

## 2. Actores y rutas
- **Admin:** `/admin/finanzas` (`AdminFinanzas`) y `/admin/finanzas/staff/:id` (`StaffFinanzasView`).
- **Instructor:** pestaña Finanzas de su panel (`FinanzasTab`).
- **Proveedor:** panel de proveedor (`ProveedorPanel`), deuda por `config.pagoProveedor`.

## 3. Ingresos y movimientos
| Fuente | Dónde se registra | Tipo |
|---|---|---|
| Reserva individual aprobada | `AdminReservaDetalle.jsx:169-173` | `ingreso` por `pagoTotalMoneda` |
| Pack aprobado | `AdminPackDetalle.jsx:111-130` | `ingreso` por base - descuento |
| Acceso teórico aprobado | `AdminAccesoTeoricoDetalle.jsx:84-98` | `ingreso` con ID determinístico `mov_acc_{id}` |
| Pago a staff | `AdminFinanzas.jsx:109-115` | `egreso` por comisión |

- `saveMovimiento` agrega `userId` del usuario autenticado y escribe en `movimientos` (`FirestoreProvider.js:154-157`).
- **No es atómico:** el movimiento se registra después de aprobar/pagar; si falla, la operación principal queda hecha (ver FLUJO-07).
- En packs, el movimiento se calcula como `precioBaseCongelado - descuento` con fallback a `precioTotalCongelado` (`AdminPackDetalle.jsx:117-127`).
- En teóricos, el ID determinístico evita duplicados al reintentar (`AdminAccesoTeoricoDetalle.jsx:87-95`).

## 4. Cálculo de comisiones y deudas
### 4.1 Instructor (`AdminFinanzas.jsx:50-75`)
- Solo reservas `estadoPago === 'Aprobado'`.
- **Split:** busca al instructor en `instructoresInvolucrados`; si no está o ya tiene `pagado: true`, no genera deuda; aplica `comisionInstructor * porcentaje / 100` (`:53-72`).
- **Legacy:** exige `r.instructorId === instructor` y `!pagadoInstructor`; deuda = `comisionInstructor` (`:60-73`).
### 4.2 Proveedor (`AdminFinanzas.jsx:76`)
- Filtra reservas aprobadas, no pagadas, cuya moto (`motoAsignadaId`) pertenece al proveedor.
- Deuda = `config.pagoProveedor` **por reserva**, no `comisionProveedor`.
### 4.3 Tarjetas de resumen (`AdminFinanzas.jsx:45-49`)
- `gananciaNeta = ingresos - (pagoInstructor + pagoProveedor)`.
- `deudas = pagoInstructor + pagoProveedor` de reservas no pagadas.
- **`pagoInstructor` y `pagoProveedor` no se escriben en las reservas** al crearlas (solo existen como configuración); las tarjetas quedan en 0/ingresos completos. Las listas detalladas sí usan `comisionInstructor`/`config.pagoProveedor`.

## 5. Pago a instructores (`PagosStaffService.crearPago`, `:30-221`)
1. Valida `tipoStaff`, `staffId` y `reservaIds` (`:46-57`).
2. Transacción: lee cada reserva (`:71-81`).
3. Valida ownership y que no esté pagada:
   - Split: el instructor debe estar en `instructoresInvolucrados` y no tener `pagado: true` (`:90-116`).
   - Legacy: `instructorId` debe coincidir y `pagadoInstructor` debe ser falso (`:98-121`).
4. Crea `pagosStaff/{id}` con `montoTotal`, método, referencia, banco, notas, `pagadoPor`, `detalles[]` (snapshot de cada reserva con comisión y porcentaje) (`:124-178`).
5. Marca las reservas:
   - Split: actualiza el participante; si todos pagaron, escribe también `pagadoInstructor` (`:184-203`).
   - Legacy: `pagadoInstructor`, `pagadoInstructorEn`, `pagoInstructorId` (`:204-210`).
6. Todo dentro de una transacción (`:71-212`).

## 6. Pago a proveedores
- **Ruta legacy (`AdminFinanzas.jsx:101-107`):** recorre las reservas, marca `pagadoProveedor: true` una por una con `saveReserva` y luego crea un solo `movimiento` de egreso (`:109-115`). No crea `pagosStaff` ni snapshot de detalles; no es atómico.
- **Ruta con modal (`StaffFinanzasView` + `ModalRegistrarPago`):** usa `PagosStaffService.crearPago` con `tipoStaff: 'proveedor'`, método, referencia y banco (`ModalRegistrarPago.jsx:70-85`).
- Ambas rutas pueden coexistir; la legacy no deja ledger por reserva.

## 7. Ledger y consultas
- `pagosStaff` guarda `tipoStaff`, `staffId`, `reservaIds`, `montoTotal`, moneda, método, referencia, banco, notas, `pagadoPor`, fecha, `detalles`, tasa y monto VES (`PagosStaffService.js:159-178`).
- `obtenerPagosPorStaff` filtra por `staffId`, ordena por fecha y limita a 100 (`:227-255`); el tipo se filtra en memoria.
- `obtenerPagosPorReserva` usa `array-contains` sobre `reservaIds` (`:260-278`).
- `StaffFinanzasView` muestra pendientes, colaboraciones (`implicadosIds`) y pagos (`:105-181`).
- `TabCuentaPorCobrar` permite seleccionar reservas y calcula el total con split (`:63-79`).
## 8. Modelo de datos
| Colección | Campos clave |
|---|---|
| `movimientos` | `id`, `tipo` (`ingreso`/`egreso`), `monto`, `desc`, `fecha`, `userId`, `referenciaId/Tipo` |
| `pagosStaff` | `tipoStaff`, `staffId`, `staffNombre`, `reservaIds[]`, `montoTotal`, `moneda`, `metodoPago`, `referencia`, `banco`, `notas`, `pagadoPor`, `fecha`, `timestamp`, `detalles[]`, `montoTotalVES`, `tasaAplicada` |
| `reservas` (flags) | `pagadoInstructor`, `pagadoInstructorEn`, `pagoInstructorId`; `pagadoProveedor`, `pagadoProveedorEn`, `pagoProveedorId`; `instructoresInvolucrados[].pagado/pagadoEn/pagoId` |
| `reservas` (comisiones) | `comisionInstructor`, `comisionProveedor`, `esReservaCompartida`, `instructoresInvolucrados[].porcentaje` |

## 9. Reglas de Firestore
| Operación | Regla |
|---|---|
| `movimientos.read` | admin o dueño del `userId` (`firestore.rules:189-193`) |
| `movimientos.create` | cualquier auth con `userId` propio (`:191`) |
| `movimientos.update/delete` | denegado (`:192`) |
| `pagosStaff.read` | admin o `staffId` propio (`:216-219`) |
| `pagosStaff.create` | solo admin (`:220`) |
| `pagosStaff.update/delete` | denegado (`:220`) |
| `reservas.update` | admin cualquiera; instructor sesión; dueño pago (`:135-184`) |
| `configuraciones` | lectura auth; escritura admin (`:81`) |

## 10. Invariantes
- Solo reservas `Aprobado` generan deuda.
- En split, cada participante se paga por separado; el flag global se activa cuando todos cobraron.
- Una reserva no debe pagarse dos veces al mismo staff (el servicio lo valida).
- `pagosStaff` y `movimientos` son inmutables (sin update/delete).
- El monto pagado debería coincidir con la suma de `detalles[].comision` (no se valida).
- Las tarjetas de resumen deberían usar las mismas comisiones que las listas (hoy no).

## 11. Por qué está diseñado así
- **Pago manual:** el admin paga por efectivo/transferencia y registra método/referencia.
- **Ledger inmutable:** `pagosStaff` conserva el snapshot de comisiones para auditoría.
- **Split:** permite pagar a A y B por separado sin duplicar la reserva.
- **Movimientos:** alimentan el historial y la ganancia neta.
- **Flags en la reserva:** evitan pagar dos veces y permiten filtrar pendientes.

## 12. Dependencias críticas
- FLUJO-07 (aprobación) genera las reservas aprobadas y el primer movimiento.
- FLUJO-08 (split) llena `instructoresInvolucrados`.
- FLUJO-05/06 (packs) prorratean comisiones por child.
- FLUJO-12 (teóricos) registra ingresos con ID determinístico.
## 13. Qué se rompe si se cambia
- **Cambiar `comisionInstructor`/`comisionProveedor`:** deudas y pagos quedan mal.
- **No respetar `instructoresInvolucrados`:** se paga dos veces o a quien no trabajó.
- **Quitar los flags de pagado:** se duplican pagos.
- **Usar solo `movimientos` como fuente:** no refleja deudas ni split.
- **Pasar el pago de proveedor a legacy sin ledger:** se pierde la trazabilidad.
- **No validar `montoTotal`:** se paga de más o de menos.

## 14. Costos y cuotas
- `PagosStaffService.crearPago`: transacción con N lecturas + 1 escritura de pago + N updates.
- `AdminFinanzas` proveedor legacy: N `saveReserva` + 1 movimiento, sin transacción.
- `FirestoreProvider` carga todos los `movimientos` para admin (`:48`) y todas las reservas del contexto.
- `obtenerPagosPorStaff` limita a 100 pagos (`:227-237`).

## 15. Errores e idempotencia
- Pago doble: el servicio lanza “ya está marcada como pagada” (`PagosStaffService.js:109-121`).
- Pago de una reserva ajena: lanza “no pertenece al instructor/proveedor” (`:90-107`).
- `pagosStaff` es inmutable; no se puede corregir un pago, solo registrar otro.
- Si falla el `movimiento` después del pago, el pago queda hecho y el egreso no se registra.
- IDs de movimiento con `Date.now()` pueden colisionar si dos operaciones caen en el mismo milisegundo.
- El pago legacy de proveedor puede quedar parcial si falla una de las N reservas.

## 16. Pruebas
- Aprobar reserva individual/pack/teórico y verificar movimiento, monto y `userId`.
- Pagar instructor legacy y split; verificar flags y `pagosStaff.detalles`.
- Intentar pagar dos veces la misma reserva; verificar rechazo.
- Pagar proveedor por la ruta legacy y por el modal; comparar ledger.
- Alterar `montoTotal` y verificar que no se reconcilia con `detalles`.
- Comparar tarjetas de resumen con las listas de deudas.
- Verificar que el staff solo ve sus propios pagos (`pagosStaff.read`).

## 17. Riesgos, hallazgos y deudas
- **`B-FINANZAS-CAMPOS-LEGACY` (CRÍTICO):** `gananciaNeta` y `deudas` usan `pagoInstructor`/`pagoProveedor` (`AdminFinanzas.jsx:48-49`), campos que las reservas no escriben; las tarjetas muestran deuda 0 y ganancia = ingresos, mientras las listas usan `comisionInstructor`/`config.pagoProveedor`. Es una inconsistencia financiera visible.
- **`B-MOVIMIENTOS-USERID`:** `saveMovimiento` sobrescribe el `userId` recibido con el uid del admin (`FirestoreProvider.js:154-157`); se pierde la atribución al estudiante/pack. Los `movimientos` quedan a nombre del admin.
- **`B-MOVIMIENTOS-RULE`:** `movimientos.create` permite a cualquier autenticado crear movimientos propios (`firestore.rules:191`); no es admin-only. Puede contaminar el ledger.
- **`B-PAGOS-MONTO-LIBRE`:** `crearPago` acepta `montoTotal` sin compararlo con la suma de `detalles[].comision` (`PagosStaffService.js:127-178`); un error de UI o un cliente manipulado puede pagar de más/menos.
- **`B-PAGOS-PROVEEDOR-LEGACY`:** el pago a proveedores desde `AdminFinanzas` no usa `pagosStaff`, no es atómico y no deja snapshot (`AdminFinanzas.jsx:101-115`); el modal sí. Dos caminos con garantías distintas.
- **`B-MOVIMIENTOS-ID`:** IDs `Date.now().toString()` en aprobaciones y pagos (`AdminReservaDetalle.jsx:171`, `AdminFinanzas.jsx:110`); colisión posible. El acceso teórico usa ID determinístico y es el patrón correcto.
- **`B-FINANZAS-PROVEEDOR-CONFIG`:** la deuda de proveedor usa `config.pagoProveedor` por reserva (`AdminFinanzas.jsx:76`), pero `pagosStaff.detalles` usa `comisionProveedor` (`PagosStaffService.js:129`); si difieren, deuda y pago no cuadran.
- **`B-PAGOS-PROVEEDOR-OWNERSHIP`:** si la reserva no tiene `proveedorId`, el servicio no valida ownership (`PagosStaffService.js:103-107`); cualquier proveedor podría cobrarla.
- **`B-FINANZAS-PROVEEDOR-MOTO-PROPIA` [POR VERIFICAR]:** la deuda de proveedor se basa en `motoAsignadaId`; si hay datos inconsistentes con `traeMoto: 'Sí'`, podría pagarse una moto no usada.
- **`B-MOVIMIENTOS-ATOMICOS`:** ya registrado en FLUJO-07; aplica también a packs, teóricos y egresos.

## 18. Supuestos / por verificar
- [SUPUESTO] El admin paga exactamente la deuda calculada.
- [SUPUESTO] `config.pagoProveedor` es la tarifa real del proveedor.
- [SUPUESTO] `pagoInstructor`/`pagoProveedor` eran campos legacy que debían poblarse; hoy no se escriben.
- [POR VERIFICAR] Montos reales de las tarjetas vs listas en PROD.
- [POR VERIFICAR] Pagos de proveedor hechos por la ruta legacy sin `pagosStaff`.

## 19. Contradicciones detectadas
- Las tarjetas de resumen y las listas de deudas usan campos distintos.
- El pago a proveedores tiene dos flujos con garantías distintas.
- `saveMovimiento` recibe `userId` del estudiante pero lo reemplaza por el del admin.
- `montoTotal` se presenta como monto del pago, pero no se reconcilia con el detalle.

## 20. Enlaces
`docs/flujos/05-compra-pack.md`, `docs/flujos/06-agendamiento-pack.md`, `docs/flujos/07-aprobacion-rechazo-pagos.md`, `docs/flujos/08-reasignacion-horarios-d2.md`, `docs/flujos/12-teoricos.md`, `firestore.rules`.

## 21. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |


