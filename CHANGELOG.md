# ⚠️ REGLA: Este archivo es de solo ADICIÓN. NUNCA se reemplaza. Cada sesión agrega al final.
# CHANGELOG.md – MotoEscuela App v1.1.0
## Registro exhaustivo de modificaciones en el chat actual

### Sesión 16/06/2026 (mañana) – Mejoras visuales y feedback
- **B39** – `src/views/InscripcionView.jsx`: Completada lista de bancos venezolanos.
- **B32** – `src/views/InscripcionView.jsx`: Reducido margen inferior del mensaje de recargo "sin bici".
- **B34** – `src/views/InscripcionView.jsx`: Reducido padding vertical y espacio en paso 4 (Pago).
- **B35** – `src/views/InscripcionView.jsx`: Teléfono y Cédula agrupados en grid de 2 columnas en paso 4.
- **B28** – `src/views/InscripcionView.jsx`: Feedback visual al seleccionar horario (estado `selectingBlockId`, mensaje "Procesando...").
- **B53** – `src/views/InscripcionView.jsx`: Eliminado parpadeo rojo en botones de horario durante selección.
- **B64** – `src/views/InscripcionView.jsx`: Validación de bloques vencidos (función `isPastBlock` rescatada) con etiqueta "CERRADO".
- **B65** – `src/views/InscripcionView.jsx`: Compactadas visualmente las tarjetas del paso 4.
- **B66** – Registrado en backlog (validación de edad máxima, no implementado aún).
- **B67** – Registrado en backlog (opción `prestamoMoto` en cursos, no implementado aún).
- **B44** – `src/views/PortalEstudiante.jsx`: Corrección de redirección post-login de estudiante.
- **B44** – `src/views/EstudiantePanel.jsx`: Eliminada dependencia de `autoLoginData`, búsqueda directa de curso en Firestore.
- **B44** – `src/App.jsx`: Agregada ruta protegida `/portal-reservas` para estudiantes.
- **B41** – `src/components/ModalPIN.jsx`: Cambiado título a "Formulario Enviado" y subtítulo explicativo.

### Sesión 15/06/2026 (tarde/noche) – Estabilización del flujo de registro
- **B52** – `src/views/InscripcionView.jsx`: Corrección de pantalla en blanco en paso de pago (error de íconos y carga de datos).
- **B5, B40, B44** – `src/services/AuthService.js`: Agregados `loginAnonimo`, `eliminarCuentaAnonima` y `vincularEstudianteAnonimo`.
- **B5, B40, B44** – `src/views/InscripcionView.jsx`: Implementada autenticación anónima inicial, luego migrada a creación temprana de estudiante en paso 1. Auto-login al completar.
- **B40** – `src/services/LockService.js`: Expiración de lock aumentada a 10 minutos.
- **B62** – `src/services/ReservaService.js`: `cursoId` agregado a campos obligatorios.
- **B62** – `src/views/InscripcionView.jsx`: Inicialización automática de `cursoId` al cargar cursos. Validación redundante en paso 2.
- **B41** – `src/components/ModalPIN.jsx`: Corregido texto prematuro de éxito ("Formulario Enviado").
- **B13** – `src/views/InscripcionView.jsx` y `src/services/ReservaService.js`: Reemplazo de campo "edad" por "fechaNacimiento" con validación de mayoría de edad.
- **B18** – `src/views/InscripcionView.jsx`: Paso 1 dividido en 1a (Configurar Clase) y 1b (Selección de Horario) para eliminar scroll.
- **B19** – `src/views/InscripcionView.jsx`: Layout del paso 2 reorganizado en grid de 2 columnas.
- **B21** – `src/views/InscripcionView.jsx`: Agregado icono `Calendar` al input de fecha en paso 1.
- **B22** – `src/views/InscripcionView.jsx`: Corrección de falsos negativos en validación de mayoría de edad.
- **B23** – `src/views/InscripcionView.jsx`: Mensaje de validación de edad reubicado y condicionado a campos completos.
- **B24** – `src/views/InscripcionView.jsx`: Agregado icono `User` al campo Apellido.
- **B25** – `src/views/InscripcionView.jsx`: Barra de progreso reemplazada por pista horizontal con ícono de motocicleta (`Bike`).
- **B26** – `src/views/InscripcionView.jsx`: Tarjetón de resumen de clase en paso 1b con diseño mejorado.
- **B29** – `src/views/InscripcionView.jsx`: Corregido z-index de la moto en la barra de progreso (ahora `z-30`).
- **B30** – `src/views/InscripcionView.jsx`: Agregado icono `MapPin` al Select de Estado.
- **B31** – `src/views/InscripcionView.jsx`: Cambiado icono de Cédula a `Contact` (tarjeta de identidad).
- **B33** – `src/views/InscripcionView.jsx`: Agregado placeholder "Ej: Petare" al campo Zona.
- **B36** – `src/views/InscripcionView.jsx`: Cambiado icono de Banco Emisor a `Building2` (luego a `CreditCard` por compatibilidad).
- **B37** – `src/views/InscripcionView.jsx`: Unificado icono de cédula en paso 3 (`Contact`).
- **B45** – `src/views/InscripcionView.jsx`: Agregado botón `X` en barra superior para salir al Home.
- **B48** – `src/views/InscripcionView.jsx`: Ajustes de padding para recuperar espacio vertical y eliminar scroll.
- **B47** – `src/components/UI.jsx`: Cambiado `transition-all` a `transition-colors` para eliminar vibración en inputs.
- **B14, B46, B60** – `src/views/PortalEstudiante.jsx`, `src/views/EstudiantePanel.jsx`: Correcciones de sesión y acceso al panel.

### Documentación Creada/Actualizada
- `BACKLOG_V2.md`: Lista completa de deuda técnica (27 ítems).
- `BITACORA_EXPERIENCIAL.md`: Decisiones clave y lecciones aprendidas.
- `ARRANQUE_MEMORIA_IA.md`: Contexto para restaurar la memoria del Arquitecto en una nueva instancia.
- `CHANGELOG.md`: Este archivo.

### Sesión 16/06/2026 (tarde) – Diagnóstico y corrección de disponibilidad
- **B5** – `src/views/TestBloquesView.jsx`: Creación de página de prueba con carga directa de Firestore.
- **B5** – `src/views/TestBloquesView.jsx`: Añadida búsqueda exacta y carga de todos los nombres.
- **B5** – `src/views/TestBloquesView.jsx`: Eliminada restricción de hora y añadido mensaje de cabecera con fecha y conteo.
- **B5** – `src/context/AppContext.jsx`: Corrección de `appId` a `motoescuela-pro-v1` y ajuste del filtro de `reservas` al campo `fecha`.
- **B5** – `src/App.jsx`: Eliminada ruta de prueba `/test-bloques` (posteriormente reañadida para continuar diagnóstico).
- **B69** – `BACKLOG_V2.md`: Registrada deuda para habilitar/deshabilitar bloques de horario desde el panel.
- **B70** – `BACKLOG_V2.md`: Registrada deuda para agrupar y deshabilitar bloques de horario por grupo (mañana/noche).

### Sesión 17/06/2026 (madrugada) – Corrección del Dashboard
- **B51** – `src/context/AppContext.jsx`: Agregada función `handleSaveInstructorSeguro` para crear instructores correctamente.
- **B71-B74** – `BACKLOG_V2.md`: Documentadas funciones ausentes como deuda técnica (`seedDatabase`, `cleanExpiredLocks`, `refreshExchangeRates`, `rateFetchError`).

### Sesión 17/06/2026 (madrugada) – Corrección del Dashboard
- **B51** – `src/context/AppContext.jsx`: Agregada función `handleSaveInstructorSeguro` para crear instructores correctamente.
- **B71-B74** – `BACKLOG_V2.md`: Documentadas funciones ausentes como deuda técnica (`seedDatabase`, `cleanExpiredLocks`, `refreshExchangeRates`, `rateFetchError`).

---
### Sesión 18/06/2026 – Refactorización Mayor y Corrección de Bugs (v1.0.0 → v1.7.3)

**Infraestructura:**
- Creación de estructura canónica `src/modules/{auth,inscripcion,admin,shared}`.
- Sistema de diseño unificado: `AppShell.jsx`, `ToastProvider.jsx`.
- Configuración anti-caché: `vite.config.js`.

**Bugs cerrados:**
- B51: Implementación de `StaffService.js` con REST API para crear instructores/proveedores.
- B71-B74: `seedDatabase`, `cleanExpiredLocks` implementados.
- AdminFinanzas: `saveMovimiento` ahora incluye `userId`.
- B17: Eliminado filtro de fecha en carga de reservas.
- B14/B46/B60: Restauración de rol al recargar página.
- B62: Evitar reintento de creación de cuenta al retroceder en paso 1.
- C1: `fechaNacimiento` agregado a `CAMPOS_PERMITIDOS` en `ReservaService`.
- B55: Eliminadas funciones de autenticación anónima.
- B15: Corrección definitiva de barra inferior del dashboard (AppShell).
- B27: Persistencia de formulario de inscripción con `sessionStorage`.
- B42a: Contador de tiempo de lock con renovación única y reloj SVG.
- B76: Validación obligatoria de "¿Sabe andar en bicicleta?".

**Mejoras visuales y UX:**
- HomeView: Mejoras de espaciado y color en botones.
- LoginView/PortalEstudiante: Eliminados títulos duplicados, botones unificados.
- Paso 4 (Pago): Rediseño completo (tarjeta factura, acordeón seamless, captcha reorganizado).
- Calendario: Límite de 15 días, sugerencia de próxima fecha.
- Disponibilidad: Cálculo en tiempo real con `useMemo`, eliminada caché estática.
- Parpadeo de bloques: Corregido con snapshot de locks durante selección.
- Reloj SVG con anillo de progreso y expiración automática.
- Placeholders con mejor contraste.
