# BACKLOG_V2.md – MotoEscuela App v1.7.3
## Deuda Técnica y Mejoras Pendientes

### 🔴 Críticos
- **[CRÍTICO] B17** – ✅ CORREGIDO: Reservas pendientes visibles (filtro de 30 días eliminado).
- **[CRÍTICO] B51** – ✅ CORREGIDO: Registro de Instructor con StaffService (REST API).
- **[CRÍTICO] B62** – ✅ CORREGIDO: Usuario puede corregir datos al retroceder.

### 🟡 Alta
- **[ALTA] B14** – ✅ CORREGIDO: Restauración de sesión y rol al recargar.
- **[ALTA] B15** – ✅ CORREGIDO: Barra inferior del dashboard fija (AppShell).
- **[ALTA] B27** – ✅ CORREGIDO: Persistencia de formulario con sessionStorage.
- **[ALTA] B42a** – ✅ CORREGIDO: Contador de tiempo de lock con renovación única y reloj SVG.
- **[ALTA] B43** – ✅ CORREGIDO: Mensaje de "Tiempo expirado" con liberación automática.
- **[ALTA] B46** – ✅ CORREGIDO: Restauración de rol (parte de B14).
- **[ALTA] B50** – ✅ CORREGIDO: Expiración del lock y limpieza automática.
- **[ALTA] B60** – ✅ CORREGIDO: Panel del estudiante no redirige mal al recargar.
- **[ALTA] B75** – ⬜ PENDIENTE: Registro con correo electrónico real.
- **[ALTA] B63** – ⬜ PENDIENTE: Asignar instructores a cursos específicos.
- **[ALTA] B67** – ⬜ PENDIENTE: Opción `prestamoMoto` en CRUD de cursos.

### 🟢 Media
- **[MEDIA] B16** – ⬜ PENDIENTE: Vibración/parpadeo de elementos al tocar.
- **[MEDIA] B20** – ⬜ PENDIENTE: Panel de Configuración del Sistema.
- **[MEDIA] B47** – ⬜ PENDIENTE: Temblor en inputs.
- **[MEDIA] B54** – ⬜ PENDIENTE: Estudiante ya inscrito no puede volver a registrarse.
- **[MEDIA] B57** – ⬜ PENDIENTE: Limpieza de cuentas huérfanas.
- **[MEDIA] B58** – ⬜ PENDIENTE: Cierre de sesión automático tras inactividad.
- **[MEDIA] B59** – ⬜ PENDIENTE: Rediseñar cabecera de registro.
- **[MEDIA] B61** – ⬜ PENDIENTE: Ordenar cursos en panel de administración.
- **[MEDIA] B69** – ⬜ PENDIENTE: Habilitar/deshabilitar bloques de horario.
- **[MEDIA] B70** – ⬜ PENDIENTE: Agrupar bloques de horario (Mañana/Noche).
- **[MEDIA] B71** – ✅ CORREGIDO: seedDatabase implementado.
- **[MEDIA] B72** – ✅ CORREGIDO: cleanExpiredLocks implementado.
- **[MEDIA] B73** – ⬜ PENDIENTE: refreshExchangeRates.
- **[MEDIA] B74** – ⬜ PENDIENTE: rateFetchError.
- **[MEDIA] B76** – ✅ CORREGIDO: Validación de "¿Sabe andar en bicicleta?".
- **[MEDIA] B77** – ⬜ NUEVA: Selector de rango de fechas configurable (7/15/30 días, 3/6/12 meses).
- **[MEDIA] B78** – ⬜ NUEVA: Calendario personalizado con fechas "FULL".

### 🟢 Baja
- **[BAJA] B55** – ✅ CORREGIDO: Código de autenticación anónima eliminado.
- **[BAJA] B66** – ⬜ PENDIENTE: Validación de edad máxima (110 años).
