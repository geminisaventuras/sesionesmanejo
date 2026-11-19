# 02 — Reinscripción y recuperación de progreso

| Campo | Valor |
|---|---|
| ID | FLUJO-02 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente prueba E2E en DEV y revisión FIRE/MAMBA |
| Archivos clave | `InscripcionView.jsx`, `ReservaService.js`, `AuthService.js`, `firestore.rules` |
| Deudas | `R-PIN-PII-19NOV` (ADR-001), `B123`, `B-REGISTRO-REDESIGN` |

## 1. Objetivo y alcance
Permitir que un estudiante que **abandonó la inscripción** retome su progreso sin volver a registrarse.
El escenario clave: la cuenta se creó al final del Paso 1, pero el usuario **no conoce el PIN** hasta después de pagar.

## 2. Escenarios de recuperación

### A. Misma pestaña / recarga (sessionStorage)
- El PIN se guarda en `sessionStorage` (`inscripcion_generatedPin`) al crearse la cuenta (`InscripcionView.jsx:452-458`).
- Si existe, no se consulta Firestore (`:453-457`).

### B. Sesión iniciada (misma cuenta, nueva pestaña)
- Efecto de montaje (`InscripcionView.jsx:451-479`): `buscarProgresoPorCorreo(form.correo || ctx.fbUser.email)` (`:463`).
- Restaura el PIN (`:474-479`), valida cédula (`:467-473`) y el paso guardado.

### C. Correo ya registrado al enviar el Paso 1
- `AuthService.crearEstudiante` devuelve `already-enrolled` (`AuthService.js:102-103`).
- `InscripcionView.jsx:1475-1522` lee el progreso por correo (`:1477`), hace **auto-login** con el PIN guardado (`:1480`), valida cédula (`:1499-1507`) y restaura el paso (`:1512`).

### D. Chequeo pre-login
- Si no hay sesión (`InscripcionView.jsx:1538`), lee el progreso por correo (`:1540`) y redirige a `/login` si existe (`:1542-1544`).

### E. Adopción de huérfanos (A6)
- `guardarProgreso` adopta un doc con `userId` distinto cuando el correo coincide y el PIN está vacío; registra el cambio en consola (`ReservaService.js:138-146`).
- La regla permite `update`/`delete` si `correo == token.email` y `pin == ''` (`firestore.rules:207-214`).

## 3. Colecciones y reglas
| Elemento | Detalle |
|---|---|
| Doc | `progresoInscripcion/{correo.replace(/[@.]/g,'_')}` (`ReservaService.js:126-128`) |
| Contenido | `userId`, `correo`, `pin`, `paso`, `datosFormulario` (PII) |
| Regla get | `allow get: if true` (`firestore.rules:203`) |
| Regla create/update | dueño o correo + PIN vacío (`:205-210`) |
| Regla delete | dueño o correo + PIN vacío (`:211-214`) |
| `list` | denegado (`:204`) |

## 4. Invariantes
- La cédula ingresada debe coincidir con la guardada; si no, se bloquea y se cierra sesión.
- El correo es la clave de recuperación; el PIN es la credencial de auto-login.
- Un doc huérfano solo se adopta si el PIN está vacío.
- El progreso se limpia al completar la reserva (`limpiarProgreso`, `ReservaService.js:191-200`).

## 5. Por qué está diseñado así
`BITACORA_EXPERIENCIAL.md:334` documenta que:
- FIRE rechazó usar `query` porque las reglas bloquean `list`.
- `fetchSignInMethodsForEmail` no resultó viable en Plan Spark.
- Se optó por `getDoc` directo con ID de correo sanitizado + `allow get: if true` para sostener B154.
El objetivo era que un usuario que perdió la sesión pudiera retomar su inscripción sin conocer el PIN.

## 6. Dependencias críticas
- Depende del PIN guardado y del `get: true` del progreso.
- Alimenta al FLUJO-01 (restauración del paso y de los datos).
- Si se rediseña el registro, este flujo cambia por completo.

## 7. Qué se rompe si se cambia
- **Cerrar `get: true`:** los escenarios C y D fallan; el usuario queda en “correo ya registrado” sin auto-login ni aviso.
- **Dejar de guardar el PIN:** se rompe el auto-login C; el usuario no tiene PIN hasta el pago.
- **Cambiar el ID del doc:** se rompe `buscarProgresoPorCorreo` y la adopción E.
- **Quitar la validación de cédula:** riesgo de secuestro de progreso de otra persona con el mismo correo.
- **Cambiar el PIN (`updatePassword`):** el PIN guardado queda obsoleto y el auto-login falla (`AuthService.js:144-156`). Ya es un bug latente del diseño.

## 8. Seguridad y riesgo aceptado
- `R-PIN-PII-19NOV` (ADR-001): quien conozca el correo puede leer PII + PIN y tomar la cuenta.
- `list: false` impide enumerar; el ataque es dirigido.
- La adopción de huérfanos por email sin `email_verified` es un vector adicional.
- Decisión vigente: no cambiar hasta el rediseño del registro.

## 9. Errores y mensajes
| Caso | Comportamiento actual |
|---|---|
| Correo existe y PIN coincide | Auto-login y restauración del paso |
| Correo existe y PIN no coincide | “Tu correo ya está registrado pero el PIN no coincide. Contacta al administrador.” (`:1516`) |
| Sin progreso | “Este correo ya está registrado. Si olvidaste tu PIN, contacta al administrador.” (`:1519`) |
| Cédula no coincide | Bloqueo + logout (`:1501-1506`) |
| Doc huérfano con PIN vacío | Adopción (A6) |

## 10. Costos
- 1 `getDoc` por búsqueda de progreso (sin listeners).
- No hay índices ni queries.

## 11. Pruebas
- Nuevo usuario → progreso creado.
- Abandono y retorno en la misma pestaña (sessionStorage).
- Abandono y retorno en nueva pestaña/sesión (efecto de montaje).
- Intento con correo existente (C).
- Chequeo pre-login (D).
- Adopción de huérfano (E).
- Cambio de PIN y posterior auto-login (debe fallar: bug conocido).

## 12. Deudas
`B123` (recuperación de PIN olvidado), `B-REGISTRO-REDESIGN` (rediseño futuro), `R-PIN-PII-19NOV`.

## 13. Supuestos / por verificar
- [POR VERIFICAR] Porcentaje real de usuarios que abandonan antes del pago.
- [SUPUESTO] El usuario conserva acceso al correo declarado.

## 14. Contradicciones detectadas
- `ARRANQUE_MEMORIA_IA.md:228`: “PIN mostrado tras Paso 1”. El código muestra el PIN **solo después del pago** (`InscripcionView.jsx:1699-1710`); `ModalPIN` no se renderiza. Esa nota está desactualizada.

## 15. Enlaces
`docs/flujos/01-inscripcion-individual.md`, `docs/decisiones/ADR-001-riesgo-pin-pii-aceptado.md`, `BITACORA_EXPERIENCIAL.md:334`, `BACKLOG_V2.md:271`.

## 16. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |
