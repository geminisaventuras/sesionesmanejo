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

### 🟢 Baja
- **[BAJA] B55** – Sesión anónima no sobrevivía a recarga (obsoleto).
- **[BAJA] B66** – Validación de edad máxima (110 años) en paso 1.
- **[MEDIA] B69** – Permitir al administrador habilitar/deshabilitar bloques de horario desde el panel de administración.
- **[MEDIA] B70** – Agrupar los bloques de horario en el panel de administración en dos secciones (Mañana: 8 AM – 6 PM / Noche: 6 PM – 6 AM) y agregar un botón para deshabilitar cada grupo completo de una sola vez.
- **[MEDIA] B69** – Permitir al administrador habilitar/deshabilitar bloques de horario desde el panel de administración.
- **[MEDIA] B70** – Agrupar los bloques de horario en el panel de administración en dos secciones (Mañana: 8 AM – 6 PM / Noche: 6 PM – 6 AM) y agregar un botón para deshabilitar cada grupo completo de una sola vez.
- **[MEDIA] B71** – `seedDatabase`: Función para inicializar la base de datos con datos de prueba (sedes, horarios, cursos, etc.) desde el panel de administración.
- **[MEDIA] B72** – `cleanExpiredLocks`: Función para limpiar locks expirados manualmente desde el panel de administración.
- **[MEDIA] B73** – `refreshExchangeRates`: Función para actualizar las tasas de cambio desde una API pública (actualmente solo disponible en versiones antiguas del contexto).
- **[MEDIA] B74** – `rateFetchError`: Estado para mostrar errores en la actualización de tasas de cambio.

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

- **[MEDIA] B83** – Flujo de reinscripción: si un estudiante ya registrado entra a /inscripcion, precargar sus datos personales y saltar al paso 2 automáticamente. Evita el mensaje de "sesión reiniciada" y agiliza la compra de cursos adicionales.

- **[MEDIA] B84** – Permitir al administrador restablecer la contraseña de instructores y proveedores desde el panel administrativo. Usar la REST API de Firebase Auth (`accounts:sendOobCode`) para enviar un enlace de restablecimiento al correo del instructor, sin necesidad de backend propio ni conocer la contraseña actual.

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

### Actualización 18/06/2026 – Lógica de InstructorPanel y nuevas funcionalidades
**Bugs cerrados / Mejoras:**
- ✅ Teléfono del estudiante oculto al instructor.
- ✅ Módulos con orden secuencial (siguiente bloqueado hasta completar anterior).
- ✅ Confirmación para desmarcar módulo.
- ✅ Módulos deshabilitados en cursos aprobados (solo lectura).
- ✅ Botón "Completar Curso" oculto si ya está aprobado.

**Nueva deuda técnica (panel EdTech):**
- **[MEDIA] B89** – Calificación mutua instructor ↔ estudiante con estrellas.
- **[MEDIA] B90** – Logros por módulo y curso (cálculo en tiempo real).
- **[MEDIA] B91** – Logros especiales persistentes.
- **[MEDIA] B92** – Sala de chat efímera instructor-estudiante.
- **[BAJA] B93** – Registro de horas de práctica.
- **[BAJA] B94** – Insignias gamificadas por competencias viales.
- **[BAJA] B95** – Modo de alto contraste y recursos offline.
- **[BAJA] B96** – Condiciones climáticas en práctica.
- **[BAJA] B97** – Orden secuencial configurable (libre/secuencial).
- **[BAJA] B98** – Nota del instructor por módulo.
- **[BAJA] B99** – Registro de instructorId en modulosEstado.

### Actualización 18/06/2026 – Auditoría del Centinela

**Hallazgos del Centinela analizados y convertidos en deuda:**
- **[MEDIA] B100** – Crear `ClaseService.js` para desacoplar la lógica de finalización de curso del componente UI.
- **[BAJA] B101** – Implementar trazabilidad W3C Trace Context (`traceparent`) si la arquitectura escala a microservicios.
- **[BAJA] B102** – Reemplazar inputs de fecha de nacimiento (día/mes/año) por `<input type="date">` nativo para cumplir WCAG 3.3.7.

**Hallazgos rechazados (Veto Supremo del Operador):**
- ❌ CRÍTICO 1 (Idempotencia): Ya cubierta por `lockId` + `runTransaction` + botones anti-pánico.
- ❌ CRÍTICO 2 (ClaseService): Aceptado como deuda B100, no como bloqueante. El sistema actual es funcional y seguro.

### Actualización 18/06/2026 – Módulo de Servicios

**Nueva deuda técnica:**
- **[MEDIA] B103** – Crear módulo de Servicios para que estudiantes y público puedan contratar servicios adicionales:
  - Mecánica de motos
  - Motolavado
  - Mandados / Delivery
  - Otros servicios de la escuela

### Actualización 18/06/2026 – Consolidación de deudas técnicas (B85-B107)

**Deudas registradas en sesiones anteriores:**
- **[ALTA] B85** – Implementar sistema de evaluaciones teóricas (quizzes, banco de preguntas, calificación).
- **[MEDIA] B86** – Crear sección de Recursos: leyes de tránsito, señales, documentales, blog.
- **[MEDIA] B87** – Crear sección de Cursos disponibles para re-inscripción desde el panel del estudiante.
- **[MEDIA] B88** – Unificar header de todas las vistas autenticadas.
- **[MEDIA] B89** – Calificación mutua instructor ↔ estudiante con estrellas.
- **[MEDIA] B90** – Sistema de logros por módulo y curso.
- **[MEDIA] B91** – Logros especiales persistentes.
- **[MEDIA] B92** – Sala de chat efímera instructor-estudiante.
- **[BAJA] B93** – Registro de horas de práctica por módulo.
- **[BAJA] B94** – Insignias gamificadas por competencias viales.
- **[BAJA] B95** – Modo de alto contraste y recursos offline.
- **[BAJA] B96** – Condiciones climáticas en registro de práctica.
- **[BAJA] B97** – Orden secuencial configurable (libre/secuencial).
- **[BAJA] B98** – Nota del instructor por módulo.
- **[BAJA] B99** – Registro de instructorId en modulosEstado.
- **[MEDIA] B100** – Crear ClaseService.js.
- **[BAJA] B101** – Trazabilidad W3C Trace Context.
- **[BAJA] B102** – Reemplazar inputs de fecha nacimiento por <input type="date">.
- **[MEDIA] B103** – Módulo de Servicios (mecánica, motolavado, delivery).

**Nuevas deudas (sesión 18/06/2026):**
- **[MEDIA] B104** – En paso 2 de inscripción, preguntar si prefiere curso en 1 día (4h) o 2 días (2h+2h).
- **[MEDIA] B105** – Pausar reloj general y temporizadores al llegar al límite del día 1.
- **[MEDIA] B106** – Reloj general debe reflejar división en sesiones (Día 1 de 2 / Día 2 de 2).
- **[BAJA] B107** – Módulo de fotos y videos con álbumes en servicio externo gratuito.

### Actualización 19/06/2026 – Posposición y Cancelación de Cursos

**Nuevas reglas de negocio y deuda técnica:**

- **[MEDIA] B108** – Implementar el flujo de "Posponer curso" en el panel del estudiante. El estudiante solo puede posponer el curso una vez. Debe seleccionar una nueva fecha disponible dentro de los próximos 15 días.
- **[MEDIA] B109** – Implementar la lógica de cancelación de curso si el estudiante no asiste a la segunda fecha programada. Al cancelarse, el curso queda en estado "Cancelado" y el estudiante debe pagar el precio completo de un nuevo curso para reinscribirse.
- **[MEDIA] B110** – Crear un registro de asistencia para que el instructor confirme la presencia del estudiante. Si el estudiante no se presenta, el instructor debe poder marcarlo como "No asistió" para iniciar el flujo de penalización.
- **[BAJA] B111** – Crear una sección de "Términos y Condiciones" en el flujo de inscripción (Paso 4). El estudiante deberá aceptar las políticas de posposición, cancelación y no reembolso antes de confirmar el pago.
- **[MEDIA] B112** – Implementar flujo completo de pago de tiempo extra: generación de cargo, pago por Pago Móvil desde EstudiantePanel, validación en AdminFinanzas y distribución porcentual automática a instructor, proveedor y escuela.
- **[BAJA] B113** – Configurar división del tiempo de receso (mitad y final del módulo) como opción avanzada en el CRUD de cursos.

### Actualización 19/06/2026 – Estética de diálogos de confirmación
- **[MEDIA] B114** – Reemplazar `window.confirm` en InstructorPanel (desmarcar módulo, completar curso) y en cualquier otro componente que use el diálogo nativo del navegador. Diseñar un modal de confirmación personalizado con el mismo estilo que los `ToastProvider` (bordes redondeados, sombra, iconografía de Lucide, botones "Confirmar" y "Cancelar"). También aplica para la reversión de módulos.

### Actualización 20/06/2026 – Refactorización y Aula Virtual
- **[ALTA] B116** – Restringir reversión de módulos: si el módulo actual lleva más de 3 minutos, no se puede revertir el anterior. Solo el administrador puede revertir módulos en caso de falla.
- **[MEDIA] B117** – Implementar clases virtuales online en el Aula Virtual para el módulo teórico. Permitir videollamadas o transmisiones en vivo sin requerir presencialidad.

### Actualización 20/06/2026 – Dashboard del estudiante y nuevas deudas
- **[BAJA] B115** – Convertir botón "Material" del Aula Virtual en una página independiente con soporte para PDFs, libros, notas y miniforo de comentarios.
- **[ALTA] B116** – Restringir reversión de módulos: si el módulo actual lleva más de 3 minutos, no se puede revertir el anterior. Solo el administrador puede revertir módulos en caso de falla.
- **[MEDIA] B117** – Implementar clases virtuales online en el Aula Virtual para el módulo teórico (videollamadas o transmisiones en vivo).

### Deudas previas restauradas (se perdieron en refactorización, ya reimplementadas)
- ✅ Checkpoint al 50% del módulo.
- ✅ Extensión de tiempo con validación de disponibilidad.
- ✅ División en dos días (sesión 1 / sesión 2).
- ✅ Degradación elegante ("Reconectando..." en el reloj).
- ✅ Regla de seguridad anti-sesión fantasma.
- ✅ Confirmación al desmarcar módulo con diálogo de honestidad.

### Actualización 20/06/2026 – Sistema de triple reloj y reserva de tiempo
- **[ALTA] B118** – Completar el flujo de reserva de tiempo: botón "Usar reserva", descuento del tiempo usado de `pausaTotalAcumulada`, persistencia en Firestore.
- **[MEDIA] B119** – Implementar el cambio automático de D1 a D2 al iniciar la sesión en la segunda fecha programada del curso.
- **[MEDIA] B120** – Registrar el tiempo excedente de sesión (`tiempoExtraSesionAcumulado`) cuando el reloj grande supera las 4 horas, para auditoría futura.
