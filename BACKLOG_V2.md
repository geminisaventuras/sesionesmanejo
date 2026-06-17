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
