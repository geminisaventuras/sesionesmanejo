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