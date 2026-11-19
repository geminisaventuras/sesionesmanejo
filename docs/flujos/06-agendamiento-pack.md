# 06 — Agendamiento de pack (cursos siguientes y avance)

| Campo | Valor |
|---|---|
| ID | FLUJO-06 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente E2E y dictamen de reglas |
| Archivos clave | `PackDetalleEstudiante.jsx`, `AgendarPackView.jsx`, `useDisponibilidadPack.js`, `ReservaService.agendarSiguienteCursoPack`, `ReservaService.avanzarPackTrasCompletarCurso`, `useSessionTimer.js` |
| Deudas | `B-PACK-RULES-OWNER` (CRÍTICO), `B-PACK-RULES-CHILD` (CRÍTICO), `B-PACK-PRECIOS-CLIENTE` (CRÍTICO), `B-PACK-AVANCE-FIRE-AND-FORGET` |

## 1. Objetivo y alcance
Agendar cada curso siguiente de un pack ya pagado, separar el horario con lock y avanzar la maestra al completar la sesión.
No cubre la compra (FLUJO-05) ni la aprobación del pago inicial (FLUJO-07).

## 2. Actores y rutas
- **Estudiante:** `/mi-pack/:packReservaId` (detalle) y `/mi-pack/:packReservaId/agendar` (`App.jsx:107-116`, ambos `allowedRoles=['estudiante']`).
- El detalle muestra progreso, vencimiento y CTA “Agendar fecha” si la subReserva actual no tiene `reservaId` (`PackDetalleEstudiante.jsx:144-163`, `:332-338`).
- Si el pack está `Rechazado`, el detalle redirige a `/corregir-pago/pack/:id` (`:73-77`).

## 3. Carga y guards (`AgendarPackView.jsx:85-146`)
- `getDoc` de la maestra; exige dueño (`:95-97`).
- Allowlist de `estadoPago === 'Aprobado'`; mensajes para Pendiente/Rechazado/Cancelado (`:99-110`).
- Exige `estado === 'activo'` (`:114-116`) y no vencido (`:117-120`).
- La subReserva actual debe existir y **no** tener `reservaId` (`:122-125`).
- Copia datos personales de la primera child con reserva (`:127-134`).
- Escucha locks de la fecha (`:154-161`) y usa `useOcupacionConfirmada` para la ocupación real (`:70-82`).

## 4. Disponibilidad
- Deriva el curso actual desde `subReservas[pack.cursoActual]` (`:176-180`).
- Sedes válidas = intersección `sedesPermitidasPorCurso[curso] ∩ packSnapshot.sedesPermitidas` (`:182-200`); auto-fallback a la primera válida (`:205-218`).
- `tipoMoto` se deriva del curso (SSOT `tiposMotoEscuela`) o del básico del pack (`:227-259`).
- `useDisponibilidadPack` replica la lógica de inscripción:
  - Filtra instructores por `curso.instructoresPermitidos`; **array vacío/ausente = todos permitidos** (fail-open) (`useDisponibilidadPack.js:43-50`).
  - Excluye locks de otros y vencidos (`:52-57`).
  - Considera instructor ocupado por reserva `Pendiente/Aprobado` o lock (`:61-73`).
  - Exige moto si el curso la incluye; devuelve `RESERVADO` o `EN_ESPERA_PAGO` (`:180-198`).
  - Calcula 30 días desde hoy (`:8`, `:207-228`).
- **Auto-jump desactivado:** el efecto que saltaba a la primera fecha libre está neutralizado con `if (true) return;` (`AgendarPackView.jsx:298-325`, línea `:302`).

## 5. Lock
- Al elegir bloque: revalida bloqueos admin (`:378-388`), instructor (`:390-400`) y moto (`:401-405`).
- ID determinista: `fecha_hora_instructor_moto` (`:414`); crea lock de 10 min (`:415-428`).
- Cambiar fecha o sede libera el lock previo (`:327-363`).
- Si el servicio devuelve `slot-occupied`, limpia el estado local del horario (`:496-504`).

## 6. Confirmación (`ReservaService.agendarSiguienteCursoPack`, `:693-951`)
1. Valida `packReservaId`, sesión y lock (`:694-704`).
2. **BUG-2:** cross-check de ocupación antes de la transacción (`:712-723`).
3. Transacción (`:728-935`):
   - Maestra existe, es del usuario, `estado activo`, `estadoPago Aprobado`, no vencida (`:730-750`).
   - `subReservas[cursoActual]` existe, `activo` y sin `reservaId` (`:752-764`).
   - El curso enviado coincide con `subActual.cursoId` (`:766-770`).
   - Lock existe y no es de otro usuario vigente (`:772-782`).
   - Prorratea el precio del curso sobre `precioBaseCongelado`/`precioTotalCongelado` (`:784-791`).
   - Comisiones completas y déficit absorbido (`:793-797`).
   - `traeMoto` según SSOT del curso (`:799-806`).
   - Valida intersección de sedes curso ∩ pack y elige sede (`:808-829`).
