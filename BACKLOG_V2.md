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
