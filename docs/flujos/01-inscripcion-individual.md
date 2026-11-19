# 01 — Inscripción individual

| Campo | Valor |
|---|---|
| ID | FLUJO-01 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente prueba E2E en DEV y revisión FIRE/MAMBA |
| Archivos clave | `InscripcionView.jsx`, `AuthService.js`, `ReservaService.js`, `LockService.js`, `useOcupacionConfirmada.js`, `useDisponibilidad.js`, `useInscripcionState.js` |
| Deudas | `R-PIN-PII-19NOV` (ADR-001), `B123`, `B-AUTOJUMP-REDISENO` |

## 1. Objetivo y alcance
Registrar a un estudiante nuevo, separar horario, cobrar y crear la reserva + espejo de ocupación.
**Fuera de alcance:** recompra, packs (FLUJO-05/06), aprobación de pago (FLUJO-07), aula (FLUJO-09).

## 2. Actores y disparadores
- Estudiante desde `/inscripcion` (o desde una página pública de cursos que precarga el curso).
- El sistema crea una **shadow account** al final del Paso 1, sin que el usuario lo perciba como registro.

## 3. Precondiciones
- Catálogos cargados: sedes, horarios, cursos, instructores, motos, configuración.
- Curso con `instructoresPermitidos` configurado (fail-closed si está vacío).
- Reglas Firestore desplegadas (`locks`, `ocupacionTemporal`, `reservas`, `progresoInscripcion`).

## 4. Secuencia paso a paso
1. **Paso 1 — Datos personales.** Formulario en `InscripcionView.jsx` + estado en `useInscripcionState.js:13-82`.
2. **Creación de cuenta (final del Paso 1).** `InscripcionView.jsx:1452` → `AuthService.crearEstudiante` (`AuthService.js:47-108`):
   - Genera PIN de 6 dígitos con `crypto.getRandomValues` (`AuthService.js:53-55`).
   - `createUserWithEmailAndPassword(correo, pin)` (`:59`).
   - Verifica cédula duplicada **después** de crear la cuenta; si existe, hace rollback con `user.delete()` (`:63-77`).
   - Registra `cedulasRegistradas` y guarda el progreso con PIN (`:80-96`).
3. **Paso 2 — Configuración.** Curso, sede, tipo de moto, `traeMoto`; filtro de instructores por `instructoresPermitidos`.
4. **Paso 3 — Horario.** Disponibilidad desde el espejo + locks (`useOcupacionConfirmada.js:71-204`, `useDisponibilidad.js`). Al elegir bloque se crea el lock (`LockService.js:9-41`) con ID `fecha_horaId_instructorId_motoId|sinmoto` (`InscripcionView.jsx:1339`).
   - Duración 10 min con margen de 10 s (`LockService.js:5-6`); una sola renovación (`:43-61`); liberación (`:64-78`).
5. **Paso 4 — Pago.** Datos de pago, captcha y términos. Al confirmar (`InscripcionView.jsx` ~1005-1194):
   - Cross-check BUG-2 antes de la transacción (`ReservaService.js:272-284`; `solapamientoHelpers.js`; `ocupacionRepository.js`). Fail-closed.
   - Transacción: crea reserva `estadoPago: 'Pendiente'` (`ReservaService.js:206+`), escribe el espejo `ocupacionConfirmada` (`:352-366`) y borra `locks` + `ocupacionTemporal`.
6. **Éxito.** `setMostrarPantallaExito(true)` (`InscripcionView.jsx:1183`) y render del PIN (`:1699-1710`). Envío de correo con PIN (`EmailService.enviarCorreoBienvenida`).

## 5. Colecciones y campos
| Colección | Campos relevantes | Escritura |
|---|---|---|
| `progresoInscripcion/{correoSanitizado}` | `userId`, `correo`, `pin`, `paso`, `datosFormulario` (PII), `createdAt`, `updatedAt` | create/update/delete |
| `reservas/{id}` | `userId`, `cursoId`, `fecha`, `fecha2`, `horaId`, `instructorId`, `motoAsignadaId`, `traeMoto`, `estadoPago`, `pin` | create |
| `ocupacionConfirmada/{reservaId}` | `userId`, `fecha`, `fecha2`, `horaId`, `instructorId`, `motoAsignadaId`, `traeMoto`, `estadoPago`, `sedeId` | create (misma transacción) |
| `locks/{lockId}` y `ocupacionTemporal/{lockId}` | `userId`, `fecha`, `horaId`, `instructorId`, `motoAsignadaId`, `expiresAt` | create/update/delete |
| `cedulasRegistradas/{cedula}` | `userId`, `correo`, `createdAt` | create |

## 6. Estados
| Entidad | Estado | Pasa a |
|---|---|---|
| Lock | activo | expirado / renovado / liberado / consumido |
| Reserva | `Pendiente` | `Aprobado` / `Rechazado` / `Cancelado` (FLUJO-07) |
| Espejo | `Pendiente` | `Aprobado` / se borra al cancelar |

## 7. Invariantes
- Una cuenta por correo; una cédula por estudiante (rollback si duplicada).
- La cuenta se crea al final del Paso 1; el usuario **no sabe** que se registró.
- El PIN **solo se muestra después del pago**; `ModalPIN` existe pero no se renderiza.
- Sin lock válido no se crea reserva (servicio + reglas de `locks`).
- Reserva y espejo se escriben en la misma transacción; el lock se borra atómicamente.
- Cross-check BUG-2: fail-closed; libera el lock si detecta conflicto.

## 8. Por qué está diseñado así
- Shadow accounts para evitar doble registro y permitir continuidad (documentado en ARRANQUE).
- `get: true` en el progreso y PIN guardado para recuperar inscripciones abandonadas (ver FLUJO-02 y `BITACORA_EXPERIENCIAL.md:334`).
- Sin Cloud Functions (Plan Spark): las reglas permiten escrituras directas y las invariantes viven en el servicio.

## 9. Dependencias críticas
- FLUJO-02 (recuperación) depende del PIN guardado y de `get: true`.
- FLUJO-03 (disponibilidad/locks) alimenta el Paso 3.
- FLUJO-04 (reserva/espejo) consume la transacción final.
- FLUJO-07 (pagos) cambia el estado del espejo.

## 10. Qué se rompe si se cambia
- **Cerrar `get` de `progresoInscripcion`:** se pierde el aviso pre-login y el auto-login de abandono (el usuario no conoce su PIN).
- **Dejar de guardar el PIN:** se pierde la recuperación automática; el usuario queda sin PIN hasta el pago.
- **Cambiar el ID del doc:** se rompe `buscarProgresoPorCorreo` y la adopción de huérfanos.
- **Mostrar el PIN antes:** cambia la UX y el flujo documentado; no hacerlo sin ADR.
- **Quitar el lock o el espejo:** rompe la ocupación y el cross-check.

## 11. Seguridad
- Riesgo aceptado `R-PIN-PII-19NOV`: lectura anónima de PII/PIN conociendo el correo (ADR-001).
- El PIN también se escribe en `reservas.pin` (campo muerto, legible por instructor).
- `list: false` evita enumeración; el ataque requiere conocer el correo.

## 12. Costos y cuotas
- Listeners de espejo (2 queries por fecha) y de locks (1) en el Paso 3.
- Cross-check BUG-2: 2 queries al espejo + 1 a `ocupacionTemporal` por submit.
- Escrituras de la transacción: reserva + espejo + borrado de 2 locks.

## 13. Errores y recuperación
- Correo ya registrado → FLUJO-02.
- Cédula duplicada → rollback y mensaje.
- Lock expirado → modal de expiración y reintentos (máx. 3).
- `slot-occupied` (BUG-2) → libera lock, resetea estado y pide elegir otro bloque.
- `ocupacion-no-verificable` → fail-closed, mantiene el lock para reintentar.

## 14. Pruebas
- Positivas: inscripción nueva completa; un día y dos días; con y sin moto.
- Negativas: correo existente, cédula duplicada, lock expirado, conflicto de ocupación.
- Seguridad: `get` anónimo a progreso (riesgo aceptado); creación directa de reserva sin lock (pendiente de reglas).

## 15. Riesgos y deudas
`R-PIN-PII-19NOV` (ADR-001), `B123` (recuperación de PIN), `B-AUTOJUMP-REDISENO`, `B-CROSSCHECK-ADMIN`.

## 16. Supuestos / por verificar
- [POR VERIFICAR] Conteo exacto de lecturas por inscripción en producción.
- [POR VERIFICAR] Comportamiento en WebViews (Instagram/WhatsApp) del flujo de pago.
- [SUPUESTO] Los usuarios conservan acceso al correo declarado.

## 17. Contradicciones detectadas
- `ARRANQUE_MEMORIA_IA.md:228` afirma “PIN mostrado tras Paso 1”; el código demuestra que **solo se muestra después del pago** (`InscripcionView.jsx:1699-1710`) y que `ModalPIN` no se renderiza.

## 18. Enlaces
`docs/flujos/02-reinscripcion-recuperacion.md`, `docs/decisiones/ADR-001-riesgo-pin-pii-aceptado.md`, `BITACORA_EXPERIENCIAL.md:334`.

## 19. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |

