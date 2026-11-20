# ⚠️ REGLA: Este archivo es de solo ADICIÓN. NUNCA se reemplaza. Cada sesión agrega al final.
# BACKLOG_V2.md – MotoEscuela App v1.1.0
## Deuda Técnica y Mejoras Pendientes
**Clasificación:** `[CRÍTICO]` / `[ALTA]` / `[MEDIA]` / `[BAJA]`

### 🔴 Críticos
- **[CRÍTICO] B17** – Reservas pendientes no aparecen en el dashboard administrativo.
- **[CRÍTICO] B51** – Botón "Registrar Instructor" no funciona.
- **[CRÍTICO] B62** – Usuario no puede corregir datos personales si retrocede al paso 1 (error "ya inscrito").

### 🟡 Alta
- **[ALTA] B14** – Recargar el dashboard redirige al Home (no restaura sesión).
- **[ALTA] B15** – Barra inferior del dashboard se desplaza al cambiar de pestaña.
- **[ALTA] B27** – Recargar la página durante el registro borra los datos del formulario.
- **[ALTA] B28** – Sin feedback visual al seleccionar horario (spinner).
- **[ALTA] B32** – Texto de "No sabe bicicleta" genera scroll indeseado.
- **[ALTA] B34** – Reducir padding en pantalla de pago (paso 4).
- **[ALTA] B35** – Agrupar Teléfono y Cédula en una fila (paso 4).
- **[ALTA] B38** – Rediseñar desglose de precio.
- **[ALTA] B39** – Completar lista de bancos venezolanos.
- **[ALTA] B42a** – Contador visible de tiempo del lock con renovación única.
- **[ALTA] B43** – Mensaje específico de "Tiempo expirado" para el lock.
- **[ALTA] B46** – Al recargar, no se reconstruye el rol de usuario en el contexto.
- **[ALTA] B50** – Bloqueo del Portal del Estudiante no expira correctamente.
- **[ALTA] B53** – Parpadeo rojo en botón de horario al seleccionar.
- **[ALTA] B58** – Cierre de sesión automático del estudiante tras 5 minutos de inactividad.
- **[ALTA] B60** – Panel del estudiante redirige al login de admin al recargar.
- **[ALTA] B63** – Asignar instructores a cursos específicos (no solo sedes).
- **[ALTA] B64** – Validación de bloques vencidos por hora (TIEMPO AGOTADO).
- **[ALTA] B65** – Compactar tarjetas del paso 4 (precio, desglose, datos escuela).
- **[ALTA] B67** – Agregar opción `prestamoMoto` en CRUD de cursos (administrador).

### 🟢 Media
- **[MEDIA] B16** – Vibración/parpadeo de elementos al tocar.
- **[MEDIA] B20** – Panel de Configuración del Sistema (nombre, logo, colores).
- **[MEDIA] B47** – Temblor en inputs (font-size 16px, ring en vez de outline).
- **[MEDIA] B54** – Estudiante ya inscrito no puede volver a registrarse desde el formulario público.
- **[MEDIA] B57** – Limpieza de cuentas huérfanas en Firebase Auth.
- **[MEDIA] B59** – Rediseñar cabecera de registro para que ocupe menos espacio.
- **[MEDIA] B61** – Opción para ordenar cursos en panel de administración.
- **[MEDIA] B69** – Permitir al administrador habilitar/deshabilitar bloques de horario desde el panel de administración.
- **[MEDIA] B70** – Agrupar los bloques de horario en el panel de administración en dos secciones (Mañana: 8 AM – 6 PM / Noche: 6 PM – 6 AM) y agregar un botón para deshabilitar cada grupo completo de una sola vez.
- **[MEDIA] B71** – `seedDatabase`: Función para inicializar la base de datos con datos de prueba (sedes, horarios, cursos, etc.) desde el panel de administración.
- **[MEDIA] B72** – `cleanExpiredLocks`: Función para limpiar locks expirados manualmente desde el panel de administración.
- **[MEDIA] B73** – `refreshExchangeRates`: Función para actualizar las tasas de cambio desde una API pública (actualmente solo disponible en versiones antiguas del contexto).
- **[MEDIA] B74** – `rateFetchError`: Estado para mostrar errores en la actualización de tasas de cambio.

### 🟢 Baja
- **[BAJA] B55** – Sesión anónima no sobrevivía a recarga (obsoleto).
- **[BAJA] B66** – Validación de edad máxima (110 años) en paso 1.

---
### Actualización 18/06/2026 – Post-refactorización v1.7.3

**Bugs cerrados en esta sesión:**
B15, B17, B27, B42a, B43, B50, B51, B55, B62, B76, C1, C2, B71-B74, B14/B46/B60.

**Nueva deuda técnica:**
- **[ALTA] B75** – Registro con correo electrónico real.
- **[MEDIA] B77** – Selector de rango de fechas configurable (7/15/30 días, 3/6/12 meses).
- **[MEDIA] B78** – Calendario personalizado con fechas "FULL".
- **[MEDIA] B79** – Fecha de nacimiento con calendario desplegable en paso 1.
- **[MEDIA] B80** – Permitir seleccionar solo la sede Guarenas si el estudiante vive en Guarenas.

---
### Actualización 19/06/2026 – Correcciones post-refactorización v1.7.8

**Bugs cerrados en esta sesión:**
- ✅ Bloque "sin recursos asignados" para estudiantes que traen su propia moto.
- ✅ Error "no se encontró el bloqueo del horario" al confirmar PIN (lock expirado).
- ✅ Sugerencia de fecha con formato legible ("viernes 20 de junio").
- ✅ Dashboard: acordeones colapsables en Ajustes Generales.
- ✅ Dashboard: selectores de moneda para clientes y staff (USD, EUR, VES, USDT).

**Bugs pendientes:**
- ⬜ Corrección de `buscarProximaFechaDisponible` para buscar siempre hacia adelante.

- **[BAJA] B82** – Color del reloj SVG: el número no se ve bien en amarillo. Evaluar cambiar a un color más contrastante (naranja oscuro o rojo) para mejorar la legibilidad.
- **[MEDIA] B83** – Flujo de reinscripción: si un estudiante ya registrado entra a /inscripcion, precargar sus datos personales y saltar al paso 2 automáticamente.
- **[MEDIA] B84** – Permitir al administrador restablecer la contraseña de instructores y proveedores desde el panel administrativo.

---
### Actualización 17/06/2026 – Saneamiento de archivo fantasma
**Cerrado:** Archivo duplicado `src/admin/DashboardView.jsx` eliminado. Sin impacto.

### Actualización 18/06/2026 – Rediseño del InstructorPanel y saneamiento de archivos
**Bugs cerrados:**
- ✅ Archivo duplicado `src/admin/DashboardView.jsx` eliminado.
- ✅ Header duplicado en InstructorPanel (fusionado en uno dinámico).
- ✅ Checkbox nativo reemplazado por círculo con check en módulos.
- ✅ Fondo de tarjeta interna cambiado a gris (`bg-gray-800/50`) para mejor contraste.
- ✅ Texto de tarjeta interna reducido a `text-xs` para evitar desbordes de línea.

**Nueva deuda técnica:**
- **[MEDIA] B88** – Unificar el diseño del header en todas las vistas autenticadas (Dashboard, Instructor, Proveedor, Estudiante).

---
### Actualización 18/06/2026 – Sugerencias del panel EdTech

**Nueva deuda técnica:**
- **[MEDIA] B89** – Calificación mutua: instructor ↔ estudiante con estrellas, anónima, colección separada en Firestore.
- **[MEDIA] B90** – Sistema de logros por módulo y curso (cálculo en tiempo real desde Firestore).
- **[MEDIA] B91** – Logros especiales persistentes: "Primer Curso", "Motoescuela Pro", "Calificación Perfecta", "Racha de 3".
- **[MEDIA] B92** – Sala de chat efímera instructor-estudiante (se crea al confirmar pago, se destruye al completar).
- **[BAJA] B93** – Registro de horas de práctica por módulo.
- **[BAJA] B94** – Insignias gamificadas por competencias viales (nocturno, lluvia, estacionamiento).
- **[BAJA] B95** – Modo de alto contraste y recursos offline.
- **[BAJA] B96** – Condiciones climáticas en registro de práctica.
- **[BAJA] B97** – Orden secuencial configurable por el administrador (libre/secuencial).
- **[BAJA] B98** – Nota del instructor por módulo.
- **[BAJA] B99** – Registro de instructorId en modulosEstado para auditoría.

---
### Actualización 18/06/2026 – Lógica de InstructorPanel y nuevas funcionalidades
**Bugs cerrados / Mejoras:**
- ✅ Teléfono del estudiante oculto al instructor.
- ✅ Módulos con orden secuencial (siguiente bloqueado hasta completar anterior).
- ✅ Confirmación para desmarcar módulo.
- ✅ Módulos deshabilitados en cursos aprobados (solo lectura).
- ✅ Botón "Completar Curso" oculto si ya está aprobado.

---
### Actualización 18/06/2026 – Auditoría del Centinela

**Hallazgos del Centinela analizados y convertidos en deuda:**
- **[MEDIA] B100** – Crear `ClaseService.js` para desacoplar la lógica de finalización de curso del componente UI.
- **[BAJA] B101** – Implementar trazabilidad W3C Trace Context (`traceparent`) si la arquitectura escala a microservicios.
- **[BAJA] B102** – Reemplazar inputs de fecha de nacimiento (día/mes/año) por `<input type="date">` nativo para cumplir WCAG 3.3.7.

**Hallazgos rechazados (Veto Supremo del Operador):**
- ❌ CRÍTICO 1 (Idempotencia): Ya cubierta por `lockId` + `runTransaction` + botones anti-pánico.
- ❌ CRÍTICO 2 (ClaseService): Aceptado como deuda B100, no como bloqueante. El sistema actual es funcional y seguro.

---
### Actualización 18/06/2026 – Módulo de Servicios

**Nueva deuda técnica:**
- **[MEDIA] B103** – Crear módulo de Servicios para que estudiantes y público puedan contratar servicios adicionales:
  - Mecánica de motos
  - Motolavado
  - Mandados / Delivery
  - Otros servicios de la escuela

---
### Actualización 18/06/2026 – Consolidación de deudas técnicas (B85-B107)

**Deudas registradas en sesiones anteriores:**
- **[ALTA] B85** – Implementar sistema de evaluaciones teóricas (quizzes, banco de preguntas, calificación).
- **[MEDIA] B86** – Crear sección de Recursos: leyes de tránsito, señales, documentales, blog.
- **[MEDIA] B87** – Crear sección de Cursos disponibles para re-inscripción desde el panel del estudiante.
- **[MEDIA] B88** – Unificar header de todas las vistas autenticadas.

**Nuevas deudas (sesión 18/06/2026):**
- **[MEDIA] B104** – En paso 2 de inscripción, preguntar si prefiere curso en 1 día (4h) o 2 días (2h+2h).
- **[MEDIA] B105** – Pausar reloj general y temporizadores al llegar al límite del día 1.
- **[MEDIA] B106** – Reloj general debe reflejar división en sesiones (Día 1 de 2 / Día 2 de 2).
- **[BAJA] B107** – Módulo de fotos y videos con álbumes en servicio externo gratuito.

---
### Actualización 19/06/2026 – Posposición y Cancelación de Cursos

**Nuevas reglas de negocio y deuda técnica:**
- **[MEDIA] B108** – Implementar el flujo de "Posponer curso" en el panel del estudiante.
- **[MEDIA] B109** – Implementar la lógica de cancelación de curso si el estudiante no asiste a la segunda fecha programada.
- **[MEDIA] B110** – Crear un registro de asistencia para que el instructor confirme la presencia del estudiante.
- **[BAJA] B111** – Crear una sección de "Términos y Condiciones" en el flujo de inscripción (Paso 4).
- **[MEDIA] B112** – Implementar flujo completo de pago de tiempo extra.
- **[BAJA] B113** – Configurar división del tiempo de receso como opción avanzada en el CRUD de cursos.

---
### Actualización 19/06/2026 – Estética de diálogos de confirmación
- **[MEDIA] B114** – Reemplazar `window.confirm` en InstructorPanel por modal personalizado con estilo de la app.

---
### Actualización 20/06/2026 – Refactorización y Aula Virtual
- **[ALTA] B116** – Restringir reversión de módulos: si el módulo actual lleva más de 3 minutos, no se puede revertir el anterior.
- **[MEDIA] B117** – Implementar clases virtuales online en el Aula Virtual para el módulo teórico.

---
### Actualización 20/06/2026 – Dashboard del estudiante y nuevas deudas
- **[BAJA] B115** – Convertir botón "Material" del Aula Virtual en una página independiente con soporte para PDFs, libros, notas y miniforo de comentarios.

**Deudas previas restauradas (se perdieron en refactorización, ya reimplementadas)**
- ✅ Checkpoint al 50% del módulo.
- ✅ Extensión de tiempo con validación de disponibilidad.
- ✅ División en dos días (sesión 1 / sesión 2).
- ✅ Degradación elegante ("Reconectando..." en el reloj).
- ✅ Regla de seguridad anti-sesión fantasma.
- ✅ Confirmación al desmarcar módulo con diálogo de honestidad.

---
### Actualización 20/06/2026 – Sistema de triple reloj y reserva de tiempo
- **[ALTA] B118** – Completar el flujo de reserva de tiempo: botón "Usar reserva", descuento del tiempo usado de `pausaTotalAcumulada`, persistencia en Firestore.
- **[MEDIA] B119** – Implementar el cambio automático de D1 a D2 al iniciar la sesión en la segunda fecha programada del curso.
- **[MEDIA] B120** – Registrar el tiempo excedente de sesión (`tiempoExtraSesionAcumulado`) cuando el reloj grande supera las 4 horas, para auditoría futura.

---
### Actualización 21/06/2026 – Control administrativo sobre contadores de sesión
- **[ALTA] B121** – Permitir al administrador resetear los contadores de sesión (`sesionDiariaInicio`, `sesionTotalInicio`) si un instructor inicia un módulo por error.

---
### Actualización 20/06/2026 – Deuda de auditoría y mejoras

| ID    | Origen     | Descripción breve                                          | Criticidad |
|-------|------------|------------------------------------------------------------|------------|
| B103  | Auditoría  | Foco no atrapado en modales (Calendar, ModalSalud)         | IMPORTANTE |
| B104  | Auditoría  | Selector de día no se adapta al mes en calendario nacimiento | MODERADO   |
| B106  | Auditoría  | `buscarProximaFechaDisponible` sin AbortController        | MODERADO   |
| B107  | Auditoría  | Falta de esquemas de validación isomórfica (Zod/Yup)      | BAJA       |
| B109  | Mejora     | Selectores de Sexo y Estado podrían usar componente Select de UI | BAJA |

---
### Actualización 20/06/2026 (segunda sesión) – Mejoras menores

| ID    | Origen     | Descripción breve                                          | Criticidad |
|-------|------------|------------------------------------------------------------|------------|
| B110  | Mejora     | El login de estudiante no muestra mensaje de error si el correo no está registrado | BAJA |
| B111  | Mejora     | El botón "Acceder al Chat" en HomeView está deshabilitado sin funcionalidad | BAJA |

---
### Actualización 21/06/2026 – Correcciones finales

**Bugs cerrados:**
- ✅ Disponibilidad de bloques (instructor libre vs moto ocupada).
- ✅ Cinta de fechas estable al cambiar de día (separación de locks).
- ✅ Campo `activo` en motos documentado.
- ✅ Expiración del lock con modal de 3 intentos.
- ✅ Control de acceso al portal del estudiante.
- ✅ Rechazo de pago con dos variantes (corregir / cancelar).
- ✅ Toasts en días inhabilitados.
- ✅ Botón de copiar datos de pago.
- ✅ Placeholders, validaciones y atributos HTML en formulario.
- ✅ Corrección de hooks en EstudiantePanel (error "Rendered more hooks").
- ✅ Corrección de typo `today` → `todayStr` en bloques.
- ✅ Protección contra `activeLocks = null` en `calcularDisponibilidadBloque`.

**Deuda técnica pendiente:**
- B66: Validación de edad máxima (110 años).
- B106: `buscarProximaFechaDisponible` sin AbortController.
- B109: Selectores de Sexo y Estado no usan componente Select personalizado.

---
### Actualización 22/06/2026 – PWA y Restricciones de Sesión

**Bugs cerrados:**
- ✅ Reloj diario no se detenía a los 120 min.
- ✅ Instructor podía iniciar curso sin pago aprobado.
- ✅ Instructor podía iniciar curso antes de la fecha/hora programada.
- ✅ Pausa acumulada no se actualizaba en tiempo real.
- ✅ Instructor sin botón para volver de vista "Pendientes".
- ✅ Reloj no avanzaba en tiempo real (tick roto).

**Nuevas funcionalidades:**
- ✅ PWA instalable en celular.
- ✅ Presencia del estudiante requerida para iniciar módulo.
- ✅ Límite diario ajustado al horario del bloque.
- ✅ Tarjetas del instructor con etiqueta "Verificando pago".

---
### Actualización 22/06/2026 – Refactorización de Inscripción

**Deuda técnica cerrada:**
- ✅ H1: Monolito InscripcionView.jsx (God Component) eliminado.
- ✅ H2: Shadow Accounts – PIN mostrado tras Paso 1.
- ✅ H4/H8: Campos faltantes en CAMPOS_PERMITIDOS (apellido, correo, contactoEmergencia, totales).
- ✅ Brecha IoC: buscarProximaFechaDisponible delegada a LockService.
- ✅ Error de permisos en ConfigProvider.

**Nueva deuda técnica:**
- **[MEDIA] B122** – Doble PIN (regeneración en paso 4) no implementado.
- **[MEDIA] B123** – Recuperación de PIN olvidado (flujo automatizado vía correo).
- **[BAJA] B124** – Tipado fuerte de lockId en useDisponibilidad.

---
### Actualización 23/06/2026 – Consolidación Post-Auditoría Centinela V4.0

**Deuda técnica registrada durante la auditoría (Fases 1-4):**

- **[MEDIA] B125** – Optimización de consultas N+1 en `restoreUserRole` (AuthProvider.js). Actualmente ejecuta 3 consultas secuenciales a Firestore. Migrar a Cloud Function con Custom Claims o colección unificada `users/{uid}`.
- **[MEDIA] B126** – Externalización de la identidad del Operador. El email `armandoaventurasve@gmail.com` está hardcodeado en `firestore.rules` y `AuthProvider.js`. Debe moverse a variable de entorno o Remote Config.
- **[BAJA] B127** – Ofuscación de topología de rutas administrativas. Todas las rutas del panel admin están expuestas en el bundle JS del cliente. Evaluar extraer el panel admin a un chunk separado con lazy loading condicionado por rol.
- **[MEDIA] B128** – Migrar limpieza global de locks expirados a Cloud Function + Cloud Scheduler. Actualmente `limpiarLocksExpirados` se ejecuta desde el cliente con filtro por `userId`. La limpieza global (sin filtrar por usuario) requiere backend.
- **[BAJA] B129** – Mitigación de Clock Skew en `crearLock`. La expiración del lock se calcula con `Date.now()` del cliente. Si el reloj del dispositivo está adelantado, la regla `expiresAt <= request.time + 900s` puede rechazar locks legítimos. Evaluar uso de `serverTimestamp()`.
- **[BAJA] B130** – Mapeo de errores de concurrencia de locks a mensajes de negocio amigables. Cuando `crearLock` falla por colisión (`permission-denied` porque `allow update: if false`), el usuario ve un error genérico. Debe mostrarse "Este horario acaba de ser separado por otro usuario".
- **[MEDIA] B132** – Implementación de Focus Trap en modales (WCAG 2.1.2). `ModalPIN`, `ModalExpiracion` y `ModalConfirmacion` no atrapan el foco ni se cierran con Escape. Crear custom hook `useFocusTrap` o componente `ModalBase`.
- **[BAJA] B133** – Adición de atributos `autocomplete` en formularios de inscripción (WCAG 1.3.5). Los campos de nombre, apellido, teléfono, correo carecen de `autocomplete="given-name"`, `autocomplete="tel"`, etc.
- **[MEDIA] B134** – Configuración de headers HTTP de seguridad en `firebase.json`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. Previene Clickjacking.

**Deuda técnica cancelada durante la auditoría:**
- ~~B131~~ – Falso positivo de WCAG 2.5.8 en círculos de módulo. El botón padre supera los 40px de altura.

**Deuda preexistente que permanece vigente:**
- B66: Validación de edad máxima (110 años).
- B82: Color del reloj SVG (contraste del número).
- B89-B99: Calificación mutua, logros, chat, insignias, accesibilidad, orden secuencial configurable, nota del instructor por módulo, registro de instructorId en modulosEstado.
- B100-B103: ClaseService.js, trazabilidad W3C, input type="date" nativo, módulo de Servicios.
- B104-B107: Curso 1 día vs 2 días, pausar reloj al límite diario, división visual de sesiones, módulo de fotos y videos.
- B108-B113: Posponer/cancelar curso, registro de asistencia, términos y condiciones, pago de tiempo extra, división de receso.
- B114: Reemplazar `window.confirm` por modal personalizado.
- B115-B121: Material como página independiente, restricción de reversión de módulos, clases virtuales online, flujo de reserva de tiempo, cambio automático D1→D2, registro de tiempo excedente, reset administrativo de contadores de sesión.
- B122-B124: Doble PIN, recuperación de PIN olvidado, tipado fuerte de lockId.

---
### Actualización 23/06/2026 – Cierre de deudas de hardening, disponibilidad y rendimiento

**Deuda técnica saldada:**
- ✅ **B130** – Mensajes amigables en colisión de horario.
- ✅ **B132** – Focus trap en modales (useFocusTrap).
- ✅ **B133** – Atributos autocomplete en formularios.
- ✅ **B134** – Headers HTTP de seguridad en firebase.json.
- ✅ **B137** – Límite de 3 intentos de corrección de pago.
- ✅ **B147** – Optimización de disponibilidad con Hash Maps O(1).

**Deuda técnica cancelada (código eliminado):**
- ~~`buscarProximaFechaDisponible`~~ – Eliminada de LockService y useDisponibilidad.

**Deuda preexistente que permanece vigente:**
- B66, B82, B89-B99, B100-B103, B104-B107, B108-B113, B114, B115-B121, B122-B124, B125-B129.



---
### Actualización 23/06/2026 – Cierre de Arquitectura de Colección Espejo

**Deuda técnica saldada:**
- ✅ **B147** – Optimización de disponibilidad con Hash Maps O(1).
- ✅ **B148** – Sincronización de `ocupacionConfirmada` en panel admin (writeBatch al rechazar/cancelar).
- ✅ **B130** – Mensajes amigables en colisión de horario.
- ✅ **B132** – Focus trap en modales.
- ✅ **B133** – Atributos autocomplete en formularios.
- ✅ **B134** – Headers HTTP de seguridad.
- ✅ **B137** – Límite de intentos de corrección de pago.

**Deuda preexistente que permanece vigente:**
- B66, B82, B89-B99, B100-B103, B104-B107, B108-B113, B114, B115-B121, B122-B124, B125-B129.


---
### Actualización 22/07/2026 – Cierre de sesión masiva de regresiones

**Bugs cerrados:**
- ✅ **B154** – Flujo de reinscripción restaurado con progreso en Firestore.
- ✅ **Validaciones:** Pasos 1 (Zod + mayoría de edad), 2 (campos obligatorios), 4 (Zod).
- ✅ **Disponibilidad:** Bloqueo por bloque horario corregido (filtrado por `horaId` en reservas).
- ✅ **Spinner infinito:** Eliminado con inicialización de `activeLocks` y guardias de renderizado.
- ✅ **Panel Admin:** Error `No document to update` solucionado con `batch.set`.
- ✅ **Rechazo (corregir):** Mantiene bloqueo del horario hasta cancelación definitiva.

**Deuda técnica que permanece vigente:**
- B115-B120 (Material, reversión módulos, clases virtuales, reserva tiempo, D1→D2, tiempo excedente).
- B89-B99 (Calificación mutua, logros, chat, insignias, accesibilidad).
- B125-B129 (Optimización de consultas, Cloud Functions, etc.).

---
### Actualización 26/07/2026 – Cierre definitivo de B154 y validación de cédula duplicada

**Bugs cerrados:**
- ✅ **B154** – Reinscripción completamente funcional y segura. El sistema restaura el progreso del usuario solo si la cédula ingresada coincide con la registrada originalmente.
- ✅ **Validación de cédula duplicada** – Funcional para nuevos registros. Si la cédula ya está en `cedulasRegistradas`, se rechaza el registro y se elimina la cuenta Auth recién creada (rollback).
- ✅ **Advertencia de cédula no coincidente** – Si el usuario intenta reinscribirse con un correo existente pero una cédula diferente, el sistema bloquea el avance y muestra un error.

**Deuda técnica que permanece vigente:**
- B115-B120 (Material, reversión módulos, clases virtuales, reserva tiempo, D1→D2, tiempo excedente).
- B89-B99 (Calificación mutua, logros, chat, insignias, accesibilidad).
- B125-B129 (Optimización de consultas, Cloud Functions, etc.).


## Deuda nueva detectada — Sesión A1 (2026-09-16)

### 🔴 CRÍTICA — Bug sistémico de toasts

**Descripción:** `AppContext.showToast` (`src/context/AppContext.jsx:11-14`) define un `useState('toast')` con `setTimeout` de 4s, pero el JSX del `AppProvider` **no renderiza el toast**. Solo el `ToastProvider` (`src/modules/shared/components/ToastProvider.jsx`) lo renderiza. Todos los componentes que consumen `showToast` desde `AppContext` no ven feedback visual.

**Componentes afectados (parcial, verificar con `grep -rn "showToast" src/`):** al menos `AdminAjustes` (arreglado puntualmente migrando a `useToast()`).

**Fix propuesto:** Consolidar ambas fuentes. Opción A: eliminar el `showToast` fantasma de `AppContext` y reemplazar su uso interno por el del `ToastProvider`. Opción B: agregar el render del toast al JSX de `AppProvider` (duplicaría UI).

**Prioridad:** Alta — afecta UX de múltiples vistas admin.

---

### 🟡 ALTA — Bug financiero: deuda del proveedor usa valor no congelado

**Descripción:** `AdminFinanzas.jsx:62` y `ProveedorPanel.jsx` calculan la deuda del proveedor usando `config.pagoProveedor` (valor global mutable) en lugar de `reserva.comisionProveedor` (congelado por reserva desde el FIX-036). Cambiar `config.pagoProveedor` reescribe retroactivamente todas las deudas históricas.

**Archivos afectados:**
- `src/modules/admin/components/AdminFinanzas.jsx:62`
- `src/admin/ProveedorPanel.jsx:25,26,28` (ruta legacy)
- `src/modules/proveedor/views/ProveedorPanel.jsx:60,61,63`

**Fix propuesto:** Migrar los 3 consumidores a leer `reserva.comisionProveedor` con fallback a `config.pagoProveedor` para reservas antiguas (previas a la migración de datos).

**Prioridad:** Alta — replica bug ya resuelto para instructores en FIX-036.

---

### 🟢 MEDIA — Campos vestigiales en `configuraciones/main`

**Descripción:** `{merge:true}` no elimina campos aunque no se envíen. Quedan vestigios con valor `""` o deprecated:
- `tasaPagoStaff: ""` (confirmado muerto)
- `pagoInstructor: 15` (deprecated formalmente, sin consumidores activos)

**Fix propuesto:** Ejecutar un script de limpieza con `deleteField()` en ventana de mantenimiento. Coordinar con FIRE.

**Prioridad:** Baja — no rompen nada.

---

### 🟢 MEDIA — Inconsistencia de tipos en config

**Descripción:** Tipos mezclados en `configuraciones/main`:
- Strings: `tasaUSD: "846.51"`, `tasaEUR: "840.85"`, `tasaUSDT: "950"`, `recargoSinBici: "0"`, `descuentoMotoPropia: "0"`, `pagoProveedor: "15"`
- Números: `precioBase: 35`, `recargoGuarenas: 5`, `descuentoPromo: 0`, `pagoInstructor: 15`

**Riesgo:** Bugs silenciosos en aritmética cuando dos campos se suman. Mitigación actual: `Number()` defensivo en los consumidores.

**Fix propuesto:** Script de migración que normalice todo a `Number`. Requiere auditoría exhaustiva de todos los consumidores.

**Prioridad:** Media — mitigado con `Number()` pero frágil.

---

### 🟢 BAJA — Working tree git acumulado

**Descripción:** Detectado en sesión A1 (dev): cientos de cambios sin commitear de sesiones previas (`backup/*`, `src.backup/*`, `node_modules/.vite/deps/*` trackeados). `.gitignore` corrupto con bytes nulos en la línea de `node_modules/`.

**Fix propuesto:** Sesión dedicada de saneamiento git: `git rm --cached` de directorios backup, reparar `.gitignore`, revisar qué merece versionarse y qué no.

**Prioridad:** Baja — no bloquea funcionalidad.

---

### 🔵 INFO — Deprecación formal de campos

**Descripción:** Campos deprecados formalmente por decisión de negocio:
- `config.pagoInstructor` → reemplazado por `curso.comisionInstructor` (FIX-036)
- `config.tasaPagoStaff` → reemplazado por `config.monedaPagoStaff` + tasas BCV

**Acción:** No requiere código inmediato. Incluir en próxima limpieza de schema.

# Bloque para `BACKLOG_V2.md`

Pega al final del archivo:

```markdown

---

## Deuda nueva — Sesión A2.1: Reparto de comisión entre instructores (2026-09-16)

### 🔴 ALTA — Reasignaciones sucesivas bloqueadas

**Descripción:** El modal `ModalReasignarInstructor` y el handler `reasignarInstructor` bloquean la reasignación de reservas ya compartidas (`esReservaCompartida === true`). Toast actual: *"Función avanzada no disponible todavía para reservas ya compartidas"*.

**Casos no soportados:**
- A → B → C (segundo relevo)
- A → B → A (el original vuelve)

**Fix propuesto:** UI que permita editar el array `instructoresInvolucrados` completo (agregar/quitar participantes + reasignar porcentajes + ajustar `instructorId` actual).

**Motivo del diferimiento:** MVP acotado al caso A→B simple. Complejidad alta por UI multi-participante.

---

### 🔴 ALTA — Reprogramación de D2 pendiente

**Descripción:** No existe flujo para reprogramar la reserva cuando el instructor D1 completa su parte y D2 queda sin cubrir (A no puede ir D2, B tampoco). Hoy las reglas de negocio dicen:
- Solo se puede reprogramar **una vez**.
- Solo se puede reprogramar **antes de iniciar el curso**.

Ambas reglas rompen el caso real: el D1 ya se consumió y hay que mover el D2 a otra fecha sin perder el progreso.

**Fix propuesto:** Modal específico "Reprogramar D2" que:
- Preserve los módulos completados en D1.
- Actualice solo `fecha2` (no `fecha`).
- Registre motivo + autor en un campo aparte (`reprogramaciones: [...]`).
- No toque `comisionInstructor` (ya está congelado).

**Impacto:** Alto en operación. Bloquea cursos de 4h cuando el D2 se cae.

---

### 🟡 MEDIA — `getDetallesPago` fallback no encuentra colaboraciones

**Descripción:** En `FinanzasTab.jsx` (instructor), el fallback de `getDetallesPago` busca reservas solo en la prop `reservas` (propias del instructor). Las colaboraciones vienen de un `useEffect` paralelo (`colaboraciones`). Para pagos viejos sin `snapshot.detalles`, una reserva compartida no se encontraría → muestra `"(reserva eliminada)"`.

**Alcance real:** no alcanzable hoy, porque:
- Los pagos nuevos ya incluyen `detalles` con snapshot (FIX de Fase 1).
- Los pagos viejos no pueden contener reservas compartidas (no existían).

**Fix propuesto:** Extender el lookup a `[...reservas, ...colaboraciones]`.

**Prioridad:** Baja hasta que existan pagos viejos que cubran reservas compartidas.

---

### 🟡 MEDIA — `AdminFinanzas` cálculo global usa campos legacy

**Descripción:** En `AdminFinanzas.jsx` el useMemo principal sigue usando campos deprecados:

```javascript
const deudas = aproved.reduce((acc, r) => 
  acc + (!r.pagadoInstructor ? Number(r.pagoInstructor || 0) : 0) + 
        (!r.pagadoProveedor ? Number(r.pagoProveedor || 0) : 0), 0);
const neta = ingresos - aproved.reduce((acc, r) => 
  acc + Number(r.pagoInstructor || 0) + Number(r.pagoProveedor || 0), 0);
```

`r.pagoInstructor` / `r.pagoProveedor` son campos viejos de la reserva. El SSOT actual es `r.comisionInstructor` / `r.comisionProveedor` (congelados por FIX-036).

**Impacto:** El cálculo `deudasPorPagar` y `gananciaNeta` puede estar subestimado/sobreestimado según qué campo tenga cada reserva. No es de A2.1 — es herencia.

**Fix propuesto:** Migrar los 2 reduce a `comisionInstructor`/`comisionProveedor`. Requiere auditar reservas históricas para confirmar que los campos están poblados.

**Prioridad:** Media — afecta reportes globales.

---

### 🟡 MEDIA — `dProv` sigue usando `config.pagoProveedor` global

**Descripción:** `AdminFinanzas.jsx:62` y `ProveedorPanel.jsx` calculan la deuda del proveedor usando `config.pagoProveedor` (valor global mutable) en lugar de `reserva.comisionProveedor` (congelado). Cambiar `config.pagoProveedor` reescribe retroactivamente todas las deudas históricas.

**Archivos afectados:**
- `src/modules/admin/components/AdminFinanzas.jsx:62`
- `src/admin/ProveedorPanel.jsx:25,26,28` (legacy)
- `src/modules/proveedor/views/ProveedorPanel.jsx:60,61,63`

**Fix propuesto:** Migrar los 3 consumidores a leer `reserva.comisionProveedor` con fallback a `config.pagoProveedor` para reservas antiguas (previas al 16/09/2026).

**Prioridad:** Media — replica retroactivamente el bug que FIX-036 arregló para instructores.

---

### 🟢 BAJA — `ModalReasignarInstructor` no muestra warning de conflicto de horario

**Descripción:** La validación de conflicto del instructor destino existe pero está **solo** en el handler del `AdminReservaDetalle` con `window.confirm`. El modal no muestra un warning visual cuando se selecciona un instructor con conflicto.

**Fix propuesto:** Mover la validación al modal con un warning inline amarillo (patrón similar a `verificarDisponibilidadInstructor` del componente viejo). Permitir confirmar de todos modos.

**Prioridad:** Baja — la confirmación bloquea el commit hoy.

---

### 🟢 BAJA — `reservaHorarioHelpers.js` tiene función huérfana

**Descripción:** La función `verificarDisponibilidadInstructor` en `src/modules/admin/utils/reservaHorarioHelpers.js` sigue siendo usada por `CambiarHorarioModal.jsx`, pero podría unificarse con la lógica inline del handler de reasignación.

**Fix propuesto:** Extraer `tieneConflictoHorario(instructorId, reserva, reservas)` como helper compartido y consumirlo desde los 2 lugares.

**Prioridad:** Baja — código duplicado, cero impacto funcional.

---

### 🟢 BAJA — `resumenTotales` en `AdminFinanzas` no contempla colaboraciones

**Descripción:** El objeto `resumenTotales` en `AdminFinanzas.jsx` (generado/cobrado/pendiente por rango de fechas) no incluye las reservas donde el instructor es colaborador. Solo cuenta `instructorId` actual.

**Impacto:** El admin no ve el total generado por un instructor si su participación es como colaborador.

**Fix propuesto:** Incorporar el filtro `implicadosIds` al cálculo de `generado` y `pendiente`.

**Prioridad:** Baja — el cálculo puntual por ficha (`StaffFinanzasView`) sí lo hace correctamente.

---

### 🔵 INFO — Replicación de A2.1 a producción pendiente

**Estado:** A2.1 completo en dev. Falta replicar a `motoescuela-pro`:
- Reglas Firestore: agregar rama `request.auth.uid in resource.data.get('implicadosIds', [])` en `reservas.allow read`.
- Código: 8 archivos modificados + 1 creado.
- Protocolo: backup → dry-run → apply → verificación funcional.

**Prioridad:** Alta — pero debe hacerse en sesión separada con el protocolo de Freno Táctico.
```

---

## Aplicar

```bash
cat >> BACKLOG_V2.md << 'FIN_ARCHIVO'
[bloque de arriba]

FIN_ARCHIVO
```


---

## Deuda nueva — Sesión A2.2: Prerequisitos editables (2026-09-17/18)

### 🔴 ALTA — Bug refresh: pérdida de estado en pasos 2-4

**Descripción:** Si el usuario recarga (`Ctrl+Shift+R`) estando en paso 2, 3 o 4, el sistema lo devuelve al paso 1 sin nada guardado. Causa: el `useEffect` en `InscripcionView.jsx` (líneas 285-305) que precarga el curso desde `/cursos` usa `useRef` (que se resetea en refresh) como guard. Al recargar, `limpiarSesion()` borra `sessionStorage` y `setStep('1')` vuelve al inicio.

**Fix propuesto:** usar `entryToken: Date.now().toString()` en `location.state` + persistirlo en `sessionStorage`. Requiere confluencia FIRE + MAMBA antes de aplicar.

**Prioridad:** Alta — afecta UX real en usuarios que recargan por lentitud.

---

### 🟡 MEDIA — `tipoMotoFijo` y `orden` siguen hardcodeados

**Descripción:** `tipoMotoFijo` y `orden` siguen en `cursoSecuencia.js`. Fueron excluidos del scope A2.2 por YAGNI (MAMBA).

**Prioridad:** Baja.

---

### 🟡 MEDIA — `prerequisitosModo` AND/OR no soportado

**Descripción:** Hoy `cumplePrerequisito` usa `.some()`. Se descartó por YAGNI.

**Prioridad:** Baja.

---

### 🟢 BAJA — Purgar `CURSO_SECUENCIA.js`

**Descripción:** Una vez que el Operador guarde los 6 cursos desde el admin poblando `prerequisitos`, se puede eliminar el fallback.

**Bloqueante:** debe correr un ciclo de producción primero.

**Prioridad:** Baja.

---

### 🟢 BAJA — Validación de prereqs en `ReservaService`

**Descripción:** MAMBA aceptó validación en servicio solo si es trivial. No se implementó.

**Prioridad:** Baja.

---

### 🟢 BAJA — Hueco teórico en `/inscripcion` por URL directa

**Descripción:** Entrar a `/inscripcion` con `location.state.cursoId` de curso con prereq duro no valida previo. Solo el dropdown del paso 2 bloquea.

**Prioridad:** Baja.


### 🟡 MEDIA — Receso automático basado en tiempo real de sesión (no de módulo)

**Descripción:** El receso automático actual se activa a los 55 min del **módulo activo** (`derivados.moduloSegundos >= 3300`). Con la nueva política de módulos de **duración variable** (algunos < 55 min), el receso puede no activarse nunca en una sesión larga.

**Objetivo:** receso cada 55 min **reales de sesión** (independiente del módulo activo).

**Problema a resolver:** un receso a mitad de un módulo rompe la lógica de unidades atómicas del SGTA. Hay que definir la regla:
  - **(a)** Receso se activa automáticamente al terminar el módulo que cruce el umbral de 55 min.
  - **(b)** Se permite receso a mitad de módulo (más complejo, requiere pausar el módulo).
  - **(c)** Receso al alcanzar 55 min: si hay módulo en progreso, se finaliza el módulo antes y se aplica el receso.

**Archivos afectados:**
- `src/modules/sesiones/hooks/useSessionTimer.js` (derivados.moduloSegundos)
- `src/modules/aula/views/AulaVirtualView.jsx` (alertas y banners)
- Posiblemente `src/modules/shared/utils/alertas.js`

**Prioridad:** Media — no perjudica la operativa actual, solo afecta al timing del descanso.

**Notas:** El Operador confirma que es deuda diferible. No es bloqueante para ninguna feature en curso.


---

## Deuda nueva — Sesión 2026-09-20/21

### 🟡 MEDIA — Extraer helpers `afectaFecha` y `afectaProveedor` a nivel de módulo

**Descripción:** Las funciones `afectaFecha` y `afectaProveedor` (o sus variantes `afectaFechaLocal` / `afectaProveedorLocal`) están duplicadas en `calcularBloque` (dentro de `evaluarDisponibilidad`) y en `handleSelectHorario` (dentro del componente). Violación de DRY.

**Ticket:** A2.4-b1

**Fix propuesto:** Mover a `src/modules/inscripcion/utils/bloqueosHelpers.js` y consumir desde ambos lugares. Cuidado con el scoping actual (usan `bloque`, `form.sedeId` del closure).

**Prioridad:** 🟢 Baja (no es bug, solo DRY).

---

### 🟡 MEDIA — Validación de bloqueos dentro de la transacción de `crearLock`

**Descripción:** La revalidación A2.4 es cliente-side. Un cliente modificado puede evadirla. El race condition real (admin bloquea durante el flujo del estudiante) NO se cierra con A2.4.

**Ticket:** A2.4-b2

**Fix propuesto:** Validar bloqueos dentro de la transacción de `crearLock` (en `ReservaService`). Requiere leer `bloqueosAdmin` y `bloqueosProveedor` desde la transacción. Hoy Firestore SDK cliente **no permite queries dentro de transacciones**, solo `get(docRef)`. Alternativas:
  - Migrar a Cloud Functions (Plan Blaze).
  - Cachear IDs de bloqueos por fecha y consultarlos individualmente.

**Prioridad:** 🟡 Media (documentado como limitación arquitectónica, probabilidad real baja ~1/200M).

---

### 🔴 ALTA — Bug refresh en pasos 2-4 de inscripción

**Descripción:** Recargar la página en pasos 2-4 de `/inscripcion` devuelve al paso 1 sin datos. Causa probable: `useEffect` con `useRef` que se reinicia en refresh + `location.state` que persiste + `limpiarSesion()` que se dispara de nuevo.

**Ticket:** A2.8 (pendiente consulta a FIRE + MAMBA)

**Fix propuesto:** Persistir bandera `inscripcion_publico_inicializado` en `sessionStorage` en vez de `useRef`, o usar token único en `location.state.entryToken`.

**Prioridad:** 🔴 Alta (afecta UX en recargas por lentitud).

---

### 🟡 MEDIA — Receso automático por tiempo real de sesión (no por módulo)

**Descripción:** El receso actual se activa a los 55 min del **módulo activo** (`derivados.moduloSegundos >= 3300`). Con módulos de duración variable, un módulo de 30 min nunca activa el receso. Objetivo: receso cada 55 min reales de sesión.

**Problema a resolver:** un receso a mitad de módulo rompe la lógica del SGTA (módulos atómicos). Opciones:
  - (a) Receso al terminar el módulo que cruce 55 min.
  - (b) Permitir receso a mitad de módulo.
  - (c) Receso al alcanzar 55 min: finalizar módulo antes.

**Archivos afectados:**
> - `src/modules/sesiones/hooks/useSessionTimer.js`
> - `src/modules/aula/views/AulaVirtualView.jsx`
> - `src/modules/shared/utils/alertas.js`

**Prioridad:** 🟡 Media (no perjudica operativa actual).

---

### 🔴 ALTA — Recompra falla si el estudiante tiene canceladas pero no aprobadas

**Descripción:** El flujo de recompra requiere `obtenerReservasAprobadas(uid)` con al menos 1 resultado. Si el estudiante tiene solo canceladas, el flujo falla y redirige a `/portal-reservas`. Esto se resolvió con A2.6 (reintento separado), pero si el estudiante intenta recompra desde otro punto de entrada podría fallar.

**Fix propuesto:** Verificar todos los puntos de entrada a recompra. Asegurar que A2.6-bis (reintento) cubra todos los casos.

**Prioridad:** 🔴 Alta (resuelto parcialmente con A2.6).

---

### 🟢 BAJA — Deudas previas A2.2 (heredadas)

Siguen pendientes:
- A2.2-b1: `tipoMotoFijo` editable.
- A2.2-b2: `orden` editable.
- A2.2-b3: `prerequisitosModo` AND/OR.
- A2.2-b4: purgar `CURSO_SECUENCIA.js` tras migrar los 6 cursos.
- A2.2-b5: validación en servicio de prereqs.

**Prioridad:** 🟢 Baja.

---

## Ítems operativos pendientes (no son bugs)

Siguen en la lista original del Operador:
- Recibos por WhatsApp (#2, #8)
- Contador de retraso en aula virtual (#9)
- Marcar "estudiante no asistió" (#20)
- Ver progreso admin (#21)
- Modificar fecha bloque almuerzo (#30)
- Términos: reservas no transferibles (#31)
- Indicar hora inicio/fin en público (#32)
- Métricas (equilibrio→otros cursos, más vendido) (#4, #5)
- Plan completo de estudios (#6)
- Mapa de sedes (#7)
- Simulador apto (#11, #12)
- Sede a domicilio (#13)
- UX confusión "moto propia" (#25)
- Servicios legales + crédito moto (#33, #34)
---

## Actualización 22/09/2026 – Fase 1 y 2 del Pack Comercial (A2.12 + A2.13)

**Cerrado en esta sesión:**

### Fixes A2.10 + A2.11 (cierre sesión previa)
- ✅ **A2.10** – Persistencia de filtros en `sessionStorage` (`AdminReservasList.jsx`). Sobrevive navegación al detalle + F5.
- ✅ **A2.11** – Cadena de `state.from` entre Lista → Detalle → Progreso → Detalle. Al volver, respeta origen.
- ✅ **Fix scroll doble** en `AdminReservaDetalle.jsx` (`h-[calc(100vh-56px)]` → `h-full`).
- ✅ **Reorden** de Progreso Académico al final, después del banner.

### A2.9 – Badges académicos + filtro (sesión previa)
- ✅ Helpers `getEstadoAcademico` y `badgeAcademico` a nivel módulo.
- ✅ Filtro académico (No iniciado / Iniciado / Completado) en `AdminReservasList`.

### A2.12 – Fase 1: CRUD Admin de Packs
- ✅ Nueva colección `packs` en Firestore (dev).
- ✅ `FormPack.jsx` con drag & drop + flechas ↑↓ + preview en vivo.
- ✅ `AdminPacks.jsx` con render custom (precio, cursos en orden, vencimiento).
- ✅ `CRUDView.jsx` extendido con `renderItem` opcional (cero regresión en los 7 CRUDs).
- ✅ Reglas Firestore para `packs`: `allow read: if true; allow write: if isAdmin();` (dentro del bloque `artifacts`).

### A2.13 – Fase 2: Vista Pública de Packs
- ✅ Nueva ruta `/packs` + `PacksPublicosView.jsx`.
- ✅ Cálculo dinámico de precio (suma - descuento configurable).
- ✅ Cross-link a `/cursos`.
- ✅ Botón "Quiero este Pack" con placeholder (se implementa en Fase 3).

**Deuda técnica nueva (cosmética):**
- 🟢 Líneas pegadas en `AppContext.jsx` (L63), `AdminCRUDPage.jsx` (L19), `FirestoreProvider.js` (L79). Funcionan pero desalineadas.
- 🟡 Reglas de `packs` faltan replicar en prod (va en Fase 8).

**Pendiente (próximas fases del Pack):**
- 🔴 **Fase 3** – Compra de pack (reserva maestra + sub inicial).
- 🟡 **Fase 4** – Extracción de componentes a `shared/agenda/`.
- 🔴 **Fase 5** – Agendamiento secuencial desde portal del estudiante.
- 🟢 **Fase 6** – Panel admin (vista de packs).
- 🟡 **Fase 7** – Comisiones prorrateadas (modelo híbrido).
- 🟢 **Fase 8** – Reglas prod + testing E2E.

**Fix de datos pendiente pre-lanzamiento:**
- `Refuerzo Práctico.prerequisitos = ['basico_auto', 'basico_sincro']` en prod (hoy vacío).

---

## Actualización 25-26/09/2026 – Pack Comercial: Fases 1, 2, 3.7, 3.8a, 3.8b

**Cerrado en esta sesión:**

### Fase 1 — CRUD Admin de Packs (A2.12)
- ✅ Colección nueva `packs` en Firestore.
- ✅ `FormPack.jsx` con drag & drop + flechas ↑↓ + preview de precio en vivo.
- ✅ `AdminPacks.jsx` con render custom (precio, cursos en orden, vencimiento).
- ✅ `CRUDView.jsx` extendido con `renderItem` opcional (cero regresión en 7 CRUDs).
- ✅ `sedesPermitidas` en packs.
- ✅ Reglas Firestore para `packs`: `allow read: if true; allow write: if isAdmin();`.

### Fase 2 — Vista Pública (A2.13)
- ✅ Ruta `/packs` + `PacksPublicosView.jsx`.
- ✅ Cálculo dinámico de precio (suma − descuento).
- ✅ Acceso desde Home (botón degradado indigo→púrpura).

### Fase 3.7 — Compra del Pack
- ✅ Modelo ALT-B aprobado por FIRE + MAMBA + Deek (confluencia 3/3).
- ✅ Colección nueva `reservasPack` (maestra).
- ✅ Extensión de `reservas` con `tipoReserva: 'pack_sub'`, `packReservaId`, `packCursoIndex`.
- ✅ `ReservaService.crearReservaPack()` — transacción atómica 5 escrituras (maestra + child + espejo + 2 locks).
- ✅ `Paso2Pack.jsx` — variante del Paso 2 con sede + moto por curso.
- ✅ Precio prorrateado en child ($13.50 sobre $81).
- ✅ Modelo HÍBRIDO: precio prorrateado + comisión completa + negocio absorbe déficit.
- ✅ Reglas Firestore: `reservasPack` nueva + extensión de `reservas.create` con `getAfter()`.
- ✅ Ternario en `InscripcionView.handleConfirmarPago` para bifurcar pack vs reserva individual.
- ✅ E2E verificado: pack creado, compra funciona, cero regresión en inscripción normal.

### Fase 3.8a — Admin ve packs
- ✅ Hook `useAdminReservas` extendido con segundo listener a `reservasPack`.
- ✅ Sección "Packs Pendientes" en `AdminReservasHome` con badge PACK morado.

### Fase 3.8b — Admin aprueba packs
- ✅ 3 métodos nuevos en `ReservaService`: `aprobarReservaPack`, `rechazarReservaPack`, `cancelarReservaPack`.
- ✅ `AdminPackDetalle.jsx` (nuevo) con vista completa del pack + acciones.
- ✅ Ruta nueva `/admin/pack/:packReservaId`.
- ✅ Card del pack clickeable desde `AdminReservasHome`.
- ✅ Cascada verificada: aprobar maestra → aprueba child + espejo.

**Deuda técnica nueva (cosmética):**
- 🟢 Indentación irregular en algunos bloques pegados (AdminReservasHome, InscripcionView).
- 🟢 Placeholder "Ver detalle en 3.8b" reemplazado por "Toca para ver →".

**Pendiente (Fase 3):**
- 🟡 **3.8c** – Movimiento contable al aprobar pack.
- 🟡 **3.8d** – Email de confirmación al estudiante.
- 🔴 **3.8e** – Panel del estudiante ve su pack diferenciado.
- 🟡 **Fase 4** – Extracción de componentes a `shared/agenda/`.
- 🔴 **Fase 5** – Agendamiento secuencial (portal estudiante).
- 🟡 **Fase 6** – Panel admin (filtros de packs).
- 🟡 **Fase 7** – Comisiones prorrateadas con reportes.
- 🟢 **Fase 8** – Reglas prod + testing E2E final.

**Fix de datos pendiente pre-lanzamiento:**
- `Refuerzo Práctico.prerequisitos = ['basico_auto', 'basico_sincro']` en prod.

---

## Actualización 27-28/09/2026 – Fase 5 del Pack Comercial (completa) + Fase 3.8c/e

**Completado en esta sesión:**

### Fase 3.8c — Movimiento contable al aprobar pack
- ✅ `AdminPackDetalle.handleAprobar` crea 1 movimiento de ingreso por el total del pack.
- ✅ Fire-and-forget con `.catch` para no bloquear el flujo del admin.

### Fase 3.8e — Estudiante ve su pack
- ✅ Card morada con 4 estados (Aprobado / Pendiente / Rechazado / Cancelado).
- ✅ Card azul oculta cuando hay CUALQUIER pack (no solo aprobado).
- ✅ Input de corrección de referencia dentro de la card morada cuando Rechazado.
- ✅ Auto-refresh: cuando `reservaRealTime.estadoPago === 'Aprobado'`, recarga `packsUsuario` sin F5.
- ✅ Página dedicada `/mi-pack/:packReservaId` (`PackDetalleEstudiante.jsx`).
- ✅ `EstudiantePanel` con card compacta + botón "Ver detalle →".

### Fase 5 — Agendamiento secuencial

**5.0** — `crearReservaPack` agrega `cursoReservaId: childRef.id` a la maestra.

**5.0-bis** — Migración de 5 packs de dev con `cursoReservaId`.

**5.1** — Regla `reservasPack.update` extendida con rama instructor:
resource.data.cursoReservaId != null &&
get(reservas/{cursoReservaId}).data.instructorId == request.auth.uid &&
hasOnly(['subReservas', 'cursoActual', 'estado'])

text

**5.1-fix** — Regla `reservasPack.read` extendida con la misma rama instructor (faltaba para que el `getDoc` del instructor no fallara con permission-denied).

**5.2** — Método `ReservaService.avanzarPackTrasCompletarCurso(packReservaId, childId, cursoActualIndex)`:
- Idempotente (3 validaciones).
- Avanza `subReservas[actual]` → 'completado', `subReservas[actual+1]` → 'activo', `cursoActual++`.
- Si es el último curso → `estado: 'completado'`.
- Si pack vencido → `estado: 'vencido'`.
- NO muta `cursoReservaId`.

**5.2c** — Llamada fire-and-forget desde `useSessionTimer.finalizarModulo` cuando `todosCompletados && reserva.packReservaId`.

**5.2c-bis** — Misma llamada desde `completarCursoManualmente` (flujo alternativo del instructor).

### Paso2Pack v2 — Derivación por tipoCurso
- ❌ ANTES: índices fijos `cursosPack[0..3]` (fallaba con packs de 3 cursos).
- ✅ AHORA: por comportamiento del curso:
  - `tipoCurso === 'equilibrio'` → fijo moto escuela.
  - `motoIncluida === false` → fijo moto propia.
  - Resto → preguntar al estudiante.
- ✅ Cambio de schema en form: `traeMotoBasico`/`traeMotoRefuerzo` → `traeMotoPorCurso` (mapa indexado por cursoId).

### Fixes adicionales
- ✅ Sección "Packs Rechazados" en `AdminReservasHome`.
- ✅ Sección "Reservas Rechazadas" en `AdminReservasHome`.
- ✅ `AdminPackDetalle` NO permite aprobar packs Rechazados (espera corrección del estudiante).
- ✅ `corregirReferenciaPago` con `writeBatch`: si es `pack_sub`, actualiza child + maestra simultáneamente.
- ✅ `refreshCatalogos` tras guardar un pack (para que aparezca en `/packs` sin F5).

### Fix en PROD
- ✅ Reserva Equilibrio `SB3rFGFDQzf63Lrn335s` (Carlos Azuaje): marcados 3 módulos completados el 27/09/2026 con horarios reales (8:30-9:20, 9:20-10:50, 10:50-12:40).
- ✅ Reserva Básico `mpwdheYKKxQwGRxhuydO`: reseteado avance académico (`estadoCurso: 'Pendiente'`, `modulosEstado: {}`, eliminados campos de sesión).

**Deuda técnica nueva:**
- 🟡 Fix del bug visual: la card de "Curso actual" en `PackDetalleEstudiante` y `EstudiantePanel` busca la child por `packReservaId` en lugar de por `packReservaId && packCursoIndex === cursoActual`. Muestra fecha/instructor del curso anterior cuando el nuevo aún no tiene reserva agendada.
- 🟡 3.8d: Email al estudiante cuando se aprueba el pack (diferido).
- 🟡 Alquiler de moto en Práctica en Vía dentro del pack (deuda: precio dinámico del pack según alquiler).

**Pendiente próxima sesión:**
- 🟡 Fix del filtro `packCursoIndex === cursoActual`.
- 🔴 5.3: `ReservaService.agendarSiguienteCursoPack` (agendar el siguiente curso desde `/mi-pack/:id/agendar`).
- 🟡 5.4: Página `/mi-pack/:id/agendar`.
- 🟡 5.5: Botón "Agendar" en `PackDetalleEstudiante` cuando el curso actual no tiene reserva.
- 🟢 5.6: Testing E2E completo.

---

## Actualización 28/09/2026 – Fase 5 del Pack Comercial COMPLETA + fixes críticos

**Completado en esta sesión:**

### Fix visual y semántico
- ✅ Filtro correcto de child activa por `packCursoIndex === cursoActual` en `EstudiantePanel` y `PackDetalleEstudiante`.
- ✅ Cards de "Próximo curso" vs "Curso actual" con "Pendiente de agendar".
- ✅ Etiquetas dinámicas: `Completado` / `En Curso` / `Disponible` / `Bloqueado` (en lugar de `Activo` genérico).
- ✅ Rango de fechas completo en `PackDetalleEstudiante` (fecha + fecha2).

### Fase 5 — agendamiento secuencial
- ✅ `useDisponibilidadPack.js` (nuevo hook) — copia de `evaluarDisponibilidad` con 4 validaciones: bloqueosAdmin, bloqueosProveedor, horariosPorSede, cursoUnDia.
- ✅ `AgendarPackView.jsx` (nueva página) — reutiliza `Paso3Horario` + `CalendarioFlotante`.
- ✅ Ruta `/mi-pack/:packReservaId/agendar`.
- ✅ Botón "Agendar fecha" en `PackDetalleEstudiante` cuando el curso actual no tiene `reservaId`.
- ✅ `ReservaService.agendarSiguienteCursoPack(packData, lockId)` — 5 escrituras atómicas: child (`estadoPago: 'Aprobado'`) + espejo + maestra (`subReservas[i].reservaId` + `cursoReservaId`) + purga de locks.
- ✅ `ReservaService.avanzarPackTrasCompletarCurso(packReservaId, childId, cursoActualIndex)` — 3 idempotencias, sin mutar `cursoReservaId`.
- ✅ Fire-and-forget en `useSessionTimer.finalizarModulo` + `completarCursoManualmente`.

### Reglas Firestore dev
- ✅ `reservasPack.read`: rama instructor (faltaba, causaba permission-denied al `getDoc`).
- ✅ `reservasPack.update`: rama instructor con `hasOnly(['subReservas', 'cursoActual', 'estado'])`.
- ✅ `reservas.create`: bifurcación — reserva individual → `estadoPago: 'Pendiente'`; `pack_sub` → `estadoPago in ['Pendiente', 'Aprobado']` + valida `packReservaId`.

### Fix crítico de asignación de instructor
- ✅ Filtro por `curso.instructoresPermitidos` en `useDisponibilidadPack.js` (declaración + 2 filtros).
- ✅ Defensa en profundidad en `AgendarPackView.handleSelectHorario` (revalidación del instructor antes de crear lock).

### Fix en PROD
- ✅ Reservas de Carlos Alberto Azuaje Mujica: Equilibrio (`SB3rFGFDQzf63Lrn335s`) con 3 módulos completados el 27/09/2026 (8:30-12:40). Básico (`mpwdheYKKxQwGRxhuydO`) con avance académico reseteado.
- Backup en `backup/prod/reservas-carlos-2026-09-28T01-21-45.json`.

### Documentación nueva
- ✅ `INSTRUCCIONES_A_LA_IA.md` (457 líneas) — onboarding autocontenido para nuevas instancias de IA.

**Deuda técnica nueva:**
- 🟡 3.8d: Email al estudiante al aprobar pack (diferido).
- 🟡 Receso automático por tiempo real de sesión (no por módulo) — deuda heredada.
- 🟡 Alquiler de moto en Práctica en Vía dentro del pack (precio dinámico del pack según alquiler).
- 🟡 Consolidar `evaluarDisponibilidad` de `InscripcionView` con `useDisponibilidadPack` en un único SSOT.

**Pendiente próxima sesión:**
- 🔴 Deploy de Fases 3.8c/e + 5 completa a PROD.
- 🟡 3.8d: Email al estudiante.
- 🟡 Replicar reglas Firestore actualizadas a PROD.
- 🟡 Migrar la child existente con `cursoReservaId` en dev si aplica.
- 🟡 Probar casos borde: pack vencido durante agendamiento, cursos de 2 días con `fecha2`, cambio de instructor entre sesiones.

---

### Sesión 2026-09-28 – Bug detectado en Paso 3: no revalida disponibilidad al cambiar tipo de moto/curso

**[CRÍTICO] B-REG-PASO3-TIPOMOTO** – Regresión detectada durante smoke test post-fase 1.

**Reproducción:**
1. Inscripción normal, curso Básico Automática + moto automática de la escuela.
2. Paso 3: seleccionar bloque (ej. h1 = 08:00-10:00 AM). El sistema crea lock + marca el bloque como seleccionado.
3. Retroceder al Paso 2.
4. Cambiar a Básico Sincrónica (moto sincrónica, recursos distintos).
5. Volver al Paso 3.

**Comportamiento actual:**
El bloque h1 sigue apareciendo como "seleccionado" aunque los recursos del tipo nuevo (moto sincrónica + instructor correspondiente) puedan estar ocupados en ese bloque. El sistema NO revalida disponibilidad al cambiar el tipo de moto.

**Comportamiento esperado:**
Al cambiar cualquier parámetro que afecte la disponibilidad (tipo de moto, curso, sede, traeMoto), el bloque seleccionado debe resetearse, el lock anterior debe liberarse, y el sistema debe revalidar disponibilidad contra los recursos del nuevo tipo.

**Impacto:**
🔴 CRÍTICO — Permite colisión de recursos (doble booking) cuando un estudiante retrocede y cambia el tipo de moto.

**Áreas afectadas (a investigar):**
- `src/modules/inscripcion/views/InscripcionView.jsx` — estado del lock/selección.
- `src/modules/inscripcion/hooks/useInscripcionState.js` — probablemente maneja el reset de estado.
- `src/modules/inscripcion/services/LockService.js` — liberación de lock previo al cambiar tipo.
- Posiblemente `useDisponibilidad.js` — si el cálculo no se re-ejecuta al cambiar tipoMoto.

**Origen:** regresión detectada durante smoke test post-fase 1 del sistema de reprogramación D2 (28/09/2026).

**Acción:** pendiente de investigación + consulta a FIRE + MAMBA.

---

### Sesión 2026-09-28 – Bug en cálculo de disponibilidad tras reprogramación D2

**[CRÍTICO] B-REG-DISPONIBILIDAD-H3** – Detectado durante smoke test post-fase 1.

**Síntoma:**
Tras reprogramar D2 al bloque h3 (almuerzo), el cálculo de disponibilidad
en inscripción sigue considerando h6 (bloque original) como ocupado y h3
como libre.

**Causa raíz:**
El espejo `ocupacionConfirmada` se actualizó con `horaIdReposicion: 'h3'`
pero mantiene `horaId: 'h6'`. Los consumidores de disponibilidad
(`useOcupacionConfirmada`, `evaluarDisponibilidad`) leen solo `horaId`,
no consideran `horaIdReposicion`.

**Impacto:**
🔴 CRÍTICO — El sistema no refleja correctamente la ocupación real tras
una reprogramación. Puede permitir doble booking en h3 o bloquear h6
innecesariamente.

**Archivos potencialmente afectados (a investigar):**
- `src/hooks/useOcupacionConfirmada.js`
- `src/modules/inscripcion/views/InscripcionView.jsx` (`evaluarDisponibilidad`)
- `src/modules/inscripcion/hooks/useDisponibilidad.js`
- `src/modules/inscripcion/components/Paso3Horario.jsx`
- Espejo `ocupacionConfirmada` (estructura de datos)

**Origen:** omisión del plan original de Fase 1 — no se propagó la lógica
de `horaIdReposicion` a todos los consumidores de disponibilidad.

**Acción:** consulta a FIRE + MAMBA antes de tocar. Requiere diseñar
cómo el espejo refleja "el bloque real donde se dicta cada día".

---

### Respuesta a pregunta del Operador (28/09/2026)

**¿El admin puede reprogramar una sola vez?**

Actualmente el código **no bloquea** al admin. Incrementa
`reprogramacionesCount` pero no valida el límite. La regla "1 sola vez"
está definida solo para el estudiante (Fase 2, aún no implementada).

**Pendiente confirmar con el Operador si el admin debe tener límite.**

---

### Sesión 2026-09-28 – Bug en cálculo de disponibilidad tras reprogramación D2

**[CRÍTICO] B-REG-DISPONIBILIDAD-H3** – Detectado durante smoke test post-fase 1.

**Síntoma:**
Tras reprogramar D2 al bloque h3 (almuerzo), el cálculo de disponibilidad
en inscripción sigue considerando h6 (bloque original) como ocupado y h3
como libre.

**Causa raíz:**
El espejo `ocupacionConfirmada` se actualizó con `horaIdReposicion: 'h3'`
pero mantiene `horaId: 'h6'`. Los consumidores de disponibilidad
(`useOcupacionConfirmada`, `evaluarDisponibilidad`) leen solo `horaId`,
no consideran `horaIdReposicion`.

**Impacto:**
🔴 CRÍTICO — El sistema no refleja correctamente la ocupación real tras
una reprogramación. Puede permitir doble booking en h3 o bloquear h6
innecesariamente.

**Archivos potencialmente afectados (a investigar):**
- `src/hooks/useOcupacionConfirmada.js`
- `src/modules/inscripcion/views/InscripcionView.jsx` (`evaluarDisponibilidad`)
- `src/modules/inscripcion/hooks/useDisponibilidad.js`
- `src/modules/inscripcion/components/Paso3Horario.jsx`
- Espejo `ocupacionConfirmada` (estructura de datos)

**Origen:** omisión del plan original de Fase 1 — no se propagó la lógica
de `horaIdReposicion` a todos los consumidores de disponibilidad.

**Acción:** consulta a FIRE + MAMBA antes de tocar. Requiere diseñar
cómo el espejo refleja "el bloque real donde se dicta cada día".

---

### Respuesta a pregunta del Operador (28/09/2026)

**¿El admin puede reprogramar una sola vez?**

Actualmente el código **no bloquea** al admin. Incrementa
`reprogramacionesCount` pero no valida el límite. La regla "1 sola vez"
está definida solo para el estudiante (Fase 2, aún no implementada).

**Pendiente confirmar con el Operador si el admin debe tener límite.**

---

### Sesión 2026-09-29/30 – Posible bug: corrimiento +1 día en selección de fechas (NO CONFIRMADO)

**Estado:** 🔍 Posible bug — esperando más evidencia.

**Caso reportado:**
- Cliente: Giovanny Valera (`kingfaraon1809@gmail.com`, cédula 14471265)
- Reserva: `YNDvfzJqfF5A`
- Creada: 25/09/2026 16:41 VET
- Curso: Básico Automática
- Cliente dice haber seleccionado: sábado 26 + domingo 27
- Sistema guardó: 27/09 + 28/09 (+1 día en ambas)

**Investigación realizada (30/09):**
- `getTodayStr()` en `FirestoreProvider.js` está bien implementado (Intl.DateTimeFormat + America/Caracas). NO es bug de UTC.
- El cliente se inscribió a las 16:41 VET → lejos de medianoche → no aplica corrimiento por zona horaria.
- Auditoría de las 6 reservas creadas el 25/09: **solo Giovanny muestra el patrón anómalo.** Los demás eligieron fechas futuras legítimamente.
- Conclusión: NO es un bug sistemático.

**Hipótesis pendientes de verificar:**
1. Cliente seleccionó 27 por error (mal uso).
2. El `useEffect` del paso 3 (línea 773 de `InscripcionView`) auto-asignó el 27 si el 26 no estaba disponible en ese momento, y el cliente no reparó.
3. Navegador in-app (TikTok/Instagram) con timezone distinta a VET.

**Acción pendiente:**
- Reproducir el flujo en dev con cronómetro antes/después de elegir la fecha.
- Preguntar al cliente desde qué navegador se inscribió.
- Si se reproduce → ticket con fix.
- Si no se reproduce → cerrar como "no reproducible / mal uso probable".

**Prioridad:** 🟢 Baja (no confirmado, no sistemático).

---

### Sesión 2026-09-30 – Bug refresh en pasos 2-4 (regresión confirmada)

**Estado:** 🔴 ALTA — reportado en vivo por el Operador.

**Reproducción:**
1. Estudiante nuevo entra a `/inscripcion`.
2. Completa Paso 1 (datos personales).
3. Avanza al Paso 2.
4. **Recarga la página** (F5 / Ctrl+R).
5. El sistema redirige de vuelta al Paso 1.
6. **El campo Cédula queda bloqueado (readonly) y vacío.**
7. No se puede completar ni avanzar → bloqueo total.

**Observación:** El campo Cédula aparece como "Vinculada a tu cuenta" pero vacío. El sistema probablemente detecta sesión activa (Firebase Auth), intenta leer la cédula del usuario y falla porque el progreso no se restauró correctamente tras la recarga.

**Causa probable:**
- `useEffect` de `publicoInicializadoRef` (useRef) se resetea en refresh.
- `limpiarSesion()` borra `sessionStorage`.
- `setStep('1')` devuelve al inicio.
- Falta persistencia de `step` y `form` en `sessionStorage` o `localStorage`.

**Archivos potencialmente afectados:**
- `src/modules/inscripcion/views/InscripcionView.jsx` (useEffect de origen público)
- `src/modules/inscripcion/hooks/useInscripcionState.js` (persistencia de paso/datos)
- `src/modules/inscripcion/components/Paso1DatosPersonales.jsx` (bloqueo de cédula)

**Ya estaba registrado previamente como:**
- "🔴 ALTA — Bug refresh: pérdida de estado en pasos 2-4"
- Ticket A2.8 (pendiente de consulta a FIRE + MAMBA)

**Acción:** consultar a FIRE + MAMBA antes de tocar. Requiere diseño de persistencia robusta.

---

### Sesión 2026-09-29/30 – Deuda técnica acumulada

**Deuda CRÍTICA:**

**[CRÍTICO] B-REG-PASO3-TIPOMOTO** – Retroceder en Paso 3 y cambiar tipo de moto no revalida disponibilidad.
- Reproducción: Paso 3 con Básico Automática + moto auto, seleccionar bloque, volver al Paso 2, cambiar a Básico Sincrónica, volver al Paso 3. El bloque anterior sigue marcado como seleccionado aunque los recursos del nuevo tipo estén ocupados.
- Impacto: Doble booking potencial.
- Estado: pendiente consulta FIRE + MAMBA.

**[CRÍTICO] B-REG-DISPONIBILIDAD-H3** – (RESUELTO en esta sesión, pero duplicado en este archivo, limpiar).
- El espejo `ocupacionConfirmada` no propagaba `horaIdReposicion` correctamente.
- RESUELTO con migración de consumidores a `getHoraIdOcupacion`.
- Acción: eliminar entrada duplicada.

**Deuda ALTA:**

**[ALTA] B-REG-BOOTSTRAP-INSCRIPCION** – Refresh en Pasos 2-4.
- Causa: `publicoInicializadoRef` (useRef) + `location.state` persistente tras F5.
- RESUELTO con ALT-B modificado (bootstrap consolidado de 7 fases).
- Pendiente: smoke test E2E.

**[ALTA] B-REG-CEDULA-BLOQUEADA** – Cédula bloqueada y vacía con `fbUser`.
- Causa: `disabled={!!fbUser}` en `Paso1DatosPersonales.jsx` sin precarga.
- RESUELTO con FASE 7 del bootstrap (precarga de correo).
- Nota: la precarga de cédula podría requerir traer la última reserva del usuario si el progreso no existe.

**[ALTA] B-REG-FECHA-CORRIDA** – Cliente reportó corrimiento +1 día (Giovanny Valera, 25/09).
- Cliente seleccionó 26+27/09, sistema guardó 27+28/09.
- Solo 1 caso detectado en auditoría. Otros usuarios del día OK.
- Hipótesis: navegador in-app (TikTok) con timezone distinta.
- Estado: NO reproducido. Registrado como posible bug.
- Archivos afectados (candidatos): `CalendarioFlotante.jsx` (toISOString sin timeZone), `Paso3Horario.jsx` (reference con toISOString).

**Deuda MEDIA:**

**[MEDIA] Consolidar disponibilidad en SSOT único.**
- `evaluarDisponibilidad` de `InscripcionView` y `useDisponibilidadPack` son ~95% idénticos.
- Duplicación de lógica.
- Extraer a util compartido `src/modules/inscripcion/utils/disponibilidad.js`.

**[MEDIA] Extraer bootstrap a hook `useInscripcionDispatcher`.**
- `InscripcionView.jsx` tiene ~85 líneas de lógica de bootstrap en 1 useEffect.
- Extraer a hook dedicado para testabilidad.

**[MEDIA] Receso automático por tiempo real.**
- Actualmente se activa a los 55 min del módulo activo.
- Con módulos de duración variable, puede no activarse.
- Objetivo: receso cada 55 min reales de sesión.
- Archivos afectados: `useSessionTimer.js`, `AulaVirtualView.jsx`, `alertas.js`.

**[MEDIA] Resolver toasts fantasma en `AppContext`.**
- `showToast` de `AppContext` no renderiza el toast.
- Detectar y consolidar con `ToastProvider`.

**Deuda BAJA:**

**[BAJA] Limpiar reserva `bGLolv1sndec`** – 7 reprogramaciones de prueba. Dejar 1.

**[BAJA] Backup previo en `firebase.json`** – sin timestamp consistente.

**[BAJA] Comentarios `@build`** en archivos modificados hoy, actualizar headers.

**Deuda INFO:**

**Replicar a PROD:**
- Feature Reponer D2 completa.
- Fix prereq bypass (3 capas).
- Fix moto (2 capas).
- Fix bootstrap registro.

Todo pendiente de verificación en dev primero.


---

## Actualización 30/09/2026 – Cierre de sesión: deploy prod + módulo teórico

**Deuda saldada:**
- ✅ Terminología legal Fase 1 completa.
- ✅ Terminología legal Fase 2 completa (paneles estudiante/tutor/proveedor).
- ✅ Fix bootstrap /inscripcion (A2.8).
- ✅ Feature Reponer D2 + fix moto (Grupo Y).
- ✅ Feature #2/#8 Recibos por WhatsApp + llamar por teléfono.
- ✅ Bug duplicate key en notificaciones.
- ✅ Optimización notificaciones (getDocs + refreshNotificaciones).

**Deuda técnica NUEVA priorizada:**

### 🔴 ALTA — Módulo Teórico: Fase 3 pendiente
**Descripción:** El módulo teórico tiene Fase 1 (reglas Firestore) y Fase 2 (CRUD admin). Falta todo el flujo de usuario.

**Pendientes:**
- Vista pública `/teorico` con listado de cursos.
- Panel del estudiante con tab "Contenido Teórico".
- Vista de curso con learning path visual.
- Vista de módulo: lecciones + videos + quizzes.
- Modo audio con Web Speech API.
- Streaks con sync a Firestore.
- Flujo de compra (pago Pago Móvil + aprobación admin).
- Editor de quizzes accesible desde el admin (ya está el FormModuloTeorico con soporte de quiz, pero falta el quiz editor como componente separado si se quiere experiencia más rica).

### 🟡 MEDIA — Eliminar logs de debug del `useSessionTimer.js`
**Descripción:** Quedaron varios `console.log` de diagnóstico de la sesión de D1/D2. Ocultos al usuario pero ensucian la consola.

### 🟡 MEDIA — Optimizar listener de reservas admin (`FirestoreProvider.js`)
**Descripción:** `onSnapshot(limit 100)` para admin. Podría migrarse a `getDocs` bajo demanda como se hizo con notificaciones.

### 🟢 BAJA — Consolidar disponibilidad en SSOT único
**Descripción:** `evaluarDisponibilidad` (InscripcionView) vs `useDisponibilidadPack` siguen duplicados.

### 🟢 BAJA — Reserva `bGLolv1sndec` con 7 reprogramaciones de prueba
**Descripción:** Limpiar manualmente.

### 🔵 INFO — Proyecto `motoescuela-139e4`
**Descripción:** Proyecto Firebase vacío detectado. Candidato a eliminar desde la consola.

---

---

### CIERRE 2026-10-02 — Bug de sangrado de notificaciones (Firestore plan Spark)

**BUG CERRADO:** `[BUG-NOTIF-LEAK]` Sangrado de escrituras en `notificaciones` (dev y prod).

**Síntomas:**
- Warning React: `Encountered two children with the same key`.
- Consumo desproporcionado de Firestore plan Spark (4265 docs en dev, 3758 en prod).
- Cada recarga del admin generaba ~100 `setDoc`.
- Dropdown mostraba "Hoy" en notificaciones de reservas viejas.

**Causa raíz:**
1. `saveNotificacion` sin `useCallback` → identidad inestable → effect re-disparado en cada render.
2. `prevReservasRef.current` (useRef) se pierde en cada recarga → todas las reservas se ven como "nuevas".
3. `setNotifications(prev => [...prev, newItem])` acumulaba sin dedupe.

**Solución aplicada (3 capas):**
- `FirestoreProvider.js`: memoización + idempotencia de `setNotifications`.
- `NotificationDropdown.jsx`: dedupe defensivo por `id`.
- `NotificationsProvider.jsx`: IDs determinísticos + bootstrap silencioso.
- Eliminado fantasma `FirestoreProvider.jsx` en dev y prod.

**Estado:** ✅ Cerrado en dev y prod (deploy completo).

**Backups:** `backup/notif-cleanup/`, `backup/notif-dates/`, `backup/notif-dates-v2/`, `backup/pre-deploy-notif/`.

---

### CIERRE 2026-10-02 — Migración de fechas de notificaciones (prod)

**BUG CERRADO:** `[BUG-NOTIF-FECHA-HOY]` Notificaciones de reservas viejas mostraban "Hoy".

**Causa:** el sangrado reescribía `createdAt: new Date()` en cada regeneración.

**Solución:** migradas 116 notificaciones `nueva_reserva` al `createdAt` de su reserva.
- v1 (threshold 7 días): 42 notifs.
- v2 (threshold 1 hora): 74 notifs.

**Estado:** ✅ Cerrado. Verificación final: 0 desfasadas.

---

### CIERRE 2026-10-02 — Caso Richard Vallenilla (prod)

**BUG CERRADO:** `[BUG-HUERFANO-PROGRESO]` "PIN no coincide" + "correo vinculado a tu cuenta".

**Causa:** cuenta Auth eliminada manualmente + doc `progresoInscripcion` huérfano con `userId` desincronizado + `pin: ''`. Regla Firestore bloqueaba sobrescribir, error silenciado por `.catch(() => {})`.

**Solución inmediata:** eliminado doc `progresoInscripcion/rvallenilla28_gmail_com`.

**Estado:** ✅ Richard desbloqueado. **Fix de raíz PENDIENTE** (ver deuda abajo).

---

### CIERRE 2026-10-02 — Fase 1 cleanup prod

**Acciones ejecutadas (5):**
- Cuenta Auth `523523532@ewrwdkd.com` (prueba).
- Progresos huérfanos `leyda2012_gmail_com`, `yorfrank_prueba_com`.
- Cursos legacy `c1`, `c2`.

**Estado:** ✅ Completado. Backup en `backup/cleanup-fase1/`.

---

### 🆕 Deuda técnica nueva — prioridad ALTA

**[DEUDA-FIX-REGLA-PROGRESO]** Regla Firestore `progresoInscripcion.update` bloquea sobrescribir cuando `userId` cambió (cuenta Auth borrada y recreada).

- **Impacto:** cada vez que el admin borra una cuenta Auth sin borrar su progreso, el usuario queda bloqueado en su próximo intento.
- **Detección:** quedan 0 huérfanos en prod (los 2 detectados fueron eliminados), pero el bug va a reaparecer.
- **Acción propuesta:** cambiar validación por `docId` en vez de `resource.data.userId`. Requiere consulta a FIRE + MAMBA.
- **Prioridad:** alta (bloquea usuarios reales).

**[DEUDA-DROPDOWN-VACIO-DEV]** Dropdown de notificaciones en dev muestra "No tienes notificaciones" aunque Firestore tiene 225 docs.

- **Impacto:** solo cosmético en dev. **Prod funciona correctamente.**
- **Hipótesis:** bug de render/contexto (`isAdmin` timing, o el padre no re-renderiza con el valor del contexto).
- **Acción propuesta:** revisar `DashboardHeader.jsx` (cómo obtiene `notifications`) y `AppContext.jsx` (exponer la función).
- **Prioridad:** baja (dev-only).

**[DEUDA-SORT-DROPDOWN]** Sort del dropdown prioriza "no leídas" por encima de la fecha.

- **Impacto:** "Ayer no leídas" aparecen arriba de "Hoy leídas". Confunde al usuario.
- **Acción propuesta:** cambiar a sort puramente por `createdAt desc`. El indicador visual (punto azul) ya distingue las no leídas.
- **Prioridad:** media (UX).

---

### 📋 Estado general del proyecto al 02/10/2026

**Dev:**
- Fix notif completo y verificado.
- Limpieza Firestore ejecutada (225 docs).
- Migración de fechas ejecutada.
- **Pendiente:** commit + push a GitHub.

**Prod:**
- Deploy completo: fix notif + fantasma eliminado + build PWA.
- Limpieza Firestore ejecutada (332 docs).
- Migración de fechas ejecutada.
- Fase 1 cleanup ejecutada.
- Richard desbloqueado.

**Firestore prod:**
- `notificaciones`: 332 docs, 0 desfasadas.
- `progresoInscripcion`: 218 docs (0 huérfanos).
- `locks` + `ocupacionTemporal`: 0 docs.
- Cursos: sin legacy (`c1`, `c2` eliminados).

---

### 🎯 Prioridades próximas sesiones

1. 🔴 **Fix regla `progresoInscripcion`** (FIRE + MAMBA).
2. 🟡 **Sort dropdown por fecha** (1 línea, UX).
3. 🟡 **Módulo Teórico Fase 3** (frente original sin arrancar).
4. 🟢 **Dropdown vacío dev** (dev-only).
5. 🟢 **Commit + push GitHub.**


---

### CIERRE 2026-10-02 — Bug de huérfanos en `progresoInscripcion` (caso Richard)

**BUG CERRADO:** `[BUG-HUERFANO-PROGRESO]` "PIN no coincide" + "correo vinculado a tu cuenta".

**Síntoma:** usuario con cuenta Auth eliminada manualmente por admin no puede reinscribirse. Progreso huérfano con `pin: ''` bloquea el flujo.

**Causa raíz (3 capas):**
1. Regla `progresoInscripcion.update` exigía `resource.data.userId == request.auth.uid`.
2. Cuando admin borra cuenta Auth, el `userId` del doc queda desincronizado.
3. El `.catch(() => {})` en `InscripcionView.jsx` silenciaba el error `permission-denied`.

**Solución aplicada (A6 + OP-A):**
- **Regla A6:** `allow update/delete if userId coincide OR (correo coincide AND pin == '')`.
- **Log de adopción** en `ReservaService.guardarProgreso`.
- **Helper `guardarProgresoConRetry`** (3 intentos 1s + 2s).
- **Aborto con toast** en los 3 pasos (reemplaza `.catch` silencioso).

**Tests ejecutados (dev):**
- ✅ Positivo: doc con `pin: ''` → adoptado.
- ✅ Negativo: doc con `pin != ''` → bloqueado.
- ✅ Refresh en Pasos 2, 3, 4 → mantiene.
- ✅ Flujo normal end-to-end → sin errores.

**Estado:** ✅ Cerrado en dev y prod. Commit `54369404`.

**Backups:** `backup/fix-huerfano/*.backup-20261001-221901` (dev) + `*.backup-20261001-230457` (prod).

---

### 🆕 Deuda técnica nueva — prioridad MEDIA

**[DEUDA-DOCID-CORREO]** `progresoInscripcion` usa correo sanitizado como docId.

- **Riesgo:** el correo es mutable (el usuario puede cambiarlo). Antipatrón NoSQL.
- **Acción propuesta:** refactor futuro a `docId = Auth UID`. Requiere migración de 219 docs.
- **Prioridad:** media (funciona, pero es deuda estructural).

**[DEUDA-TOAST-CRIPTICO]** Error `Missing or insufficient permissions` se muestra crudo al usuario.

- **Causa:** `AuthService.crearEstudiante` propaga `error.code: 'permission-denied'` sin traducción. `handleNext` muestra `result.error.message` sin filtro.
- **Acción propuesta:** mapa de traducciones en `handleNext` o `AuthService`.
- **Prioridad:** media (UX).

**[DEUDA-RULES-WARNINGS]** Warnings de compilación en `firestore.rules`:
- Línea 15:9 → `Invalid variable name: resource`.
- Línea 15:39 → `Invalid variable name: request`.
- Línea 19:14 → `Unused function: esLockCorrupto`.

- **Impacto:** cosmético, no bloquea deploy.
- **Acción propuesta:** revisar estructura de `match` anidado y limpiar función sin uso.
- **Prioridad:** baja.

**[DEUDA-SORT-NOTIF]** Sort de notificaciones prioriza no-leídas sobre fecha.

- **Impacto:** "Ayer no leídas" aparecen arriba de "Hoy leídas". UX confuso.
- **Acción propuesta:** sort puramente por `createdAt desc` (indicador visual ya distingue).
- **Prioridad:** media (UX).

**[DEUDA-DROPDOWN-VACIO-DEV]** Dropdown de notificaciones en dev muestra "No tienes notificaciones" aunque Firestore tiene docs.

- **Impacto:** dev-only. Prod funciona.
- **Hipótesis:** bug de render/contexto en `DashboardHeader.jsx`.
- **Prioridad:** baja (dev-only).

---

### 📋 Estado general del proyecto al 02/10/2026 (cierre de sesión)

**Dev:**
- Fix notif completo (3 capas + limpieza).
- Limpieza de notificaciones: 4265 → 225.
- Migración de fechas de notificaciones: 116 corregidas.
- Fix huérfanos A6 aplicado + tests positivos.
- Build limpio.

**Prod:**
- Deploy del fix notif.
- Deploy del fix A6 (reglas + hosting).
- Limpieza de notificaciones: 3758 → 332.
- Migración de fechas: 116 corregidas.
- Richard desbloqueado.
- Fase 1 cleanup: 5 items eliminados.
- Commits `f3847e53` (notif) + `54369404` (A6).

**Pendiente próximo:**
- Verificar A6 en prod con flujo real.
- Módulo Teórico Fase 3 (frente original).
- Sort de notificaciones por fecha (1 línea).
- Depuración de warnings de `firestore.rules`.


---

### CIERRE 2026-10-03 — Bug SSOT tipoMoto en sub-reservas de pack

**BUG CERRADO:** `[BUG-PACK-TIPOMOTO]` Sub-reserva de Equilibrio heredaba tipoMoto del pack (Sincrónica) en vez del curso (Automática).

**Síntoma:** pack Sincrónico → child de Equilibrio con moto Sincrónica + proveedor incorrecto.

**Causa raíz (3 capas):**
1. `InscripcionView.jsx`: `tipoMotoDerivado` calculado desde `cursoBasico`, no desde el curso a agendar.
2. `ReservaService.crearReservaPack`: copiaba `packData.tipoMoto` sin validar.
3. `ReservaService.agendarSiguienteCursoPack`: idem (fix previo insuficiente).

**Fix aplicado (SSOT + blindaje):**
- `InscripcionView.jsx:680`: derivar de `cursoEquilibrio.tiposMotoEscuela`.
- `ReservaService.js:405` y `:618`: blindaje backend con validación contra `cursoData.tiposMotoEscuela`.
- `AgendarPackView.jsx:196`: helper `tipoMotoEfectivo`.

**Estado:** ✅ Cerrado en dev y prod. Commit `71dff8aa`.

**Backups:** `backup/deploy-teorico-pack-aula/*.backup-20261003-131410` (prod).

---

### CIERRE 2026-10-03 — Palabras prohibidas en Aula Virtual

**BUG CERRADO:** `[BUG-PALABRAS-PROHIBIDAS-AULA]` Textos visibles con "Curso" en el Aula Virtual.

**Cambios:**
- `ResumenFinal.jsx`: "Curso Completado" → "Sesión Completada".
- `useSessionTimer.js`: 3 textos migrados (programado / vencido / completado).

**Estado:** ✅ Cerrado en dev y prod.

---

### CIERRE 2026-10-03 — Desborde de duraciones en ResumenFinal

**BUG CERRADO:** `[BUG-DESBORDE-RESUMEN]` Duraciones de módulos y total se salían del contenedor en mobile.

**Fix:**
- `ResumenFinal.jsx`: `gap-2`, `text-xs`, `flex-shrink-0 whitespace-nowrap` en duraciones.
- Bloque total: `gap-3`, `flex-1 min-w-0` + `flex-shrink-0 whitespace-nowrap`.

**Estado:** ✅ Cerrado. Verificado en mobile real.

---

### BLOQUE 1 COMPLETADO — Módulo Teórico (vista pública)

**Implementado:**
- `TeoricoPublicoView.jsx`: catálogo `/teorico` con grid de tarjetas.
- `ModalDetalleTeorico.jsx`: modal de detalle.
- `App.jsx`: ruta `/teorico`.
- `HomeView.jsx`: rediseño con botón "Aprende Online" (grid 2 cols).
- Terminología legal: "Módulo Formativo", "Formación Educativa", "Retos".

**Deploy:** ✅ Prod.

**Pendiente:**
- Bloque 2: panel estudiante tab "Formación" (lista de módulos comprados).
- Bloque 3: vista de módulo con lecciones + retos.
- Bloque 4: vista detalle de contenido (video/lección/quiz).
- Bloque 5: flujo de compra standalone.
- Integración con packs comerciales (módulos teóricos dentro de packs).

---

### 🆕 Deuda técnica nueva

**[DEUDA-ORDEN-CURSOS-PACK]** Packs asumen Equilibrio en posición 0 (`cursosPack[0]`).

- **Riesgo:** si se crea un pack con otro orden (ej. básico primero), se rompe el flujo.
- **Acción propuesta:** validar explícitamente que `cursosPack[0].tipoCurso === 'equilibrio'` o derivar el curso a agendar por `pack.cursoActual` sin asumir posición.
- **Prioridad:** media (funciona hoy, frágil a futuro).

**[DEUDA-DOCID-CORREO]** (arrastrada) `progresoInscripcion` usa correo sanitizado como docId.

- **Riesgo:** correo es mutable. Antipatrón NoSQL.
- **Acción propuesta:** migrar a Auth UID. 219 docs.
- **Prioridad:** media.

**[DEUDA-DROPDOWN-VACIO-DEV]** Dropdown notificaciones vacío en dev.

- **Impacto:** dev-only.
- **Prioridad:** baja.

**[DEUDA-RULES-WARNINGS]** Warnings de compilación en `firestore.rules` (línea 15 + `esLockCorrupto` sin usar).

- **Impacto:** cosmético.
- **Prioridad:** baja.

---

### 📋 Estado general del proyecto al 03/10/2026

**Dev:**
- Fix SSOT tipoMoto packs ✅
- Fix palabras prohibidas Aula ✅
- Fix desborde ResumenFinal ✅
- Bloque 1 Módulo Teórico ✅
- Build limpio.

**Prod:**
- Deploy completo (9 archivos) ✅
- Commit `71dff8aa` en `origin/main` ✅
- Reglas Firestore sincronizadas ✅
- Verificación visual OK ✅

**Commits recientes:**
- `f3847e53`: fix notificaciones + cleanup.
- `54369404`: A6 adopción huérfanos.
- `71dff8aa`: SSOT tipoMoto + palabras prohibidas + Bloque 1 Teórico.

**Pendiente próximo:**
- Módulo Teórico Bloque 2 (panel estudiante).
- Deuda orden de cursos en packs.


---

### CIERRE 2026-10-07 — Reservas 06/10 con timers incorrectos (apagón)

**BUG CERRADO:** `[BUG-TIMER-POST-APAGON]` 3 reservas del 06/10 quedaron con timers incorrectos.

**Causa:** duración del curso cambiada de 240 a 120 mientras había reservas activas.
Parámetros congelados (`sesionTotalLimite`, `sesionDiariaLimite`, `fecha2`) quedaron desincronizados.

**Fix aplicado:**
- Lisbeth Aleman: `sesionTotalLimite` 240 → 120, `sesionDiariaLimite` 240 → 120, timers limpiados.
- Maikel Hernández: `sesionDiariaLimite` 60 → 120, módulo "Dinámica de Inercia" completado, estadoCurso='Aprobado'.
- Olga García: 4 módulos del Refuerzo Práctico completados, estadoCurso='Aprobado'.

**Backups:** `backup/fix-reservas-06oct/docs-2026-10-07T10-38-07-938Z.json`

**Estado:** ✅ Cerrado en prod.

---

### CIERRE 2026-10-07 — Módulos huérfanos del pensum viejo (12 reservas)

**BUG CERRADO:** `[BUG-MODULOS-HUERFANOS]` 12 reservas con módulos con nombres del pensum viejo.

**Ejemplos:** "Practicas de Equilibrio", "Coordinación Motora" (sin "y Acelerador"), "Aceleración y Frenado" (sin "en Recta").

**Fix aplicado:**
- 90 módulos agregados con duraciones reales del curso actual.
- 19 módulos huérfanos eliminados.
- `estadoCurso: 'Aprobado'` seteado en las 12 reservas.

**Backups:** `backup/fix-modulos-faltantes-v2/docs-2026-10-07T10-50-06-162Z.json`

**Estado:** ✅ Cerrado en prod.

---

### CIERRE 2026-10-09 — Bug de scope en Firestore Rules (`logrosUsuario`)

**BUG CERRADO:** `[BUG-RULES-SCOPE]` `logrosUsuario.read` fallaba con `permission-denied` a pesar de tener la misma regla `isAuth()` que `modulosTeoricos`.

**Causa raíz:** el `match /logrosUsuario/{uid}` estaba FUERA del bloque `match /artifacts/{appId}/public/data`. El código leía desde adentro → default deny.

**Diagnósticos que NO aplicaron:**
- Multi-tab persistence → descartado.
- Cache corrupto (getDocFromServer) → descartado.
- uid stale (hardcoded) → descartado.

**Fix aplicado:** mover el `match` dentro de `artifacts/{appId}/public/data`.

**Lección registrada:** cuando una regla falla solo para una colección específica, comparar la ubicación jerárquica del match.

**Estado:** ✅ Cerrado en dev. Pendiente deploy a prod.

---

### CIERRE 2026-10-09 — Modelo SSOT de usuarios (Fases 1 + 2)

**FEATURE COMPLETADA:** `[FEAT-SSOT-USUARIOS]`

**Implementado:**
- Nueva colección `usuarios/{uid}` con PII.
- `UsuarioService.js` + `AuthProvider.restoreUserRole` rehidratando perfil.
- `InscripcionView` + `InscripcionTeoricoView` escriben perfil al Paso 1.
- Script `migrar-usuarios.mjs` para migración masiva (155 usuarios en dev).
- Campo `capacidades` + `contadores` para UI dinámica futura.

**Bug resuelto:** header "Estudiante / No registrado".

**Backups:** `backup/migracion-usuarios/plan-2026-10-09T23-40-05-048Z.json`

**Estado:** ✅ Completo en dev. Pendiente deploy a prod.

---

### CIERRE 2026-10-09 — Bloque 5 Módulo Teórico (Fases 5a y 5b)

**FEATURE COMPLETADA:** `[FEAT-BLOQUE5-TEORICO]`

**Fase 5a — Compra standalone:**
- `AccesoTeoricoService.js`
- `InscripcionTeoricoView.jsx` (orquestador híbrido)
- `Paso2Teorico.jsx`
- Ruta `/teorico/:cursoId/comprar`

**Fase 5b — Admin aprueba:**
- `AdminAccesoTeoricoDetalle.jsx`
- Sección "Accesos Teóricos" en `AdminReservasHome`
- Batch atómico: acceso + capacidad + contador + notificación
- Ruta `/admin/acceso-teorico/:accesoId`

**Cierre experiencia estudiante:**
- `VistaFormacion`: navegación a curso en las 3 secciones.
- `EstudiantePanel`: soporte `?tab=formacion`.
- Botón atrás dinámico (logueado → panel).

**Estado:** ✅ Completo en dev. Pendiente deploy a prod.

---

### 🆕 Deuda técnica nueva

**[DEUDA-FASE-5C]** Packs comerciales incluyen módulos teóricos.
- **Alcance:** nuevo campo `cursosTeoricosIncluidos` en packs + snapshot + batch al aprobar.
- **Estado:** consulta a FIRE completada (dictamen OK). MAMBA respondió consulta anterior por error, re-consulta pendiente.
- **Prioridad:** media (siguiente paso del Bloque 5).

**[DEUDA-FASE-5D]** Contabilidad de accesos teóricos.
- **Alcance:** crear movimiento en `movimientos` al aprobar acceso teórico.
- **Prioridad:** media.

**[DEUDA-RENAME-CLIENTE]** Rename `estudiante` → `cliente` en código.
- **Alcance:** 29 archivos, 118 ocurrencias.
- **Estado:** decisión de FIRE + MAMBA = diferir. Nomenclatura no bloquea funcionalidad.
- **Prioridad:** baja.

**[DEUDA-AVISO-DURACION]** Aviso al admin al cambiar duración de curso con reservas activas.
- **Riesgo:** reservas quedan con parámetros congelados inconsistentes (caso 06/10).
- **Prioridad:** media.

**[DEUDA-TEORICO-COMPRAR-VIEW]** `TeoricoComprarView.jsx` obsoleto.
- **Estado:** reemplazado por `InscripcionTeoricoView.jsx`.
- **Acción:** eliminar tras confirmar que no se importa en ningún lado.
- **Prioridad:** baja.

**[DEUDA-LOGS-DEBUG]** `console.log` de debug en `useInscripcionState.js` (`🔍 [updateForm]`).
- **Impacto:** ruido en consola. No afecta funcionalidad.
- **Prioridad:** baja.

**[DEUDA-NOTIF-INDICES]** `[FirestoreProvider] Error en notificaciones: failed-precondition`.
- **Causa:** índice compuesto faltante para el query de notificaciones admin.
- **Prioridad:** baja (no bloquea nada porque las notificaciones del admin ya se manejan por otro flujo).

---

### 📋 Estado general del proyecto al 09/10/2026

**Dev:**
- Fix reservas 06/10 ✅
- Fix módulos huérfanos ✅
- Fix timer post-aprobación ✅
- Bloque 4 Módulo Teórico (vista de módulo) ✅
- Bloque 5 Fases 1, 2, 5a, 5b ✅
- Fix scope Firestore Rules ✅
- Modelo SSOT usuarios ✅
- Pendiente: 5c (packs incluyen teóricos), 5d (contabilidad)

**Prod:**
- Última versión: 08/10
- Falta: Fase 1+2 SSOT + 5a + 5b + fix scope rules
- **Decisión del Operador:** no deployar nada hasta cerrar el Bloque 5 completo.

**Reglas Firestore:**
- Dev: `usuarios`, `logrosUsuario` (movido dentro de artifacts), `accesosTeoricos`.
- Prod: pendiente sincronización.

**Commits recientes (prod):**
- `f3847e53`: fix notificaciones + cleanup.
- `54369404`: A6 adopción huérfanos.
- `71dff8aa`: SSOT tipoMoto + palabras prohibidas + Bloque 1 Teórico.

---

### 🎯 Prioridades próximas sesiones

1. 🔴 **Fase 5c** — packs incluyen teóricos (re-consultar MAMBA + implementar).
2. 🟡 **Fase 5d** — contabilidad.
3. 🟡 **Deploy a prod** del Bloque 5 completo.
4. 🟡 **Aviso al admin** al cambiar duración de curso con reservas activas.
5. 🟢 **Rename `estudiante` → `cliente`** (mediano plazo, con plan dedicado).
6. 🟢 **Limpiezas varias** (logs, archivos obsoletos).


---

## Actualización 10/10/2026 – Fase 3: Métricas por usuario

**Schema implementado:**
- `usuarios/{uid}.metricas` con mapa anidado.
- 8 estados: pendientes, activos, en_progreso, pausados, completados, cancelados, rechazados, vencidos.
- `porServicio` con claves dinámicas (servicios abiertos).

**Flujos instrumentados (8+ puntos):**
- crearReserva → +pendientes
- crearReservaPack → +pendientes (servicio 'packs')
- crearAcceso → +pendientes
- aprobarReserva → -pendientes +activos
- rechazarReserva → -pendientes +rechazados/cancelados
- aprobarReservaPack → -pendientes +activos
- rechazarReservaPack → -pendientes +rechazados
- cancelarReservaPack → -pendientes +cancelados (depende del estado previo)
- aprobarAcceso → -pendientes +activos
- rechazarAcceso → -pendientes +rechazados/cancelados
- finalizarModulo → -activos +completados
- completarCursoManualmente → -activos +completados

**Migración:** 159 usuarios en dev reconciliados con script `reconciliar-metricas-dev.mjs`.

**Verificado E2E:** pendientes 1→0, activos 0→1 al aprobar reserva.

### MEDIA — Botón "Recalcular métricas" en panel admin

**[DEUDA-BOTON-RECALCULAR-METRICAS]** — Falta botón de reconciliación manual para el admin. No existe una vista de detalle de usuario donde colocarlo.

**Solución:** cuando se construya el panel de usuarios (`/admin/usuarios` con buscador + detalle), agregar:
- Botón "Recalcular métricas" (usa la misma lógica del script `reconciliar-metricas-dev.mjs`).
- Vista del detalle del usuario con: capacidades, métricas totales, métricas por servicio, historial de servicios.

**Prioridad:** Media — el script `.mjs` cubre la operación mientras tanto.

### BAJA — Contadores legacy convivendo con métricas

**[DEUDA-CONTADORES-LEGACY]** — Los campos `contadores.{reservasActivas, reservasCompletadas, accesosTeoricosActivos}` siguen existiendo en `usuarios/{uid}` (no se eliminan todavía). Cuando se confirme que nadie los lee, hacer purga con `deleteField()`.

**Prioridad:** Baja.

### INFO — Fase 3.4 diferida

La sub-fase 3.4 (botón de reconciliación en admin) queda diferida hasta que exista el panel de usuarios. Fase 3.1, 3.2 y 3.3 completas.


---

## Actualización 10/10/2026 – Fase 4 completa + Bloque 5

**Cerrado:**
- Fase 5c: Packs incluyen teóricos ✅
- Fase 5d: Contabilidad de accesos teóricos ✅
- Fase 1+2: SSOT usuarios/{uid} (155 dev + 351 prod) ✅
- Fase 3.1-3.3: Schema metricas + 12 flujos instrumentados ✅
- Fase 4: Tabs dinámicos + VistaInicio + VistaServicios + VistaHistorial + VistaPacks ✅
- Compra de pack desde panel del estudiante ✅
- Fix notificaciones del estudiante (índice faltante) ✅
- Fix paywall contenido sin pago ✅
- Fix input corrección visible ✅
- Fix notificación al cancelar pack ✅

**Deuda nueva:**

### 🟡 MEDIA — Botón "Recalcular métricas" en panel admin

**[DEUDA-BOTON-RECALCULAR-METRICAS]** — No existe vista de usuarios en admin. Diferido hasta construir `/admin/usuarios`. Mientras tanto, script `.mjs` cubre la operación.

### 🟢 BAJA — Notif viejas no se borran al rechazar/cancelar

**[DEUDA-NOTIF-VIEJAS]** — Al rechazar o cancelar una reserva, la notif de "pago aprobado" anterior sigue visible. Causa confusión (Richard vio notif del 6/oct creyendo era nueva). Fix futuro: borrar notifs relacionadas al cambiar de estado.

### 🟢 BAJA — Contadores legacy

**[DEUDA-CONTADORES-LEGACY]** — `contadores.{reservasActivas, reservasCompletadas, accesosTeoricosActivos}` conviven con `metricas`. Purga con `deleteField()` cuando se confirme cero consumidores.

### 🟢 BAJA — Validación de duplicados en compra de pack

**[DEUDA-PACK-DUPLICADO]** — Si el usuario ya tiene un pack activo, no se le advierte antes de comprar otro.


### Actualización (10/10/2026) — Clarificación [DEUDA-PACK-CANCELADO-VISIBLE]

**Comportamiento esperado:**
- Usuario CON pack activo (Aprobado o Pendiente) → al tocar "Packs" → muestra detalle del pack (`/mi-pack/:id`)
- Usuario SIN pack activo (solo Cancelado/Rechazado o sin packs) → al tocar "Packs" → muestra `VistaPacks` con packs disponibles para compra

**Comportamiento actual (bug):**
- Usuario con pack cancelado sigue viendo `/mi-pack/:id` con sesiones.

**Fix en VistaServicios.handleClick:**
- Filtrar `packActivo` para excluir Cancelado/Rechazado.
- Si `packActivo` es null (después del filtro) → abrir VistaPacks (onNavigate('packs')).


---

## Actualización 11/10/2026 – Rearquitectura de métricas (ALT-B) + fixes varios

**Cerrado:**
- Rearquitectura de métricas: eliminados 16 puntos de `increment()` + `MetricasService.js`.
- Nuevo hook `useMetricasUsuario(uid, triggerInvalidacion)` con invalidación vía `updatedAt`.
- `updatedAt` agregado a 8 batches críticos (aprobar/rechazar/cancelar reserva y pack + corregir referencia).
- Fix flujo teórico logueado (pantalla PIN → redirect a Servicios).
- Fix pantalla de éxito de teórico (botones + mensaje Pendiente).
- Freno backend de pack de sesiones activo.
- VistaPacks (compra desde panel).
- Modo corrección de pack.
- Notif `pack_cancelado`.
- onBack de PackDetalle con `state.from`.
- Badges numéricos en footer.
- Colores por estado en VistaServicios.
- Colores en VistaInicio vitrina.
- Rediseño de Inicio (sacar card morada + resumen de sesión redundante).

### 🟡 MEDIA — Instructor no puede invalidar métricas en tiempo real

**[DEUDA-TRIGGER-INSTRUCTOR]** — `avanzarPackTrasCompletarCurso` no escribe `updatedAt` en `usuarios/{uid}` del estudiante. La regla Firestore NO tiene rama para instructor en `usuarios/{uid}`. El estudiante ve el avance del pack tras TTL 60s o F5.

**Fix propuesto:** agregar rama instructor a `usuarios/{uid}` con `hasOnly(['updatedAt'])`, y agregar la escritura en `avanzarPackTrasCompletarCurso`.

**Prioridad:** Media — no bloquea, pero rompe la consistencia "todo en vivo".

### 🟡 MEDIA — Flujo de inscripción duplicado en 5 archivos

**[DEUDA-FLUJO-INSCRIPCION-SERVICE]** — La lógica "¿usuario nuevo o logueado? ¿tiene PIN? ¿a dónde redirijo?" está duplicada en:
- `InscripcionView.jsx`
- `InscripcionTeoricoView.jsx`
- `VistaPacks.jsx` / `PacksPublicosView.jsx`
- `AuthProvider.jsx`
- `EstudiantePanel.jsx`

**Fix propuesto:** extraer `FlujoInscripcionService` o `useFlujoInscripcion` que devuelva `{ tipoUsuario, tipoFlujo, requierePin, destinoPostPago }`.

**Prioridad:** Media — causa de múltiples bugs repetidos en la sesión.

### 🟡 MEDIA — Doble toast en corrección de referencia

**[DEUDA-DOBLE-TOAST-CORRECCION]** — Al corregir la referencia, sale el toast azul correcto y en seguida el rojo "Tu pago ha sido rechazado". El rojo es un falso positivo. Requiere diagnóstico de rebote de estado en `EstudiantePanel`.

**Prioridad:** Media — confunde al usuario.

### 🟡 MEDIA — Bloqueos admin no detectados en CambiarHorarioModal

**[DEUDA-BLOQUEOS-CAMBIAR-HORARIO]** — El modal de cambio de horario del admin no valida `bloqueosAdmin`. Permite seleccionar bloques bloqueados. Reportado hoy.

**Prioridad:** Media — riesgo operativo.

### 🟢 BAJA — Typo "PIN.F"

**[DEUDA-TYPO-PINF]** — `InscripcionTeoricoView.jsx` tiene `'Ya tienes cuenta con ese correo. Ingresa con tu PIN.F'`. Sobra la "F".

**Prioridad:** Baja — cosmético.

### 🟢 BAJA — FOUC en Paso 2 al recargar

**[DEUDA-FOUC-PASO2]** — Al recargar en Paso 2 de un pack, se ve brevemente el formulario de sesión individual antes de aplicar el contexto de pack. Cosmético. Dura milisegundos.

**Prioridad:** Baja.


---

## Actualización 12/10/2026 – Triple fix: bootstrap + default moto pack + pack residual v2

**Bugs cerrados:**

### ✅ [CRÍTICO] Bootstrap race condition (usuarios bloqueados en Paso 1)
- **Síntoma:** usuario abandona inscripción en Paso 2/3/4, cierra navegador, vuelve, y queda atascado en Paso 1 sin poder avanzar. Debe hacer logout manual.
- **Causa raíz:** `useEffect` del bootstrap con deps `[]` + marca temprana de `bootstrapEjecutado.current` ANTES de validar `authReady`. Si el componente montaba antes de que Firebase restaurara sesión, FASE 2 abortaba con `return` y el ref quedaba sellado.
- **Fix:** ALT-E — FASE 1 (origen público) sella inmediato; FASE 2 divide guardia (authReady → sello → fbUser); deps `[ctx.authReady, ctx.fbUser?.uid]`.
- **Validación:** 5 pruebas funcionales exitosas.
- **Confluencia FIRE + MAMBA:** 2/2.

### ✅ [ALTA] Default moto pack (botones sin estado seleccionado)
- **Síntoma:** en Paso 2 de pack, los botones "Uso Moto App" / "Traigo la mía" aparecen sin borde azul (ninguno marcado).
- **Causa raíz:** `form.traeMotoPorCurso` arrancaba vacío → `trae === undefined` → ninguna rama del className se activaba.
- **Fix:** IIFE condicional en el `useEffect` de pack que inicializa con `'No'` (moto App por defecto) para cada curso preguntable. Solo si el mapa está vacío (evita sobrescribir). + Freno táctico defensivo en `handleNext` Paso 2.
- **Validación:** captura visual confirma borde azul por defecto.
- **Confluencia FIRE + MAMBA:** 2/2.

### ✅ [CRÍTICO] Pack residual v2 (flag persistía por performance API en SPA)
- **Síntoma:** usuario compró pack hace días → Home → "Inscribirse" → entra al flujo de pack viejo en lugar de inscripción individual.
- **Causa raíz:** `performance.getEntriesByType('navigation')[0].type === 'reload'` solo refleja carga inicial de pestaña, no navegación client-side (SPA). Si el usuario hizo F5 en algún momento, el valor quedaba `'reload'` para siempre → flag nunca se limpiaba.
- **Fix:** eliminar `performance.getEntriesByType`. ALT-E (limpiar si `location.state.esPack !== true`) + TTL numérico 4h. `HomeView.jsx` botón "Inscribirse" pasa state explícito.
- **Validación:** 3 tests (viejo + URL directa, fresco + URL directa, fresco + botón).
- **Confluencia FIRE + MAMBA:** 2/2 (FIRE v1 propuso TTL 30min, FIRE v3 + MAMBA propusieron 4h numérico, Arquitecto adoptó consenso).

**Deuda técnica nueva:**

### 🟡 MEDIA — Tests después de HMR requieren pestaña limpia
**Descripción:** Vite Fast Refresh reinicia `useRef` y re-ejecuta `useEffect`. Tests en pestaña con HMR reciente pueden dar falsos positivos (bug fantasma reportado hoy: cédula duplicada avanzaba al Paso 2, era artefacto de HMR + sessionStorage residual).
**Acción:** documentar como regla de proceso en Manual. Cerrar todos los tests con `sessionStorage.clear()` + pestaña nueva.

### 🟡 MEDIA — Restaurar Fase 4-5 del batch original
**Descripción:** del fragmento previo al cambio de foco por el bootstrap, quedaron pendientes:
- **BUG_2 (pack, EstudiantePanel):** reactividad del pack vía trigger SSOT (`ctx.user.data.updatedAt`).
- **BUG_3 (pack, PackDetalleEstudiante):** reactividad vía `onSnapshot` directo al doc.
- **DECISION_UX_5:** badge de Servicios con pendientes + rechazados (probablemente ya aplicado).
**Acción:** retomar en próxima sesión, aplicar plan FIRE + MAMBA ya definido.

### 🟢 BAJA — Pestaña residual en pruebas manuales
**Descripción:** los tests manuales dejan datos en `sessionStorage` que afectan siguientes pruebas.
**Acción:** agregar al protocolo de QA: `sessionStorage.clear()` antes de cada test.

**Deuda preexistente que permanece vigente:**
- B115-B121 (Material, reversión módulos, clases virtuales, reserva tiempo, D1→D2, tiempo excedente).
- B89-B99 (Calificación mutua, logros, chat, insignias, accesibilidad).
- B125-B129 (Optimización de consultas, Cloud Functions, etc.).
- Todas las deudas del fragmento previo al 12/10.

**Pendiente deploy a prod:**
- Bloque A + B + C de esta sesión.
- Más el batch acumulado desde el 10/10.

---

## Actualización 12/10/2026 (2da sesión) – Tanda 1 completa + 4 bloques

**Cerrado en esta sesión:**

### Bugs críticos
- ✅ Bootstrap race condition (usuarios bloqueados en Paso 1).
- ✅ Default moto pack (botones sin estado visual).
- ✅ Pack residual v2 (flag no se limpiaba por performance API).
- ✅ Precio legacy en reserva JTSmHvUEH3iHd9ryMALR.

### Feature completa — Tanda 1: Corrección unificada de pagos
- ✅ Página universal `/corregir-pago/:tipo/:id`.
- ✅ Facade `CorreccionPagoService` con `obtenerDetalle` + `corregir`.
- ✅ Modal de motivo de rechazo (admin).
- ✅ Backend `rechazarReservaPack(packId, childId, motivo)`.
- ✅ EstudiantePanel: reemplazo de inline por CTA.
- ✅ `/mi-pack/:id` redirect automático cuando Rechazado.
- ✅ VistaServicios con banner rojo + colores priorizados.
- ✅ Reactividad de packs (onSnapshot + trigger SSOT).

### Deuda técnica nueva priorizada

**[DEUDA-PRECIO-LEGACY-DEV]** 21 reservas adicionales en dev sin campo `precio`.
- 18 canceladas + 3 aprobadas (`fszqFGEHixvcBGuA4ebq`, `nO4ZnWFUYIT3doQzvPGO`, `vWJol6XYqqiHIv879Nrm`).
- Impacto: si alguno de esos usuarios intenta corregir referencia, falla con permission-denied.
- Acción: migrar con el mismo script `fix-reserva-legacy.mjs` (adaptar para múltiples IDs).

**[DEUDA-PRECIO-LEGACY-PROD]** Auditoría de PROD pendiente.
- No se sabe cuántas reservas tienen el mismo problema en producción.
- Acción: correr `audit-precio.mjs` con `sa-prod.json` (solo lectura).

**[DEUDA-TANDA-2-TEORICOS]** Refactor de `accesosTeoricos` pendiente.
- Bug preexistente: la regla de Firestore NO permite al estudiante escribir
  `pagoRef`, `pagoBanco`, `pagoTelefono`, `pagoCedula`. Solo `progreso`,
  `logrosCurso`, `streak`, `estadoPago`. **El estudiante NO puede corregir**.
- Plan Tanda 2:
  - Regla Firestore: agregar campos + validar transición `Rechazado → Pendiente`.
  - `rechazarAcceso`: `'Pendiente'` → `'Rechazado'` + historialRechazos[].
  - Método nuevo `corregirReferenciaPago` en AccesoTeoricoService.
  - `VistaFormacion`: sección "módulos por corregir".
  - Facade: agregar tipo `'teorico'` (ya tiene hook).
  - `intentosCorreccion: 0` explícito en create.
  - Freno táctico en regla: `intentosCorreccion <= 3`.

**[DEUDA-COMMIT-GIT]** Working tree acumulado sin commitear de múltiples sesiones.
- Aprovechar el cierre de Tanda 1 para consolidar.

**Deuda preexistente que permanece vigente:**
- Todas las anteriores del backlog.

**Pendiente deploy a prod:**
- Todos los bloques de hoy + batch previo acumulado desde el 10/10.

---

## Actualización 12/10/2026 (3ra parte) – Tanda 2: Refactor de accesos teóricos

**Cerrado en esta sesión:**

### Bug preexistente CRÍTICO — Regla Firestore de accesosTeoricos
- **Síntoma:** el estudiante no podía corregir la referencia. La regla `allow update` solo permitía escribir `['progreso', 'logrosCurso', 'streak', 'estadoPago']`. Faltaban `pagoRef`, `pagoBanco`, `pagoTelefono`, `pagoCedula`.
- **Impacto:** cualquier intento de corrección fallaba con `permission-denied`.
- **Fix:** se amplió la allowlist para la rama de corrección + validación de transición `Rechazado → Pendiente` + freno táctico `intentosCorreccion < 3`.

### Bug preexistente — Falta de validación de transiciones
- **Síntoma:** un cliente manipulado podía cambiar `Aprobado → Pendiente` sin pasar por `Rechazado`.
- **Fix:** se dividió la regla en 2 ramas OR. La rama de progreso ya no permite tocar `estadoPago`. La rama de corrección solo acepta la transición específica `Rechazado → Pendiente`.

### Bug preexistente — Flujo inconsistente entre servicios
- **Síntoma:** `accesosTeoricos` dejaba los rechazos en `estadoPago: 'Pendiente' + motivoRechazo`, mientras `reservas` y `reservasPack` usan `estadoPago: 'Rechazado'`.
- **Fix:** refactor completo de `rechazarAcceso` para alinear con el flujo nuevo. Los accesos legacy se detectan por ausencia de `historialRechazos`.

### Feature completa — Tanda 2: Corrección unificada para módulos formativos
- ✅ Refactor `rechazarAcceso`: `'Rechazado'` + `intentosCorreccion` + `historialRechazos[]`.
- ✅ Nuevo método `corregirReferenciaPago` en `AccesoTeoricoService`.
- ✅ `crearAcceso` con campos nuevos + pre-check de recompra rechazado.
- ✅ Modal de motivo en `AdminAccesoTeoricoDetalle` (reemplaza `window.prompt`).
- ✅ `VistaFormacion` con banner rojo + CTA "Corregir pago".
- ✅ `AdminReservasHome` con card visible para accesos rechazados (badge RECH + título rojo).
- ✅ Regla Firestore deployada.
- ✅ Trigger SSOT en rechazar/corregir para invalidar cache de métricas.
- ✅ Métricas detectan legacy correctamente (fix con `sinHistorial`).

### Deuda técnica nueva priorizada

**[DEUDA-COMMIT-GIT]** Working tree acumulado de 2 sesiones sin commitear.
- Incluye Tanda 1 completa + Tanda 2 completa + fixes previos del día.
- Acción: commit consolidado con mensaje descriptivo.

**[DEUDA-PRECIO-LEGACY-DEV]** (arrastrada de Tanda 1) — 21 reservas sin campo `precio`.
- 18 canceladas + 3 aprobadas.
- Acción: migrar con `fix-reserva-legacy.mjs` adaptado para múltiples IDs.

**[DEUDA-PRECIO-LEGACY-PROD]** (arrastrada de Tanda 1) — Auditoría pendiente.

**[DEUDA-DEPLOY-PROD]** Batch completo de las 2 sesiones (Tanda 1 + Tanda 2) pendiente de deploy.

**Deuda preexistente que permanece vigente:**
- Todas las anteriores.

**Pendiente próxima sesión:**
1. Commit + push a GitHub (consolidar).
2. Auditoría de PROD (precio legacy).
3. Deploy a prod del batch completo.
4. Retomar cualquier deuda diferida.

---

## Actualización 13/10/2026 – SSOT de bloqueos + cierre de LOCK-INVALIDATION-SSOT-V1

**Cerrado en esta sesión:**

### ✅ [CRÍTICO] Bug en CambiarHorarioModal (bloqueos admin)
- **Síntoma:** el modal de cambio de horario del admin permitía seleccionar
  bloques bloqueados por `bloqueosAdmin`.
- **Causa:** el modal no cargaba ni validaba bloqueos.
- **Fix:** migración al helper SSOT + hook. Ahora filtra horarios bloqueados
  y muestra warning al intentar confirmar.
- **Testing:** manual con bloqueo `h1, h2, h6` en 16/10/2026.

### ✅ [CRÍTICO] LOCK-INVALIDATION-SSOT-V1
- **Síntoma:** usuario puede confirmar reserva con horario inconsistente
  con su configuración (traeMoto, tipoMoto, sedeId, cursoId, packId).
- **Causa:** `useEffect` único vigilaba solo `form.fecha1`.
- **Fix:** snapshot en `sessionStorage` + `useEffect` de invalidación +
  revalidación defensiva (ALT-D).
- **Testing:** 4 escenarios positivos (Sí→No, No→Sí, cambio tipoMoto, F5 Paso 4).
- **Reportado 2 veces sin atacar en sesiones previas.** Cerrado.

### Feature completa — SSOT de bloqueos
- ✅ Helper puro `bloqueosHelpers.js` (3 funciones).
- ✅ Hook `useBloqueosAdmin.js` con `getDocs` puntual.
- ✅ Migración de 3 consumidores: `InscripcionView`, `AgendarPackView`,
  `useDisponibilidadPack`.
- ✅ Fix urgente `CambiarHorarioModal`.
- ✅ Eliminación de código duplicado (4 funciones inline).

### Deuda técnica nueva
Ninguna crítica.

### Deuda preexistente que permanece vigente
- `[DEUDA-COMMIT-GIT]` — working tree acumulado.
- `[DEUDA-PRECIO-LEGACY-DEV]` — 21 reservas sin `precio`.
- `[DEUDA-PRECIO-LEGACY-PROD]` — auditoría pendiente.
- `[DEUDA-DEPLOY-PROD]` — batch completo pendiente.
- `[DEUDA-TRIGGER-INSTRUCTOR]` — `avanzarPackTrasCompletarCurso` no invalida métricas.
- `[DEUDA-DOBLE-TOAST-CORRECCION]` — doble toast en corrección de referencia.
- `[DEUDA-FLUJO-INSCRIPCION-SERVICE]` — lógica duplicada en 5 archivos.
- `[DEUDA-DROPDOWN-VACIO-DEV]` — dropdown vacío en dev.
- `[DEUDA-SORT-NOTIF]` — sort de notificaciones prioriza no-leídas.
- `[DEUDA-RULES-WARNINGS]` — 2 warnings preexistentes en `firestore.rules`.
- `[DEUDA-TOAST-CRIPTICO]` — error de permisos crudo.
- `[DEUDA-DOCID-CORREO]` — `progresoInscripcion` usa correo sanitizado.
- `[DEUDA-TYPO-PINF]` — typo "PIN.F" en `InscripcionTeoricoView`.
- `[DEUDA-FOUC-PASO2]` — FOUC visual al recargar en Paso 2 de pack.

**Pendiente próxima sesión:**
1. Commit + push a GitHub.
2. Auditoría de PROD (precio legacy).
3. Deploy a prod del batch completo.
4. Retomar los fixes de las deudas menores según prioridad.

---

## Actualización 13/10/2026 (2da parte) – PACK-SEDE-POR-SESION + SSOT bloqueos + LOCK-INVALIDATION

**Cerrado en esta sesión:**

### ✅ [CRÍTICO] SSOT de bloqueos + fix CambiarHorarioModal
- Bug: el modal del admin permitía seleccionar bloques bloqueados.
- Causa: lógica de validación duplicada + modal sin validación.
- Fix: helper SSOT + hook + migración de 4 consumidores.
- Feature completa de unificación.

### ✅ [CRÍTICO] LOCK-INVALIDATION-SSOT-V1
- Bug reportado 2 veces sin atacar en sesiones previas.
- Causa: useEffect con deps frágil (solo `fecha1`).
- Fix: snapshot de contexto en sessionStorage + useEffect + ALT-D.
- Cierra hueco de "Resource Hijacking" (moto bloqueada 10 min sin uso).

### ✅ [ALTA] PACK-SEDE-POR-SESION
- Feature completa para permitir cambiar sede por sesión en packs.
- Implementada con intersección curso ∩ pack + auto-fallback + regla Firestore.
- Backend, regla, frontend y admin.

### Deuda técnica nueva
Ninguna crítica.

### Deuda preexistente que permanece vigente
- `[DEUDA-COMMIT-GIT]` — commit + push pendiente.
- `[DEUDA-DEPLOY-PROD]` — batch completo pendiente de deploy.
- `[DEUDA-PRECIO-LEGACY-DEV]` — 21 reservas sin `precio`.
- `[DEUDA-PRECIO-LEGACY-PROD]` — auditoría pendiente.
- `[DEUDA-TRIGGER-INSTRUCTOR]` — `avanzarPackTrasCompletarCurso` no invalida métricas.
- `[DEUDA-DOBLE-TOAST-CORRECCION]` — doble toast en corrección de referencia.
- `[DEUDA-FLUJO-INSCRIPCION-SERVICE]` — lógica duplicada en 5 archivos.
- `[DEUDA-DROPDOWN-VACIO-DEV]` — dropdown vacío en dev.
- `[DEUDA-SORT-NOTIF]` — sort de notificaciones prioriza no-leídas.
- `[DEUDA-RULES-WARNINGS]` — 2 warnings preexistentes en `firestore.rules`.
- `[DEUDA-TOAST-CRIPTICO]` — error de permisos crudo al usuario.
- `[DEUDA-DOCID-CORREO]` — `progresoInscripcion` usa correo sanitizado.
- Deudas menores (typo PIN.F, FOUC Paso 2, nombres con espacio al final en cursos).

**Pendiente próxima sesión:**
1. Commit + push a GitHub.
2. Deploy a prod del batch completo (frontend + reglas).
3. Auditoría de precio legacy en prod.
4. Retomar deudas menores según prioridad.

---

## Actualización 2026-10-20

### Deudas nuevas detectadas esta sesión

#### [DEUDA-PACK-ACTIVO-INDICE] 🟡 Media prioridad
**Descripción:** La validación "1 pack activo máximo" se hace en cliente + servicio (2 capas). Firestore Rules no puede validar queries agregadas, lo que deja un hueco Zero-Trust: usuario malicioso podría crear 2 packs en race condition de ~500ms.

**Solución propuesta:** Agregar campo `usuarios/{uid}.packsActivosCount` mantenido atómicamente en transacción. Regla Firestore valida `packsActivosCount === 0` al crear pack.

**Costo:** ~30 reads/escrituras adicionales por operación. Evaluar en Plan Spark.

**Aprobado por:** FIRE (mitigación parcial), MAMBA (obligatorio en Zero-Trust).

**Estado:** Diferida a Fase 2 (no urgente — el admin ve duplicados manualmente).

---

#### [DEUDA-CONFIG-FALLBACK] 🟡 Media prioridad
**Descripción:** `ConfigProvider` tiene fallback a valores por defecto hardcodeados (tasaUSD: 780, tasaEUR: 39.10, etc.). Si Firestore falla en primer render, el admin ve esos valores en lugar de los reales. Genera confusión (falsa alarma "tasa cambiada").

**Solución propuesta:** Exponer flag `esDefault: boolean` en el contexto. La UI del admin debe mostrar un banner "⚠️ Valores por defecto (sin sincronizar con Firestore)".

**Archivos afectados:** `src/context/ConfigProvider.jsx`, `src/modules/admin/components/AdminAjustes.jsx`.

**Estado:** Diferida.

---

#### [DEUDA-PASSWORD-UPDATED-AT] 🟢 Baja prioridad
**Descripción:** `passwordUpdatedAt: undefined` en Firebase Admin SDK NO es evidencia de que el password no se cambió. El SDK no siempre popula ese campo. Puede generar diagnósticos erróneos.

**Solución propuesta:** Documentar en `INSTRUCCIONES_A_LA_IA.md` como advertencia. No requiere código.

**Estado:** Registrar como lección para futuras sesiones.

---

#### [DEUDA-MOSTRAR-PASSWORD] 🟢 Baja prioridad
**Descripción:** Form de login no tiene botón "👁 Mostrar password". Dificulta verificar tipeo cuando hay autocompletado de navegador.

**Solución propuesta:** Agregar toggle en `LoginView.jsx` para mostrar/ocultar password.

**Archivos afectados:** `src/modules/auth/views/LoginView.jsx`.

**Estado:** Diferida.

---

#### [DEUDA-PACKACTIVO-HUERFANO] 🟢 Cosmética
**Descripción:** `packActivo` en `EstudiantePanel.jsx` (línea ~263) está definido pero sin consumidores. El componente `VistaServicios` recibe `packVigente` en su lugar.

**Solución propuesta:** Eliminar la variable `packActivo` (código muerto).

**Archivos afectados:** `src/modules/estudiante/views/EstudiantePanel.jsx`.

**Estado:** Diferida (cleanup de código muerto).

---

#### [DEUDA-SCRIPTS-MJS-PROD] 🟢 Cosmética
**Descripción:** Scripts `.mjs` temporales acumulados en raíz de `/c/motoescuela-pro`:
- `fix-richard-eliana-prod.mjs`
- `sync-richard-pack-prod.mjs`
- `reset-maria-password-prod.mjs`
- `migrar-maria-prov1-to-uid-prod.mjs`

**Solución propuesta:** Mover a `backup/scripts-usados/` para auditoría. `.gitignore` ya cubre `*.mjs` así que no se commitean.

**Estado:** Diferida (cleanup de raíz).

---

### Deudas cerradas esta sesión

- ✅ **`mapEstado` con case sensitivity:** acepta `'completado'`, `'vencido'`, `'cancelado'` del pack además de `'Aprobado'`, `'Completado'` de reservas.
- ✅ **Validación "pack activo" incompleta:** 3 archivos corregidos (PacksPublicosView, ReservaService, VistaPacks) + packVigente en EstudiantePanel.
- ✅ **María Aguilar no ve panel:** migración `prov1` → UID real completada.
- ✅ **Cinta Resumen invisible en vitrina:** extraída a variable reutilizable en ambos escenarios de VistaInicio.


---

## Actualización 2026-10-20 – BLOQUEOS-INSTRUCTORES-V1

### Deudas nuevas detectadas

#### [DEUDA-ALT-C-FASE-1.5] 🟡 Media prioridad
**Descripción:** El fallback fail-closed de `instructoresPermitidos` (si vacío → nadie permitido) detecta config faltante, pero la detección es en runtime (el curso queda sin instructores asignables). Se debe implementar validación obligatoria en `FormCursos.jsx` para bloquear el guardado de un curso sin `instructoresPermitidos` configurado.

**Solución propuesta:**
```js
// En FormCursos.jsx, en el handleSave:
if (!Array.isArray(form.instructoresPermitidos) || form.instructoresPermitidos.length === 0) {
  showToast('Debes seleccionar al menos 1 instructor permitido.', 'error');
  return;
}
Aprobado por: FIRE + MAMBA (confluencia 3/3).

Estado: Diferida a Fase 1.5.

[DEUDA-RULES-CODIGO-MUERTO] 🟢 Baja prioridad
Descripción: firestore.rules contiene 2 funciones definidas pero nunca llamadas:

canUpdateReserva() (línea 11) — produce warnings Invalid variable name: resource / request.

esLockCorrupto() (línea 19) — produce warning Unused function.

Solución propuesta: Eliminar ambas funciones del archivo. Deploy a dev + prod.

Aprobado por: FIRE + MAMBA (no bloqueante para el deploy actual).

Estado: Diferida a próxima sesión de cleanup.

[DEUDA-REFACTOR-INSTRUCTORES-HELPER] 🟡 Media prioridad
Descripción: La lógica de filtro de instructores está duplicada en 2 lugares de InscripcionView.jsx:

estaPermitido(i) en evaluarDisponibilidad (cálculo en frío).

estaPermitidoH(i) en handleSelectHorario (revalidación en caliente).

Ambos helpers tienen la misma lógica. FIRE sugirió extraer a un helper compartido.

Solución propuesta:

js
// src/modules/shared/utils/instructoresHelpers.js
export const filtrarInstructoresDisponibles = ({
  instructores, sedeId, cursoId, bloqueId, fecha1, fecha2,
  reservasConfirmadas, activeLocks, bloqueosInstructor, instructoresPermitidosCurso
}) => {
  // Lógica compartida entre evaluarDisponibilidad y handleSelectHorario
};
Aprobado por: FIRE (recomendación en dictamen P5).

Estado: Diferida a Fase 1.5.

Deudas cerradas en esta sesión
✅ [DEUDA-BLOQUEOS-INSTRUCTORES] — Feature completo en dev.

✅ Bug path artifacts (fix de 3 Ctrl+H).

✅ Bug validación fechaFin vacía.

✅ Bug handler sin filtro de bloqueosInstructor.

✅ Bug afectaInstructor sin sedeId.

✅ Bug label "Reservado" cuando causa es bloqueo.

✅ Filtro instructoresPermitidos homologado entre flujo individual y packs.


---

## Actualización 2026-10-23 – Deuda técnica nueva

### 🟡 MEDIA — Estado de "No Asistió" para reservas con inasistencia

**Descripción:** El sistema actual solo maneja estados de curso (`Pendiente`, `En Curso`, `Completado`). No existe un marcador formal para cuando el estudiante no asiste a la clase reservada.

**Problema:** El instructor reservó su tiempo, pero el estudiante no llegó. El admin se ve obligado a marcar `Completado` (falseando la realidad) o dejar el curso `En Curso` (limbo).

**Propuesta (pendiente de validar con Operador):**
- Nuevo estado: `No Asistio`.
- Solo el admin puede marcarlo.
- Efecto en comisiones: instructor cobra completo.
- Efecto en estudiante: se muestra en su panel. Reprogramación manual con el admin.

**Ticket:** B-ESTADO-NO-ASISTIO

**Prioridad:** Media (afecta operación pero no bloquea).

---

## Actualización 2026-11-02 – Deuda técnica nueva

### 🔴 ALTA — Error `No document to update` al aprobar pagos de usuarios sin perfil SSOT

**Descripción:** La función `aprobarPago` en `AdminReservaDetalle.jsx` hace un `update` directo sobre `usuarios/{uid}` para actualizar el `updatedAt` y disparar la invalidación de métricas en el cliente. Si el documento no existe (porque el usuario se registró antes de la Fase 1 SSOT, o porque el registro falló a medias), lanza un error `FirebaseError: No document to update` y bloquea la aprobación del pago.

**Caso real:** Yondy José Calderón Guerra (reserva `Ujm0dswN7rlOMrF3FiFS`). El 02/11 el admin no pudo aprobar el pago porque el documento `usuarios/5tGPaW0fTha3p9irdkkiV2MgEDG2` no existía. Se reparó manualmente creando el doc desde los datos de la reserva.

**Propuestas de solución (a evaluar con FIRE + MAMBA):**
1. **Opción A (Defensa en profundidad):** En `AdminReservaDetalle.aprobarPago`, usar `batch.set(..., { merge: true })` en lugar de `batch.update(...)` para el doc de usuario. Si el doc existe, actualiza; si no, lo crea.
2. **Opción B (Pre-chequeo):** Antes de aprobar, hacer `getDoc` y si el usuario no existe, crearlo con los datos de la reserva.
3. **Opción C (Migración masiva):** Script de un solo uso en PROD para buscar todas las reservas activas cuyo `userId` no tenga doc en `usuarios/{uid}` y crearlos automáticamente.

**Ticket:** B-FIX-APROBAR-USUARIO-FALTANTE
**Prioridad:** Alta (bloquea aprobación de pagos, que es operación crítica).

---

## Actualización 2026-11-03 – Deuda técnica nueva

### 🔴 ALTA — Reservas de Equilibrio creadas sin moto ni proveedor asignado

**Descripción:** El flujo de creación de reservas permite crear una reserva de un curso con `motoIncluida: true` (como Equilibrio) sin asignar `motoAsignadaId` ni `proveedorId`, cuando el estudiante marcó `traeMoto: 'No'`. El sistema debería:
1. Asignar automáticamente una moto disponible en esa sede/fecha/hora.
2. Si no hay motos disponibles, bloquear la creación con un mensaje claro.

**Caso real:** Gildre Cabello (reserva `l3HTZoLgCWGV8MaqWzGn`, Equilibrio 08/11/2026 10:00 AM, sede Caracas). La reserva se creó sin moto ni proveedor. Se reparó manualmente el 03/11 asignando la moto `1782055081899` y la proveedora María.

**Propuestas de solución (a evaluar con FIRE + MAMBA):**
1. **Opción A (Defensa en backend):** En `ReservaService.crearReserva`, validar que si `necesitaMoto === true` y `motoAsignadaId` es null, rechazar la transacción con error.
2. **Opción B (Defensa en frontend):** En `handleSelectHorario`, no permitir seleccionar un bloque sin moto disponible (hoy ya debería estar implementado, pero falló).
3. **Opción C (Migración):** Script de un solo uso para detectar reservas activas sin moto asignada (cuando el curso la requiere) y alertar al admin.

**Ticket:** B-FIX-EQUILIBRIO-SIN-MOTO
**Prioridad:** Alta (afecta la operación diaria y la experiencia del estudiante).

---

## Actualización 2026-11-12 – Deuda técnica nueva

### 🟡 MEDIA — Reservas (especialmente de packs) creadas sin datos personales (cédula, teléfono, nombre)

**Descripción:** El flujo de compra de pack (y posiblemente de inscripción directa) puede generar una reserva `pack_sub` con los campos `nombre`, `apellido`, `cedula`, `telefono` y `contactoEmergencia` vacíos, a pesar de que el estudiante acaba de registrarse y su perfil SSOT (`usuarios/{uid}`) tiene los datos completos.

**Caso real:** Jesseira Pedrique (reserva `EE0hBb8aNTABkwCKEoqq`). Se registró a las 15:54 y compró un pack a las 16:01. La reserva resultante tenía todos los campos personales vacíos. Se reparó manualmente el 12/11 inyectando los datos desde el perfil SSOT.

**Hipótesis:** Condición de carrera entre el registro (creación del perfil SSOT) y la compra del pack. El estado del formulario en React puede no haber hidratado los datos del SSOT antes de disparar la creación de la reserva.

**Propuestas de solución (a evaluar con FIRE + MAMBA):**
1. **Opción A (Defensa en backend):** En `ReservaService.crearReservaPack` (y `crearReserva`), hacer un `getDoc` al perfil SSOT (`usuarios/{uid}`) dentro de la transacción y usar esos datos como fallback si los recibidos están vacíos.
2. **Opción B (Bloqueo en frontend):** No permitir avanzar al paso de pago si los datos del formulario (nombre, cédula, teléfono) están vacíos, incluso en el flujo de pack.

**Ticket:** B-RESERVA-SIN-DATOS-LEGACY
**Prioridad:** Media (solo 1 caso de 188 reservas activas, pero afecta la integridad de los datos del cliente y bloquea la comunicación por WhatsApp).

### 🔴 ALTA — B-ESTADO-AUSENTE
**Descripción:** Se introdujo el estado `"Ausente"` en la base de datos para reflejar reservas donde el estudiante no asistió, pero el código actual no lo reconoce.
**Impacto:** En el admin se ve texto en crudo o gris. No aparece en los filtros de estado académico. El estudiante no recibe feedback visual correcto.
**Fix propuesto:** Agregar `"Ausente"` a los mapas de estado y filtros en: `AdminReservasList.jsx`, `AdminReservaDetalle.jsx`, `EstudiantePanel.jsx`, `InstructorPanel.jsx`.
**Ticket:** B-ESTADO-AUSENTE
**Prioridad:** ALTA (afecta la visualización de datos reales de 2 reservas hoy, y crecerá).

### 🟡 MEDIA — B-HORAS-PENDIENTES-UI
**Descripción:** Se agregó el campo `horasPendientes: 1` en 2 reservas, pero no hay UI para que el admin o el instructor vean ese saldo pendiente.
**Fix propuesto:** Mostrar un badge o texto "Debe 1 hora" en el detalle de la reserva.
**Ticket:** B-HORAS-PENDIENTES-UI
**Prioridad:** MEDIA.

---

## Actualización 2026-11-12 (Parte 2) – Rediseño de reprogramación y recargos (FASE 0)

### 🔴 ALTA — B-FEATURE-REPROGRAMACION-CON-RECARGO

**Descripción:** Implementar un sistema completo de reprogramación con límites, recargos y Términos y Condiciones. Actualmente el estudiante no puede reprogramar por sí mismo; todo lo hace el admin, sin cobrar recargos ni aplicar límites.

**Reglas de negocio definidas por el Operador (12/11/2026):**
1. Límite de **2 reprogramaciones** por reserva.
2. Ventana de reprogramación: **30 días** desde la fecha original de la reserva.
3. Vencimiento: **15 días** desde la fecha original si el estudiante no hace ninguna acción (reprogramar, cancelar, etc.). Después de esto, la reserva pasa a estado `"Vencida"` (el admin puede desbloquear con justificación).
4. Recargo por reprogramar con menos de 12h de anticipación o por inasistencia: **50% de comisión tutor + 50% de comisión proveedor** (el monto se define por curso desde el admin, o globalmente).
5. El recargo es el mismo en cualquier momento del plazo (días 16-30 también pagan el mismo 50%).
6. El contador de 15 días y 30 días **NO se reinicia** al reprogramar. Siempre cuenta desde la fecha original.
7. Cursos de 2 días: si falta el D1, pierde el D1 pero puede usar el D2. Si quiere recuperar el D1, paga recargo.
8. El aviso del recargo debe aparecer en el Paso 4 (antes de contratar) y en la pantalla del PIN.
9. Los Términos y Condiciones deben ser accesibles desde el panel del estudiante en todo momento (no solo en el Paso 4).
10. El flujo de pago del recargo reutiliza la pantalla del Paso 4 (similar a cuando se paga una reserva).

**Campos nuevos necesarios:**
- `reservas/{id}.reprogramacionesCount: number` (contador 0-2).
- `reservas/{id}.vencimientoReserva: Timestamp` (fecha original + 15 días).
- `reservas/{id}.recargoPendiente: { monto: number, pagado: bool, motivo: string }`.
- `reservas/{id}.asistenciaD1: 'pendiente' | 'completado' | 'ausente'`.
- `reservas/{id}.asistenciaD2: 'pendiente' | 'completado' | 'ausente'`.
- `configuraciones/main.recargoReprogramacionGlobal: number`.
- `cursos/{id}.recargoReprogramacionOverride: number` (opcional).

**Archivos nuevos a crear:**
- `src/modules/estudiante/views/ReprogramarView.jsx` (pantalla de solicitud).
- `src/modules/shared/services/RecargoService.js` (cálculo de recargos).
- `src/modules/shared/views/TerminosCondicionesView.jsx` (T&C accesibles).

**Fases de implementación (recomendadas):**
- **Fase 1:** Modelo de datos + Reglas Firestore.
- **Fase 2:** UI del admin (configuración de recargos + badges de vencimiento).
- **Fase 3:** T&C legales (textos + acceso en panel del estudiante).
- **Fase 4:** UI del estudiante (solicitud de reprogramación, T&C).
- **Fase 5:** Flujo de pago del recargo.
- **Fase 6:** Test E2E completo.

**Estado:** Esperando confluencia FIRE + MAMBA. Freno Táctico activo.

**Ticket:** B-FEATURE-REPROGRAMACION-CON-RECARGO
**Prioridad:** ALTA.

---

### 🔴 ALTA — B-ESTADO-VENCIDA

**Descripción:** Nuevo estado `estadoCurso: 'Vencida'` para reservas que pasaron 15 días desde su fecha original sin ninguna acción. El admin puede desbloquearlas.
**Ticket:** B-ESTADO-VENCIDA
**Prioridad:** ALTA.

---

### 🟡 MEDIA — B-ASISTENCIA-POR-DIA

**Descripción:** El modelo actual solo tiene un `estadoCurso` por reserva, pero los cursos de 2 días necesitan un estado por día. Se propone agregar `asistenciaD1` y `asistenciaD2`.
**Ticket:** B-ASISTENCIA-POR-DIA
**Prioridad:** MEDIA.

---

## Actualización 2026-11-12 (Parte 4) – Bug visual pendiente

### 🟢 BAJA — B-SELECT-ACADEMICO-PLACEHOLDER

**Descripción:** El filtro académico en `AdminReservasList.jsx` muestra "Seleccione..." en lugar de "Todos" cuando el estado inicial es `'Todos'`. La lógica funciona (el filtro se aplica correctamente), pero el componente `<Select>` no encuentra la opción correspondiente y muestra el placeholder.

**Causa probable:** El componente `Select` de `src/components/UI.jsx` espera un array de objetos `{ id, nombre }`, pero el filtro académico le pasa un array de strings `['Todos', 'No iniciado', 'Iniciado', 'Completado', 'Ausente']`. Los demás filtros (Sedes, Cursos, Instructores) sí usan objetos y funcionan bien.

**Fix propuesto:** Convertir el array de opciones del filtro académico a objetos `{ id: 'Todos', nombre: 'Todos' }`, etc. O ajustar el componente `<Select>` para aceptar strings también.

**Archivos involucrados:**
- `src/modules/admin/components/AdminReservasList.jsx` (línea del `<Select>` del filtro académico)
- `src/components/UI.jsx` (componente `Select`)

**Ticket:** B-SELECT-ACADEMICO-PLACEHOLDER
**Prioridad:** BAJA (cosmético, funcionalidad OK).

---

## Actualización 2026-11/12/2026 – Cierre de sesión maratón

### Resumen de lo cerrado hoy
- Rediseño completo de Ocupación Diaria (semáforo 4 estados + 4 filtros + modal).
- Homologación de sedes en 15 archivos.
- 7 reservas incompletas cerradas (3 Aprobadas, 2 con horasPendientes, 2 Ausentes).
- Estado `Ausente` + `horasPendientes` visibles en Admin e Instructor.
- Filtro "Solo con horas pendientes" en Admin.
- Bug del `<Select>` académico parcialmente corregido (funciona, muestra placeholder).

### Deudas pendientes al cierre (priorizadas)

| Ticket | Prioridad | Estado |
|---|---|---|
| `B-FEATURE-REPROGRAMACION-CON-RECARGO` | 🔴 ALTA | Fase 0 documentada. Esperando FIRE+MAMBA. |
| `B-LOOP-FECHAS-PASO3` | 🔴 ALTA | Sin diagnóstico. Pendiente log temporal. |
| `B-FIX-APROBAR-USUARIO-FALTANTE` | 🔴 ALTA | Sin fix aplicado (usar `set merge`). |
| `B-ESTADO-VENCIDA` | 🔴 ALTA | Sin implementar. |
| `B-ASISTENCIA-POR-DIA` | 🟡 MEDIA | Sin implementar (`asistenciaD1`/`asistenciaD2`). |
| `B-ESTADO-AUSENTE` (completo) | 🟡 MEDIA | Falta UI en Estudiante + filtros. |
| `B-HORAS-PENDIENTES-UI` | 🟡 MEDIA | Falta UI en Estudiante. |
| `B-SELECT-ACADEMICO-PLACEHOLDER` | 🟢 BAJA | Cosmético. Convertir strings a objetos. |

### ✅ CERRADO — B-FIX-CAMBIAR-HORARIO-SLOT
**Descripción:** El modal de cambiar horario bloqueaba slots si cualquier reserva los ocupaba, en lugar de validar colisión de instructor/moto.
**Fix:** Reescritura de `otraOcupaSlot` en `CambiarHorarioModal.jsx`.
**Estado:** Deployado y verificado en PROD (12/11/2026).

## Actualización 2026-11-12 – FEATURE-WHATSAPP-POR-ESTADO (CERRADA)

**Mensajes implementados (4):**
- ✅ Aprobación de pago (reserva individual).
- ✅ Pack aprobado (con primera sesión agendada).
- ✅ Reprogramación (reponer D2 + cambio total).
- ✅ Rechazo de pago (reserva + pack, solo variante "corregir").

**Elementos diferenciadores:**
- Link de Google Maps con dirección exacta por sede.
- Código corto de reserva (#A1B2).
- Recordatorio "llega 15 minutos antes".
- Contador de intentos restantes en rechazo.
- Link directo a `/corregir-pago/:tipo/:id` o `/mi-pack/:id`.

**Validación técnica:**
- Probado en Android (entorno real de uso) → Emojis y links funcionan perfecto.
- Bug conocido de WhatsApp Web (Windows) que corrompe emojis no afecta a la operación porque el admin opera desde el móvil.

**Deuda diferida:**
- Cancelación definitiva, recordatorios automáticos 24h, y otros estados secundarios quedan para el backlog a largo plazo.

## Actualización 2026-11-12 (Sesión Tarde) – Nuevos requerimientos del Operador

**Pendientes Rápidos:**
- [ ] [NUEVA] Hora de creación (`createdAt`) en reservas y packs.
- [ ] [NUEVA] Modal de descripción detallada de cada sesión en packs públicos.
- [ ] [NUEVA] Historial de compras con montos en panel del estudiante.

**Pendientes Medios:**
- [ ] [NUEVA] Admin: Opción de completar módulos y sesiones enteras manualmente.
- [ ] [NUEVA] Admin: Vista de progreso del pack (cuántos cursos terminó el usuario).
- [ ] [NUEVA] Admin: Opción de cambiar sede en reservas y packs.
- [ ] [NUEVA] Métricas: Tasa de conversión Equilibrio → otros cursos.
- [ ] [NUEVA] Métricas: Ranking de cursos más vendidos.

**Pendientes Grandes (Requieren FIRE+MAMBA):**
- [ ] [NUEVA] Admin: Hoja dedicada de usuario (cliente recurrente).
- [ ] [NUEVA] Inscripción Paso 3: Ver disponibilidad de otras sedes sin volver al Paso 2.
- [ ] [NUEVA] Servicio de búsqueda a domicilio (moto escuela / moto propia).

## Actualizacion 2026-11-13 - Cierre de Sesion Directorio y WhatsApp

**Cerrado en esta sesion:**
- WhatsApp Service + Modal (Aprobacion, Pack, Reprogramacion, Rechazo).
- Directorio de Actores con filtros cruzados y contador dinamico.
- 4 Fichas dedicadas (Cliente, Tutor, Proveedor, Moto) con historial interactivo.
- Rediseno visual del Admin Dashboard (Top ventas, Conversion, Ingresos corregidos).
- Admin puede completar modulos y cursos enteros desde la reserva.
- Fix de calculo contable en packs ($99 a $81) y movimientos financieros.

**Deudas pendientes (Nuevas):**
- [DEUDA-WHATSAPP-CANCELACION] Agregar plantilla de mensaje para cancelacion definitiva (actualmente solo se envia en rechazo/correccion).
- [DEUDA-FICHA-EDITABLE] Las fichas del Directorio son de solo lectura. Se debe permitir editar datos (telefono, correo) directamente desde la ficha del actor.
- [DEUDA-EDITAR-TUTOR-MOTO] Boton de edicion rapida en la Ficha del Tutor/Proveedor/Moto.
- [DEUDA-PROXIMO-SERVICIO] Mostrar un widget en la Ficha del Tutor con su "Proxima clase agendada".
- [DEUDA-LIMPIAR-SCRIPTS] Borrar el archivo `setup-fichas-actores.mjs` generado temporalmente.
- [DEUDA-DEPLOY-PROD] Todo este trabajo (WhatsApp, Directorio, Fichas, Admin) debe migrarse a PROD cuando el Operador lo autorice.

## Actualizacion 2026-11-13 (Noche) - Refactor SSOT y Deploy

**Cerrado:**
- Centralizacion de `getEstadoLogico` en `estadoHelpers.js` (SSOT).
- Optimizacion de consultas en fichas de Tutor, Proveedor y Moto (where especifico).
- Disclaimer de metricas en las 3 fichas.
- Deploy exitoso a PROD.

**Deudas Pendientes (Nuevas):**
- [CRITICO] Desnormalizar contadores financieros (totalGanado, sesionesCompletadas) en el documento del actor (instructor/proveedor) mediante Trigger o servicio asincrono. Actualmente se calculan leyendo historial, lo que puede mentir si supera el limite de consulta.
- [DEUDA-INDICES-FIRESTORE] Documentar en README los indices compuestos necesarios para las consultas `where` de las 3 fichas.

## INCIDENTE 2026-11-17 - Loop de auto-jump agota cuota de Firestore

- [CRITICO] INC-2026-11-17 - Loop de auto-jump en AgendarPackView.jsx agoto la cuota de Firestore (Plan Spark). Bloqueo inscripciones y pagos. Causa raiz no confirmada al 100%. Requiere diagnostico post-reset de cuota.
- [CRITICO] B-LOCK-HUERFANO-19NOV-H2 - Lock huerfano del cliente del jueves 19/11 a las 10am. Requiere busqueda y limpieza manual.
- [CRITICO] B-LOCK-HUERFANO-23NOV-H1 - Locks huerfanos creados por el loop. El h1 del 23/11 aparece "No disponible" sin bloqueo administrativo. Requiere auditoria y limpieza.
- [ALTA] B-AUTOJUMP-REDISENO - El auto-jump requiere rediseno estructural. Los fixes sucesivos no resolvieron el loop.
- [ALTA] B-RATELIMIT-LOCKS - Implementar rate limiting en LockService.escucharOcupacionTemporal para prevenir sangrado de cuota.
- [ALTA] B-ALERTA-CUOTA-FIRESTORE - Monitoreo proactivo de cuota.
- [MEDIA] B-DEPLOY-VERIFICACION - Protocolo: verificar hash del dist post-build antes de cada deploy.


### Actualizacion 2026-11-19 - BUG-1 resuelto y deploy PROD

**Cerrado:**
- [x] BUG-1: reasignarInstructor registra evento reasignacion_tutor en reprogramaciones (arrayUnion + increment). Deploy PROD verificado (chunk AdminReservaDetalle-BaCKGH-E.js).

**Deudas registradas:**
- [CRITICO] BUG-2: crearReserva / crearReservaPack / agendarSiguienteCursoPack no validan cross-check contra ocupacionConfirmada. Resolucion aprobada: opcion (a) pre-query + validacion dentro de transaccion. Opcion (b) MAMBA (coleccion slotsInstructor con ID deterministico) queda como deuda post-MVP con backfill.
- [MEDIA] El batch.set al espejo ocupacionConfirmada propaga reprogramaciones, motivoRelevo y reasignadoPor por el spread de datosActualizacion. Evaluar whitelist de campos del espejo.
- [MEDIA] Formalizar B-DEPLOY-VERIFICACION: grep del chunk post-build + HTTP 200 y contenido del chunk post-deploy.
- [INFO] Divergencia intencional DEV/PROD en AgendarPackView.jsx (auto-jump desactivado solo en PROD). No sincronizar.



**Actualizacion 19/11/2026 - Reparacion de auditoria aplicada:**
- [x] Evento reasignacion_tutor del 19/11 17:01Z insertado en reservas/RCPBr7pVP7OKu27o3mAW (arrayUnion + increment). reprogramacionesCount: 1 -> 2. Verificado contra Firestore.
- Backup previo: backup/prod/simon-RCPBr7pVP7OKu27o3mAW-2026-11-19T19-31-06-025Z.json
- Script de reparacion eliminado tras uso (no commiteado).



### Actualizacion 2026-11-19 - BUG-2 implementado en DEV (pendiente deploy)

**Cerrado en DEV (no deployado):**
- [x] Pre-check de ocupacion en crearReserva, crearReservaPack y agendarSiguienteCursoPack.
- [x] D1: bloqueo por lock activo de otro usuario (ocupacionTemporal).
- [x] Cross-check de instructor y moto + normalizacion de traeMoto.
- [x] Propagacion de horaIdReposicion/motoReposicionId al espejo; cambio total de horario limpia D2 obsoleto.
- [x] Reset de estado de lock en InscripcionView y AgendarPackView ante slot-occupied.
- [x] Fixtures del helper: 15/15 PASS. Build DEV verde.

**Deudas registradas:**
- [CRITICO] B-SLOTS-INSTRUCTOR: migrar a coleccion slotsInstructor con ID deterministico (opcion b MAMBA) + backfill. Cierra la ventana TOCTOU residual.
- [CRITICO] B-CROSSCHECK-ADMIN: extender el cross-check a cambiarHorario, reasignarInstructor y reposicion D2.
- [MEDIA] B-ESPEJO-FANTASMA-RECHAZADO: reservas rechazadas para correccion que nunca se corrigen/cancelan mantienen el espejo en Pendiente y bloquean el horario. Requiere script de reconciliacion.
- [MEDIA] B-REMOVER-KILLSWITCH: retirar SOLAPAMIENTO_CROSSCHECK_ENABLED tras estabilizar en PROD.
- [MEDIA] B-MIRROR-WHITELIST (ya registrada): el batch.set al espejo propaga campos de auditoria por spread; evaluar whitelist.



**Actualizacion 19/11/2026 - Auditorias pre-deploy BUG-2 (solo lectura):**
- [x] Replay DEV: 79/79 conflictos de instructor y 76/76 de moto detectados; 0 mismatches y 0 falsos positivos en 60 combinaciones; queries 'in' consistentes.
- [x] PROD: 0 espejos fantasma, 0 colisiones existentes, 0 locks activos; 1 lock expirado (30/11 h2) sin impacto.
- [x] Locks huerfanos 19/11 h2 y 23/11 h1: ya no existen en ocupacionTemporal/locks. Deuda B-LOCK-HUERFANO cerrada de facto.
- [ ] Pendiente: happy path en DEV y deploy a PROD con autorizacion del Operador.



**Actualizacion 19/11/2026 - Paridad DEV/PROD y hotfix auto-jump:**
- [x] HOTFIX `if (true) return;` agregado tambien en DEV (AgendarPackView.jsx). Diff DEV vs PROD: solo las 9 lineas de reset BUG-2.
- [x] Regla vigente: los archivos DEV y PROD deben ser siempre identicos; la divergencia se elimina en el mismo release.
- [INFO] El auto-jump queda desactivado en ambos entornos hasta B-AUTOJUMP-REDISENO. Alternativas futuras: retirar hotfix tras validacion o flag por entorno con dictamen FIRE + MAMBA.



**Cierre deploy BUG-2 (19/11/2026):**
- [x] Deploy hosting PROD OK (89 archivos). Sitio 200; chunks con slot-occupied verificados en vivo.
- [x] Paridad src DEV/PROD: 0 diferencias por SHA256 (incluye hotfix auto-jump en ambos).
- [x] Backups: PROD backup/pre-deploy-bug2-crosscheck; DEV backup/pre-bug2-crosscheck y backup/pre-hotfix-parity.
- [ ] Pendiente: smoke test happy path (reserva normal) y monitoreo de errores slot-occupied/ocupacion-no-verificable.



**Documentacion de flujos (19/11/2026):**
- [x] Base documental creada: docs/README.md, docs/flujos/_PLANTILLA.md, docs/flujos/INDICE.md, fichas 01 y 02.
- [ACEPTADO] R-PIN-PII-19NOV: exposicion de PIN/PII en progresoInscripcion aceptada temporalmente. Ver docs/decisiones/ADR-001-riesgo-pin-pii-aceptado.md.
- [DEUDA] B-REGISTRO-REDESIGN: rediseno del flujo de registro y recuperacion (mostrar PIN antes del pago, email-link o reset, separar PII/PIN). Sin fecha.
- [DEUDA] B123 sigue vigente: recuperacion de PIN olvidado.
- [DEUDA] B-DOC-FLUJOS-FASE2: documentar flujos 03-13 segun prioridad del INDICE.



**Documentacion Fase 2 (19/11/2026):**
- [x] Fichas 03 (disponibilidad/locks) y 04 (reserva/espejo) creadas y enlazadas en el INDICE.
- [HALLAZGO] instructoresPermitidos no homologado: individual fail-closed (InscripcionView:105-109) vs packs fail-open (useDisponibilidadPack:43-50). Requiere dictamen FIRE+MAMBA.
- [DEUDA] B-ESPACIO-LIMITE-100: useOcupacionConfirmada limita a 100 docs por query; evaluar subir/paginar y medir cuota.



**Documentacion Fase 3 (19/11/2026):**
- [x] Ficha 07 (aprobacion/rechazo/correccion de pagos) creada y enlazada.
- [DEUDA] B-MOVIMIENTOS-ATOMICOS: el ingreso se registra despues del commit y no es atomico; pack no registra movimiento (por verificar).
- [DEUDA] B-INTENTOS-CORRECCION: el tope de 3 intentos es solo UI; no hay validacion en servicio ni reglas.
- [HALLAZGO] estadoCurso 'En Curso' al aprobar no lo usa getEstadoLogico; rechazadoEn es number en individual y Timestamp en packs.



**Documentacion Fase 4 (19/11/2026):**
- [x] Fichas 05 (compra) y 06 (agendamiento) creadas y enlazadas.
- [DEUDA CRITICA] B-PACK-RULES-OWNER: reservasPack.update permite al dueno cambiar estadoPago/precio/vencimiento (firestore.rules:243-251).
- [DEUDA CRITICA] B-PACK-RULES-CHILD: child pack_sub puede nacer Aprobado sin validar maestra aprobada (firestore.rules:107-133).
- [DEUDA CRITICA] B-PACK-PRECIOS-CLIENTE: backend calcula precios/comisiones desde cursoSnapshot del cliente.
- [DEUDA] B-PACK-PRECIO-TEORICOS: UI suma teoricos, backend no; pagoTotalMoneda vs pagoTotalVES divergen.
- [DEUDA] B-PACK-DOBLE-COMPRA: chequeo de pack activo no transaccional y fail-open.
- [DEUDA] B-PACK-AVANCE-FIRE-AND-FORGET: avance del pack sin reintento.
- [DEUDA] B-PACK-CREATEDAT: claves createdAt duplicadas en maestra/child.
- [HALLAZGO] auto-jump de packs desactivado (AgendarPackView.jsx:302).



**Documentacion Fase 5 (19/11/2026):**
- [x] Ficha 08 (reasignacion tutor, cambio moto, horario y D2) creada y enlazada.
- [DEUDA] B-D2-CONFLICTO-REPOSICION: helpers comparan solo horaId, no horaIdReposicion.
- [DEUDA] B-ESPEJO-AUDITORIA: reprogramaciones/motivos/split se copian a ocupacionConfirmada.
- [DEUDA] B-CAMBIO-CANCELADO: boton/handler permiten cambiar horario de canceladas.
- [DEUDA] B-REPROG-AUDIT-MUTABLE: auditoria en reserva, editable; sin log inmutable.
- [DEUDA] B-D2-PROVEEDOR (por verificar): motoReposicionId no actualiza proveedor.
- [DEUDA] B-REASSIGN-PAGO-PARCIAL (por verificar).



**Documentacion Fase 6 (19/11/2026):**
- [x] Ficha 09 (aula virtual y sesiones) creada y enlazada.
- [DEUDA] B-AULA-PRESENCIA-HEARTBEAT: sin heartbeat periodico; primer modulo bloqueado si presencia >2 min.
- [DEUDA] B-REVERTIR-MODULO: estadoCurso queda Aprobado y el pack ya pudo avanzar.
- [DEUDA] B-PAUSA-60: pausa >60 min no registra pausa ni finaliza curso.
- [DEUDA] B-AULA-TIMESTAMPS-CLIENTE: tiempos con Date.now() del navegador, sin validacion de servidor.
- [DEUDA] B-AULA-TZ: fechas Caracas vs hora local del navegador.
- [DEUDA] B-AULA-MANUAL-COMPLETE, B-AULA-OFFLINE, B-AULA-ADMIN-ROUTE, B-AULA-EMERGENCIA.



**Documentacion Fase 7 (19/11/2026):**
- [x] Ficha 11 (finanzas y movimientos) creada y enlazada.
- [DEUDA CRITICA] B-FINANZAS-CAMPOS-LEGACY: tarjetas usan pagoInstructor/pagoProveedor no escritos; deuda 0 y ganancia = ingresos.
- [DEUDA] B-MOVIMIENTOS-USERID: saveMovimiento sobrescribe userId con el admin.
- [DEUDA] B-MOVIMIENTOS-RULE: movimientos.create abierto a cualquier auth.
- [DEUDA] B-PAGOS-MONTO-LIBRE: montoTotal no se reconcilia con detalles.
- [DEUDA] B-PAGOS-PROVEEDOR-LEGACY: ruta sin pagosStaff ni transaccion.
- [DEUDA] B-MOVIMIENTOS-ID, B-FINANZAS-PROVEEDOR-CONFIG, B-PAGOS-PROVEEDOR-OWNERSHIP.



**Documentacion Fase 8 (19/11/2026):**
- [x] Ficha 10 (portales estudiante/instructor/proveedor) creada y enlazada.
- [DEUDA CRITICA] B-INSTRUCTOR-PERFIL-RULES: PerfilTab escribe instructores, regla solo admin; guardar perfil falla.
- [DEUDA CRITICA] B-PROVEEDOR-MIRROR-PAGOS: el espejo no tiene pagadoProveedor/estadoCurso; portal muestra 0 cobrado y todo por cobrar.
- [DEUDA] B-INSTRUCTOR-SPLIT-VISIBILIDAD: colaborador solo visible en Finanzas.
- [DEUDA] B-PORTAL-LIMITS, B-ESTUDIANTE-CTX-RESERVAS, B-PROVEEDOR-MIRROR-STALE, B-PORTAL-EAGER, B-PROVEEDOR-BLOQUEOS.



**Documentacion Fase 9 (19/11/2026):**
- [x] Ficha 12 (teoricos) creada y enlazada.
- [DEUDA CRITICA] B-TEORICO-MODULO-BYPASS: el modulo se abre por URL sin acceso aprobado.
- [DEUDA CRITICA] B-TEORICO-PRECIO-CLIENTE: el precio lo envia el navegador; la regla solo exige >0.
- [DEUDA] B-TEORICO-VENCIMIENTO: el acceso temporal vencido sigue abierto.
- [DEUDA] B-TEORICO-DOBLE-COMPRA, B-TEORICO-QUIZ-CLIENTE, B-TEORICO-MOV-ATOMICO, B-TEORICO-APROBACION-DOBLE, B-TEORICO-CAPACIDAD.



**Documentacion Fase 10 - CIERRE (19/11/2026):**
- [x] Ficha 13 (operacion/deploy/backups) creada y enlazada.
- [x] Documentacion de flujos completa: 13/13 fichas (01-13).
- [DEUDA CRITICA] B-DEV-GIT-SUCIO: DEV ahead 3/behind 8 y cientos de archivos sin commit; fuente = filesystem.
- [DEUDA CRITICA] B-REGLAS-FUENTE-DUDOSA: memoria dice consola, repo trackea firestore.rules.
- [DEUDA] B-FIREBASE-JSON-PARIDAD (DEV sin indexes), B-PWA-CACHE-STALE, B-NO-DEPLOY-SCRIPT.
- [DEUDA] B-REMOTES-DISTINTOS, B-BACKUPS-LOCAL-ONLY, B-MIGRACION-DOC-OUTDATED, B-DEPLOY-RULES-SIN-EMULADOR, B-HOSTING-VS-COMMIT.
- [SIGUIENTE] Analisis de criticos + plan de regresion antes de corregir.



**Fase 0 auditoria (19/11/2026):**
- [x] ISS-00 alcance ADR-001 aclarado en ADR-002 (solo PIN/PII).
- [x] ISS-01 reglas vivas exportadas: DEV/PROD = repo, SHA256 9F1D26...F7D20; backups en backup/audit-rules-*.
- [x] ISS-02 packs legacy: 0 sin packSnapshot; no requiere backfill.
- [x] ISS-03 accesos teoricos: 0 IDs uid_curso; 8 random + 7 pack_*; ISS-16 bloqueante.
- [x] ISS-04 instructores: docId = Auth UID; no existe userId; usar docId en regla.
- [x] ISS-05 estados: bloqueado/activo/completado; avanzarPack tambien escribe vencido.
- [CRITICO] ISS-36: instructores guarda password no vacio (2/2 DEV y PROD) y isAuth permite leer; PII/credenciales expuestas. Requiere contencion propia.
- [BLOQUEANTE] ISS-16 (IDs teoricos) e ISS-36.
- [SIGUIENTE] ISS-11 movimientos admin-only, luego ISS-13/14 perfil instructor.



**ISS-36A contencion staff password (19/11/2026):**
- [x] Codigo: no se escribe/persiste `password` en Firestore; edicion no la prellena; wrappers la eliminan.
- [x] Datos DEV: 2 instructores + 4 proveedores sin password.
- [x] Datos PROD: 2 instructores + 2 proveedores sin password.
- [x] Build DEV/PROD y deploy hosting PROD; smoke 200.
- [x] Backups estructurales sin valores: backup/purge-staff-password-*.
- [PENDIENTE CRITICO] ISS-36B: PII de instructores/proveedores (cedula, pagos) legible por cualquier auth.
- [PENDIENTE] ISS-36C: rotar passwords de staff expuestas usando Restablecer contrasena.



**ISS-36B staff publico/privado (19/11/2026):**
- [x] `instructoresPublicos` creado; 2 docs DEV + 2 PROD; sin PII.
- [x] Reglas: instructores/proveedores admin o dueno; instructoresPublicos auth/admin.
- [x] AuthProvider por UID; FirestoreProvider condicional; saveInstructor dual-write.
- [x] Pruebas DEV y PROD de lectura; hosting/reglas desplegados; smoke 200.
- [PENDIENTE] ISS-36C rotacion de passwords staff.
- [PENDIENTE] ISS-13/14 perfil de instructor (escritura owner).