4. Escribe la child (`:831-898`):
   - `tipoReserva: 'pack_sub'`, `packCursoIndex: cursoActual`, `packReservaId`.
   - `estadoPago: 'Aprobado'` (**ya pagó el pack**), `estadoCurso: 'Pendiente'`.
   - Precio prorrateado, comisiones, `pin: null`, términos aceptados.
5. Actualiza la maestra: `subReservas[cursoActual].reservaId` y `cursoReservaId` (`:902-911`).
6. Escribe el espejo con `estadoPago: 'Aprobado'` (`:913-928`).
## 7. Avance al completar el curso (`ReservaService.avanzarPackTrasCompletarCurso`, `:1411-1500`)
- Se dispara en fire-and-forget al completar todos los módulos (`useSessionTimer.js:399-409`) o al completar manualmente (`:560-570`).
- Guards de idempotencia:
  - Maestra `estadoPago === 'Aprobado'` (`:1423-1429`).
  - `cursoActual` coincide con el índice recibido (`:1431-1435`).
  - La subReserva apunta a la child recibida (`:1437-1442`).
  - La subReserva no está ya `completado` (`:1444-1448`).
- Exige que la child tenga `estadoCurso === 'Aprobado'` (`:1450-1458`).
- Si el pack venció, lo marca `vencido` y no avanza (`:1460-1466`).
- Marca la subReserva actual `completado`:
  - Si es la última → maestra `estado: 'completado'` (`:1475-1483`).
  - Si no → activa la siguiente y `cursoActual + 1` (`:1486-1497`).
- El fallo solo se registra en consola; no hay reintento ni compensación.

## 8. Modelo de datos y estados
| Documento | Campos que cambian |
|---|---|
| `reservasPack` | `subReservas[i].reservaId/estado`, `cursoActual`, `cursoReservaId`, `estado` |
| `reservas/{child}` | `packCursoIndex`, `estadoPago: Aprobado`, `estadoCurso`, `precio`, comisiones |
| `ocupacionConfirmada/{child}` | espejo `Aprobado` de la sesión agendada |
| `locks` / `ocupacionTemporal` | se borran al confirmar |

| Estado de subReserva | Significado |
|---|---|
| `bloqueado` | Curso futuro, no agendable |
| `activo` | Curso actual, agendable si no tiene `reservaId` |
| `completado` | Curso terminado; habilita el siguiente |

## 9. Reglas de Firestore
| Operación | Regla |
|---|---|
| `reservasPack` update | admin o **dueño sin restricción de campos**; instructor solo `subReservas/cursoActual/estado` (`firestore.rules:243-251`) |
| `reservas` create `pack_sub` | dueño del pack, `precio > 0`, `estadoPago` `Pendiente` o **`Aprobado`**, sede permitida (`:107-133`); **no valida que la maestra esté aprobada** |
| `reservas` update | instructor con campos de sesión; dueño solo pago/`estudiantePresente` (`:135-184`) |
| `ocupacionConfirmada` create | admin o dueño de la reserva (`:69-77`) |
| `reservasPack` delete | denegado (`:252`) |

## 10. Invariantes
- Solo el curso actual (`subReservas[cursoActual]`) puede agendarse.
- El curso actual debe estar `activo` y sin `reservaId`.
- El pack debe estar `Aprobado`, `activo` y no vencido para agendar.
- La child de pack nace `Aprobado` (el pack ya se pagó) y `estadoCurso: Pendiente`.
- Al completar, se activa exactamente el siguiente curso; el último completa el pack.
- El lock se purga al confirmar y al liberar/cambiar fecha o sede.

## 11. Por qué está diseñado así
- **Pago único:** el pack se paga completo al comprar; los cursos siguientes no vuelven a pasar por caja.
- **Secuencialidad:** `subReservas` impide saltar cursos y mantiene el orden pedagógico (Equilibrio → Básico).
- **Prorrateo:** distribuye ingresos/comisiones por curso sin cobrar de nuevo.
- **Avance automático:** al completar la sesión, el alumno puede agendar la siguiente sin intervención admin.
## 12. Dependencias críticas
- FLUJO-03 (disponibilidad/locks) y FLUJO-04 (espejo) para separar el horario.
- FLUJO-05 (compra) crea la maestra y la primera child.
- FLUJO-07 (pago) debe aprobar el pack antes de agendar.
- `useSessionTimer` dispara el avance; sin él, el pack queda en el curso actual.
- `cursos`, `horarios`, `instructores`, `motos`, `sedes` y bloqueos admin/proveedor.

## 13. Qué se rompe si se cambia
- **Permitir agendar una subReserva no activa:** se saltan cursos.
- **No validar `reservaId`:** se agenda dos veces el mismo curso.
- **No validar vencimiento:** se usan packs vencidos.
- **No actualizar `cursoReservaId`:** el instructor pierde acceso a la maestra.
- **No avanzar la maestra al completar:** el alumno queda bloqueado.
- **Cambiar el ID del lock:** se pierde la exclusión mutua.

## 14. Costos y cuotas
- Agendar: 1 `getDoc` de maestra + 1 child anterior + transacción con 2 lecturas + 3 escrituras + 2 borrados.
- Disponibilidad: cálculo en memoria sobre `reservasConfirmadas` (máx. 100), locks y bloqueos.
- Avance: 2 `getDoc` + 1 `updateDoc`; fire-and-forget.
- `PackDetalleEstudiante` mantiene 2 `onSnapshot` (maestra + child actual).

## 15. Errores e idempotencia
- `slot-occupied`: el servicio libera el lock y la vista limpia el horario (`AgendarPackView.jsx:496-504`).
- `El curso actual no está disponible`: subReserva no activa.
- `Este curso ya tiene una fecha agendada`: `reservaId` presente.
- `El pack no tiene el pago aprobado`: pack Pendiente/Rechazado.
- `El pack está vencido`: no agenda; `avanzarPack` lo marca `vencido`.
- `avanzarPack` es idempotente por `cursoActual` + child + estado `completado`, pero no transaccional.
- Dos pestañas agendando el mismo curso: la transacción y `reservaId` deberían impedir la segunda; la primera gana.

## 16. Pruebas
- Agendar el curso actual y verificar child + maestra + espejo + purga de locks.
- Intentar agendar sin pago aprobado, con pack vencido y con subReserva ya agendada.
- Completar el curso y verificar `subReservas` (actual `completado`, siguiente `activo`, `cursoActual + 1`).
- Completar el último curso y verificar `estado: completado`.
- Simular fallo de `avanzarPack` y verificar que el pack queda bloqueado (sin reintento).
- Revisar permisos: dueño no debería poder cambiar `estadoPago` ni precios (hoy puede).

## 17. Riesgos, hallazgos y deudas
- **`B-PACK-RULES-OWNER` (CRÍTICO):** el dueño puede actualizar cualquier campo de `reservasPack`, incluidos `estadoPago`, `precioTotalCongelado`, `vencimiento` y `estado` (`firestore.rules:243-251`). Puede autoaprobar el pack sin pagar.
- **`B-PACK-RULES-CHILD` (CRÍTICO):** la child `pack_sub` puede nacer `Aprobado` sin que la maestra esté aprobada (`:107-133`); un cliente podría crear una sesión “pagada” y su espejo.
- **`B-PACK-PRECIOS-CLIENTE` (CRÍTICO):** precios/comisiones se calculan desde `cursoSnapshot` del cliente, no desde el catálogo; las reglas solo exigen `precio > 0`.
- **`B-PACK-AVANCE-FIRE-AND-FORGET`:** si `avanzarPackTrasCompletarCurso` falla, no hay reintento; el pack queda en el curso actual y el alumno no puede agendar el siguiente.
- **Auto-jump desactivado:** `AgendarPackView.jsx:302` corta el salto automático a la primera fecha libre; el usuario debe elegir fecha manualmente.
- **`instructoresPermitidos` fail-open:** en packs, array vacío/ausente = todos permitidos (`useDisponibilidadPack.js:43-50`); en individual es fail-closed (`InscripcionView.jsx:105-109`).
- `useOcupacionConfirmada` limita a 100 documentos (deuda `B-ESPACIO-LIMITE-100`).
- [POR VERIFICAR] ¿La maestra se actualiza si el instructor completa la sesión y el alumno no está conectado? Depende de quién ejecute `useSessionTimer`.

## 18. Supuestos / por verificar
- [SUPUESTO] El instructor o el alumno completa los módulos y dispara el avance.
- [SUPUESTO] El curso actual siempre es el primero no completado.
- [POR VERIFICAR] Packs legacy sin `sedesPermitidasPorCurso`.
- [POR VERIFICAR] Comportamiento si el pack vence durante una sesión en curso.

## 19. Contradicciones detectadas
- El avance se describe como automático, pero es fire-and-forget y puede fallar silenciosamente.
- La regla de `reservasPack` permite al dueño reescribir el estado de pago, contradiciendo el flujo de aprobación admin.
- La UI bloquea agendar sin pago aprobado, pero las reglas permiten crear una child `Aprobado` directamente.

## 20. Enlaces
`docs/flujos/05-compra-pack.md`, `docs/flujos/07-aprobacion-rechazo-pagos.md`, `docs/flujos/03-disponibilidad-locks.md`, `docs/flujos/04-reserva-y-espejo.md`, `firestore.rules`.

## 21. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |


