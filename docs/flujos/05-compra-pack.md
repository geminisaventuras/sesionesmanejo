# 05 — Compra de pack (creación de la maestra y primera sesión)

| Campo | Valor |
|---|---|
| ID | FLUJO-05 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente E2E y dictamen de reglas |
| Archivos clave | `PacksPublicosView.jsx`, `VistaPacks.jsx`, `InscripcionView.jsx`, `ReservaService.crearReservaPack`, `firestore.rules` |
| Deudas | `B-PACK-RULES-OWNER` (CRÍTICO), `B-PACK-RULES-CHILD` (CRÍTICO), `B-PACK-PRECIOS-CLIENTE` (CRÍTICO), `B-PACK-PRECIO-TEORICOS`, `B-PACK-DOBLE-COMPRA` |

## 1. Objetivo y alcance
Comprar un pack de sesiones: elegir pack, prellenar datos, separar el horario de la primera sesión (Equilibrio), registrar el pago manual y crear la maestra `reservasPack` + la primera child `pack_sub`.
No cubre la aprobación del pago (FLUJO-07) ni el agendamiento de cursos siguientes (FLUJO-06).

## 2. Actores y rutas
- **Público:** `/packs` (`PacksPublicosView`), CTA “Quiero este Pack”.
- **Estudiante logueado:** pestaña Servicios (`VistaPacks`), CTA “Comprar este Pack”.
- Ambos navegan a `/inscripcion` con `state: { esPack: true, packId, origen }` (`PacksPublicosView.jsx:226-239`, `VistaPacks.jsx:74-81`).
- `InscripcionView` detecta el modo pack por `location.state` o `sessionStorage` con TTL de 4 h (`InscripcionView.jsx:346-378`).

## 3. Bloqueo de pack activo
- Un usuario no puede tener más de un **pack de sesiones** activo; los packs solo teóricos (`cursoIds` vacío) sí se permiten en N.
- Se valida en tres lugares con el mismo criterio (`estadoPago Aprobado|Pendiente`, `estado activo|undefined`, `packSnapshot.cursoIds.length > 0`):
  - `PacksPublicosView.jsx:41-62`
  - `VistaPacks.jsx:18-43`
  - `ReservaService.crearReservaPack` (`:401-417`)
- La validación del servicio es **previa a la transacción** y **fail-open** si falla la consulta (`:418-421`).

## 4. Prellenado y precio
- `InscripcionView` exige al menos dos cursos: Equilibrio (`cursoIds[0]`) y Básico (`cursoIds[1]`); si falta, aborta (`:747-757`).
- Resetea el formulario para no heredar fecha/lock del flujo individual (`:761-764`).
- Precarga datos personales desde `usuarios/{uid}` y fija el curso inicial en Equilibrio (`:770-813`).
- Precio mostrado:
  - Base = suma de `precioBase` de los cursos del pack + teóricos si `sumarTeoricosAlPrecio` (`:962-976`).
  - Descuento = porcentaje o monto fijo (`:978-983`).
  - Total = `max(0, base - descuento)` (`:985-988`).
- El total se convierte a VES con la tasa de cobro (`:1001-1002`) y se envía como `pagoTotalVES` (`:1082-1083`).

## 5. Creación (`ReservaService.crearReservaPack`, `:385-683`)
1. Valida `packData`, `lockId`, `packId`, sesión y coincidencia de `userId` (`:386-399`).
2. Valida pack activo (ver §3).
3. **BUG-2:** cross-check de ocupación antes de la transacción (`:423-434`).
4. Abre transacción (`:447`):
   - Lee el pack y exige `activo === true` (`:449-456`).
   - Lee el lock; exige que exista y que no sea de otro usuario vigente (`:458-468`).
   - Resuelve los cursos desde `packData.cursoSnapshot` (no lee `cursos` en la transacción) (`:470-482`).
   - Calcula el precio **desde el backend**: suma bases del snapshot, aplica descuento del pack (`:482-487`).
   - Prorratea el primer curso (Equilibrio) sobre el total (`:489-494`).
   - Calcula comisiones completas y déficit absorbido por el negocio (`:496-500`).
   - Congela vencimiento: `vencimientoDias` o 60 por defecto (`:502-505`).
   - Construye `subReservas`: índice 0 `activo`, resto `bloqueado` (`:507-513`).
5. Escribe la **maestra** (`:515-567`):
   - `packSnapshot` con cursos, sedes, teóricos, descuento y vencimiento.
   - `sedesPermitidasPorCurso` (mapa curso → sedes).
   - Precios congelados, `fechaCompra`, `vencimiento`, `estado: 'activo'`, `estadoPago: 'Pendiente'`, `cursoActual: 0`, `cursoReservaId`.
   - Datos de pago y `subReservas`.
6. Escribe la **child** (`:570-642`):
   - `tipoReserva: 'pack_sub'`, `packReservaId`, `packCursoIndex: 0`.
   - `estadoPago: 'Pendiente'`, `estadoCurso: 'Pendiente'`.
   - `pagoTotalMoneda` = precio prorrateado; `precioBaseOriginal`, `descuentoAplicado`, comisiones y déficit.
   - `pin` del comprador y aceptación de términos.
7. Escribe el **espejo** solo para la child (`:644-659`).
8. Purga lock temporal y legacy (`:661-663`).
## 6. Modelo de datos
| Documento | Campos clave |
|---|---|
| `reservasPack/{id}` (maestra) | `userId`, `packId`, `packSnapshot`, `precioBaseCongelado`, `descuentoCongelado`, `precioTotalCongelado`, `fechaCompra`, `vencimiento`, `estado`, `estadoPago`, `cursoActual`, `cursoReservaId`, `subReservas`, `pagoTotalMoneda`, `pagoTotalVES` |
| `reservas/{child}` | `tipoReserva: 'pack_sub'`, `packReservaId`, `packCursoIndex`, `estadoPago`, `estadoCurso`, `precio`, comisiones, `pin`, datos personales |
| `ocupacionConfirmada/{child}` | espejo de la primera sesión, `estadoPago: 'Pendiente'` |

## 7. Estados
| Entidad | Al comprar | Tras aprobar pago | Al completar curso | Pack completo |
|---|---|---|---|---|
| Maestra | `estado: activo`, `estadoPago: Pendiente`, `cursoActual: 0` | `estadoPago: Aprobado` | siguiente `subReserva` activa, `cursoActual + 1` | `estado: completado` |
| Child 0 | `estadoPago: Pendiente`, `estadoCurso: Pendiente` | `Aprobado` | `estadoCurso: Aprobado` | — |
| Espejo | `Pendiente` | `Aprobado` | — | — |

## 8. Reglas de Firestore
| Operación | Regla |
|---|---|
| `packs` | lectura pública; escritura admin (`:225`) |
| `reservasPack` read | admin, dueño o instructor de la child actual (`:227-235`) |
| `reservasPack` create | auth, `userId` propio, `estado activo`, `cursoActual 0`, `subReservas` lista no vacía, `precioTotalCongelado > 0` (`:236-242`) |
| `reservasPack` update | **admin o dueño sin restricción de campos**, o instructor con solo `subReservas/cursoActual/estado` (`:243-251`) |
| `reservasPack` delete | denegado (`:252`) |
| `reservas` create `pack_sub` | auth, `userId` propio, `precio > 0`, `estadoPago` `Pendiente` **o `Aprobado`**, dueño del pack y sede permitida (`:107-133`) |
| `reservas` update | admin; instructor con campos de sesión; dueño solo pago/`estudiantePresente` (`:135-184`) |
| `ocupacionConfirmada` create | admin o dueño de la reserva (`:69-77`) |

## 9. Invariantes
- Un solo pack de sesiones activo por usuario (no garantizado por reglas ni transacción).
- El precio y el descuento quedan **congelados** en la maestra al comprar.
- Solo la primera `subReserva` nace `activo`; el resto `bloqueado`.
- La child inicial nace `Pendiente`; no se puede agendar hasta que el admin apruebe el pago.
- La maestra no se borra (`delete: false`).
- Los accesos teóricos no se crean al comprar; se crean al aprobar (FLUJO-07).

## 10. Por qué está diseñado así
- **Pago manual:** el pack nace `Pendiente` y el admin valida la referencia.
- **Precio congelado:** evita que cambios de catálogo alteren packs ya vendidos.
- **Prorrateo:** cada child lleva el ingreso que le corresponde para comisiones y métricas.
- **Snapshot:** permite validar sedes/teóricos y reconstruir el pack sin joins.
## 11. Dependencias críticas
- FLUJO-03 (lock) y BUG-2 (cross-check) para separar el horario.
- FLUJO-04 (espejo) para bloquear la primera sesión.
- FLUJO-07 (pago) para aprobar/rechazar/cancelar.
- FLUJO-06 (agendamiento) para los cursos siguientes.
- `cursos.precioBase`, `comisiones`, `sedesPermitidas` y `packs` como configuración.

## 12. Qué se rompe si se cambia
- **Quitar el snapshot:** el pack deja de ser reproducible y se rompen sedes/teóricos.
- **No prorratear:** comisiones y métricas por curso quedan infladas.
- **No purgar locks:** quedan horarios bloqueados 10 min.
- **Permitir agendar sin pago aprobado:** se regala el pack.
- **Cambiar el criterio de pack activo en un solo lugar:** se duplican packs.

## 13. Costos y cuotas
- Compra: 2 lecturas previas (reservasPack + pack) + transacción con 2 lecturas + 3 escrituras + 2 borrados.
- Sin listeners en el servicio; `PacksPublicosView` y `VistaPacks` sí usan `onSnapshot`/`getDocs`.
- La creación de accesos teóricos ocurre en la aprobación, no aquí.

## 14. Errores e idempotencia
- `pack-sesiones-activo`: ya hay un pack activo.
- `slot-occupied` / `ocupacion-no-verificable`: cross-check BUG-2.
- `transaction-failed`: pack inexistente/inactivo, lock perdido o de otro usuario.
- Reintentar la compra tras un fallo de red puede duplicar la maestra si el primer intento sí commiteó y el cliente no recibió respuesta; no hay idempotency key.
- El chequeo de pack activo es fail-open y no transaccional.

## 15. Pruebas
- Compra pública y desde panel; verificar maestra + child + espejo.
- Verificar `subReservas` (0 activo, resto bloqueado), vencimiento y precios congelados.
- Intentar comprar dos packs de sesiones; verificar bloqueo.
- Simular lock perdido, lock de otro usuario y pack inactivo.
- Verificar que el pack nace `Pendiente` y no se puede agendar.
- Revisar permisos: un usuario no puede crear un pack para otro.

## 16. Riesgos, hallazgos y deudas
- **`B-PACK-RULES-OWNER` (CRÍTICO):** la regla de update de `reservasPack` permite al dueño cambiar **cualquier** campo, incluidos `estadoPago`, `precioTotalCongelado`, `vencimiento` y `estado`. Un estudiante podría autoaprobar su pack o alterar el precio desde el cliente.
- **`B-PACK-RULES-CHILD` (CRÍTICO):** la creación de child `pack_sub` permite `estadoPago: 'Aprobado'` sin verificar que la maestra esté aprobada; un cliente podría crear una child “pagada” y su espejo.
- **`B-PACK-PRECIOS-CLIENTE` (CRÍTICO):** el backend calcula precios/comisiones desde `cursoSnapshot` enviado por el cliente; las reglas solo exigen `precio > 0`. No hay verificación contra el catálogo.
- **`B-PACK-PRECIO-TEORICOS`:** la UI suma los teóricos si `sumarTeoricosAlPrecio`, pero `crearReservaPack` calcula el precio solo con `pack.cursoIds`; `pagoTotalMoneda` queda menor que el mostrado, mientras `pagoTotalVES` sí incluye teóricos.
- **`B-PACK-DOBLE-COMPRA`:** el chequeo de pack activo es previo a la transacción y fail-open; dos pestañas concurrentes pueden crear dos packs.
- **`B-PACK-CREATEDAT`:** `createdAt` está duplicado en la maestra (`:562` y `:564`) y en la child (`:620` y `:633`); gana la última clave (maestra con reloj de cliente, child con `serverTimestamp`).
- [POR VERIFICAR] ¿El pack aprobado registra movimiento de ingreso? En `aprobarReservaPack` no se crea (ver FLUJO-07).

## 17. Supuestos / por verificar
- [SUPUESTO] El pack siempre tiene al menos 2 cursos y el primero es Equilibrio.
- [SUPUESTO] El cliente envía `cursoSnapshot` fiel al catálogo.
- [POR VERIFICAR] Impacto real de `sumarTeoricosAlPrecio` en producción.
- [POR VERIFICAR] Si existe algún pack legacy sin `packSnapshot`.

## 18. Contradicciones detectadas
- Se documenta el precio del pack como “congelado”, pero la regla permite al dueño reescribirlo.
- La UI muestra un total con teóricos; el backend guarda otro sin ellos.
- El bloqueo de pack activo se presenta como regla de negocio, pero es fail-open y no atómico.

## 19. Enlaces
`docs/flujos/06-agendamiento-pack.md`, `docs/flujos/07-aprobacion-rechazo-pagos.md`, `docs/flujos/04-reserva-y-espejo.md`, `firestore.rules`.

## 20. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |


