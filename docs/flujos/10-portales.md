# 10 — Portales (estudiante / instructor / proveedor)

| Campo | Valor |
|---|---|
| ID | FLUJO-10 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente E2E por rol |
| Archivos clave | `EstudiantePanel.jsx`, `InstructorPanel.jsx`, `useReservasInstructor.js`, `ProveedorPanel.jsx`, `PerfilTab.jsx`, `DisponibilidadTab.jsx`, `firestore.rules` |
| Deudas | `B-INSTRUCTOR-PERFIL-RULES` (CRÍTICO), `B-PROVEEDOR-MIRROR-PAGOS` (CRÍTICO), `B-INSTRUCTOR-SPLIT-VISIBILIDAD` |

## 1. Objetivo y alcance
Describir qué ve y qué puede hacer cada rol en su panel: estudiante, instructor y proveedor.
No cubre el aula (FLUJO-09), finanzas detalladas (FLUJO-11) ni administración (FLUJO-08).

## 2. Rutas y guards
| Ruta | Componente | Rol permitido |
|---|---|---|
| `/portal-reservas` | `EstudiantePanel` | `estudiante` (`App.jsx:102-106`) |
| `/instructor` | `InstructorPanel` | `instructor` (`:124-128`) |
| `/proveedor` | `ProveedorPanel` | `proveedor` (`:236-240`) |
| `/aula/:reservaId` | `AulaVirtualView` | `instructor`, `estudiante` (FLUJO-09) |

- `ProtectedRoute` exige `user` y `allowedRoles.includes(user.role)`; si no, redirige a `/login` o `/` (`App.jsx:55-70`).
- No hay ruta de panel para `admin`; el admin usa `/dashboard` y `/admin/*`.
- `InstructorPanel` se importa de forma eager (`App.jsx:7`), el resto es lazy.

## 3. Portal del estudiante (`EstudiantePanel.jsx`)
### 3.1 Datos
- `onSnapshot` de sus reservas por `userId` (`:76-94`).
- `getDocs` de `reservasPack` por `userId`, con recarga al cambiar `updatedAt` del SSOT o al aparecer una child nueva (`:96-129`, `:167-189`).
- `reservaActual` prioriza una **Rechazada** para mostrar el CTA de corrección; luego pendientes y completadas (`:131-163`).
- `modoCorreccion` restringe las pestañas a `miCurso` y `perfil` (`:307-313`, `:323`, `:349-360`).
### 3.2 Navegación
- Tabs principales: `inicio`, `servicios`, `historial`, `perfil`; sub-tabs: `miCurso`, `cursos`, `formacion`, `retos`, `packs` (`:330-361`).
- `?tab=` permite abrir una pestaña directa (`:49-58`).
- Render por tab (`:919-946`): `VistaInicio`, `VistaServicios`, `VistaHistorial`, `VistaPerfil`, `VistaMiCurso`, `VistaCursos`, `VistaFormacion`, `VistaPacks`.
### 3.3 Acciones
- Ver sesión actual, materiales y progreso.
- Corregir pago rechazado (`/corregir-pago/reserva/:id` o `/pack/:id`) (`:422-465`).
- Ver packs, agendar siguiente curso (`VistaPacks`, `PackDetalleEstudiante`).
- Cambiar PIN desde Perfil: valida 6 dígitos y usa `AuthService.updatePassword` (`:859-882`); puede fallar por `recent-login`.

## 4. Portal del instructor (`InstructorPanel.jsx`)
### 4.1 Datos
- `useReservasInstructor(uid)` consulta `reservas` por `instructorId`, ordena por fecha y limita a 100 (`useReservasInstructor.js:31-37`).
- `reservasActivas` excluye canceladas y rechazadas (`:61-66`).
- `ErrorBoundary` + estado de error con reintento (`InstructorPanel.jsx:84-101`).
### 4.2 Navegación
- Tabs: `inicio`, `disponibilidad`, `finanzas`, `perfil` (`:70-81`).
- Inicio tiene sub-vistas `resumen`, `pendientes`, `historial` (`:29-30`, `:103-140`).
- “Iniciar clase” navega a `/aula/:id` (`:47-49`).
- El botón de iniciar en el modal exige pago aprobado, curso no aprobado y fecha de hoy (`:164-168`).
### 4.3 Disponibilidad
- `DisponibilidadTab` escucha `bloqueosInstructores` por `instructorId` y estado `activo` (`:21-50`).
- Cancelar un bloqueo es un soft-delete (`estado: 'cancelado'`) con `updateDoc` (`:57-68`).
- Crear bloqueo usa `ModalBloqueoInstructor` y la colección `bloqueosInstructores`.
- Reglas: el instructor puede crear/actualizar sus propios bloqueos (`firestore.rules:406-420`).
### 4.4 Perfil
- `PerfilTab` valida con Zod y guarda con `saveInstructor({ ...user.data, ...perfil })` (`PerfilTab.jsx:16-47`).
- `saveInstructor` escribe en `instructores/{id}` (`FirestoreProvider.js:89`).
- **Regla actual:** `instructores` solo permite escritura a admin (`firestore.rules:85`); el guardado del instructor falla con `permission-denied`.
### 4.5 Finanzas
- `FinanzasTab` carga `pagosStaff` por `staffId` y muestra comisiones/pagos (`FinanzasTab.jsx:96-111`).
## 5. Portal del proveedor (`ProveedorPanel.jsx`)
- `onSnapshot` de `ocupacionConfirmada` por `proveedorId`, límite 500 (`:16-56`).
- `misMotos` = motos del contexto con `proveedorId === uid` (`:59-63`).
- `misReservas` = espejo filtrado por `proveedorId` (`:66-69`).
- Ganancias: `pagadoProveedor === true` para cobrado y `!pagadoProveedor` para por cobrar, usando `config.pagoProveedor` (`:71-77`).
- Tabs: `inicio`, `motos`, `calendario`, `actividad` (`:128-137`).
- `ProveedorMotos` administra sus motos (regla permite create/update al proveedor dueño, `firestore.rules:87-95`).
- `ProveedorCalendario` lee el espejo y crea/elimina `bloqueosGlobales` del proveedor (`ProveedorCalendario.jsx:25-36`, `:70-92`; regla `:391-404`).
- `ProveedorActividad` consulta el espejo por `proveedorId` (`ProveedorActividad.jsx:14-33`).

## 6. Fuentes de datos por rol
| Rol | Fuente | Límite |
|---|---|---|
| Estudiante | `reservas` propias (`onSnapshot`), `reservasPack` propias (`getDocs`) | Sin límite explícito |
| Instructor | `reservas` por `instructorId` (`onSnapshot`) | 100 |
| Instructor | `pagosStaff` por `staffId` | 100 |
| Instructor | `bloqueosInstructores` propios | Sin límite |
| Proveedor | `ocupacionConfirmada` por `proveedorId` | 500 |
| Proveedor | `bloqueosGlobales` propios | Sin límite |
| Admin | `reservas` globales | 100 |

## 7. Reglas de Firestore
| Operación | Regla |
|---|---|
| `reservas.read` | dueño, instructor asignado, `implicadosIds` o admin (`firestore.rules:100-105`) |
| `reservasPack.read` | dueño, admin o instructor de la child actual (`:227-235`) |
| `pagosStaff.read` | admin o `staffId` propio (`:216-219`) |
| `instructores` | lectura auth; **escritura solo admin** (`:85`) |
| `proveedores` | lectura auth; escritura admin (`:85`) |
| `motos` | proveedor dueño puede create/update; delete admin (`:87-95`) |
| `bloqueosInstructores` | instructor dueño create/update; delete admin (`:406-420`) |
| `bloqueosGlobales` | proveedor dueño create/update/delete (`:391-404`) |
| `ocupacionConfirmada.read` | cualquier autenticado (`:70`) |

## 8. Invariantes
- Cada rol solo entra a su panel por `ProtectedRoute`.
- El estudiante solo ve sus reservas y packs.
- El instructor ve sus reservas; las colaboraciones solo aparecen en Finanzas.
- El proveedor solo ve el espejo de sus motos, no la reserva privada.
- El perfil del instructor debería poder guardarse (hoy la regla lo impide).
- El proveedor debería ver cobrado/pendiente real (hoy el espejo no trae esos flags).

## 9. Por qué está diseñado así
- **Separación por rol:** cada panel muestra solo lo necesario.
- **Tiempo real:** el estudiante ve cambios de pago; el proveedor ve ocupación.
- **Espejo para proveedor:** evita exponer datos personales de la reserva.
- **Límites:** reducen lecturas en Plan Spark.
- **Perfil y disponibilidad:** el instructor gestiona su operación sin admin.

## 10. Dependencias críticas
- `AuthProvider`/`AppContext` para `user.role` y `uid`.
- FLUJO-04 (espejo) para el portal del proveedor.
- FLUJO-07 (pagos) para el estado que ve el estudiante.
- FLUJO-08 (split) para las colaboraciones del instructor.
- FLUJO-11 (finanzas) para `pagosStaff`.
- FLUJO-09 (aula) para “Iniciar clase”.

## 11. Qué se rompe si se cambia
- **Cambiar `ProtectedRoute`:** se cruzan roles.
- **Quitar el filtro por `userId`/`instructorId`/`proveedorId`:** fuga de datos.
- **Cambiar el espejo:** el proveedor deja de ver ocupación o pagos.
- **Abrir escritura de `instructores` sin restricción:** cualquier instructor podría editar a otro.
- **Quitar límites:** se disparan las lecturas.

## 12. Costos y cuotas
- Estudiante: 1 listener de reservas propias + 1 `getDocs` de packs + 2 listeners de maestra/child en el detalle de pack.
- Instructor: 1 listener de reservas (100) + 1 consulta de pagos (100) + listener de bloqueos.
- Proveedor: 1 listener del espejo (500) + `getDocs` de actividad + listener de bloqueos.
## 13. Errores e idempotencia
- `ProtectedRoute` redirige a `/login` si no hay usuario y a `/` si el rol no coincide (`App.jsx:66-68`).
- Guardar perfil de instructor devuelve `permission-denied` por la regla de `instructores`; la UI muestra “Error al guardar perfil” (`PerfilTab.jsx:36-44`).
- Si el espejo no tiene `pagadoProveedor`/`estadoCurso`, el proveedor ve datos incompletos sin error.
- Los listeners con límite truncan historial silenciosamente.
- El portal no reintenta escrituras fallidas (perfil, bloqueos); solo muestra toast.

## 14. Pruebas
- Login con cada rol y acceso directo a rutas ajenas.
- Estudiante: reserva rechazada → modo corrección; pack; cambio de PIN.
- Instructor: guardar perfil (hoy falla), crear/cancelar bloqueo, ver clase y entrar al aula.
- Instructor colaborador (split): ver si la clase aparece en resumen/pendientes/historial.
- Proveedor: cobrado/por cobrar/completadas vs reservas reales y `pagosStaff`.
- Proveedor: crear/eliminar bloqueo y verlo en el calendario.
- Verificar límites 100/500 con datos históricos.

## 15. Riesgos, hallazgos y deudas
- **`B-INSTRUCTOR-PERFIL-RULES` (CRÍTICO):** `PerfilTab` guarda en `instructores` (`FirestoreProvider.js:89`), pero la regla solo permite escritura a admin (`firestore.rules:85`). El instructor no puede editar su perfil; el botón siempre falla.
- **`B-PROVEEDOR-MIRROR-PAGOS` (CRÍTICO):** `ProveedorPanel` calcula cobrado/por cobrar y completadas desde `ocupacionConfirmada` (`:71-77`), pero el espejo no escribe `pagadoProveedor` ni `estadoCurso` (ver FLUJO-04). Resultado: cobrado 0, todo “por cobrar” y completadas 0.
- **`B-INSTRUCTOR-SPLIT-VISIBILIDAD`:** `useReservasInstructor` filtra por `instructorId` (`:31-37`), así que el colaborador de un split no ve la clase en resumen/pendientes/historial; solo `FinanzasTab` consulta `implicadosIds` (`FinanzasTab.jsx:113-120`).
- **`B-PORTAL-LIMITS`:** instructor 100 reservas, proveedor 500 espejos; el historial se trunca sin aviso.
- **`B-ESTUDIANTE-CTX-RESERVAS`:** `reservaContext` usa `ctx.reservas` (`EstudiantePanel.jsx:191-199`), pero el contexto solo carga reservas para admin (`FirestoreProvider.js:96-98`); el fallback es inútil para estudiantes.
- **`B-PROVEEDOR-MIRROR-STALE`:** el espejo no refleja el cierre de sesión ni el pago al proveedor; el portal queda desactualizado hasta que el admin toque la reserva.
- **`B-PORTAL-EAGER`:** `InstructorPanel` se importa eager (`App.jsx:7`); el resto es lazy.
- **`B-PROVEEDOR-BLOQUEOS`:** `addDoc`/`deleteDoc` de bloqueos no captura errores; un fallo de regla queda como promesa rechazada.
- **R-PIN-PII (ADR-001):** el cambio de PIN desde Perfil usa la contraseña de Firebase; el riesgo ya está aceptado.

## 16. Supuestos / por verificar
- [SUPUESTO] `user.role` y `user.data` están hidratados antes de renderizar el panel.
- [SUPUESTO] El espejo es la única fuente que el proveedor puede leer.
- [SUPUESTO] El perfil del instructor está pensado para autogestión; si es admin-only, la UI sobra.
- [POR VERIFICAR] Datos reales de cobrado/por cobrar en el portal del proveedor.
- [POR VERIFICAR] Reservas de colaborador visibles en el panel del instructor.

## 17. Contradicciones detectadas
- La UI permite editar el perfil del instructor, pero las reglas lo prohíben.
- El portal del proveedor muestra cobros/completadas, pero el espejo no tiene esos campos.
- Finanzas del instructor ve colaboraciones; el resumen/historial no.
- El estudiante tiene un fallback a `ctx.reservas` que nunca se llena para su rol.

## 18. Enlaces
`docs/flujos/04-reserva-y-espejo.md`, `docs/flujos/07-aprobacion-rechazo-pagos.md`, `docs/flujos/08-reasignacion-horarios-d2.md`, `docs/flujos/09-aula-virtual-sesiones.md`, `docs/flujos/11-finanzas-movimientos.md`, `firestore.rules`.

## 19. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |


