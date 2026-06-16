# CHANGELOG.md – MotoEscuela App v1.7.3

### Sesión 18/06/2026 – Refactorización Mayor y Corrección de Bugs (v1.0.0 → v1.7.3)
- **Infraestructura:** Creación de estructura canónica `src/modules/{auth,inscripcion,admin,shared}`.
- **B51:** Implementación de `StaffService.js` con REST API para crear instructores/proveedores.
- **B71-B74:** `seedDatabase`, `cleanExpiredLocks` implementados.
- **AdminFinanzas:** `saveMovimiento` ahora incluye `userId`.
- **B17:** Eliminado filtro de fecha en carga de reservas.
- **B14/B46/B60:** Restauración de rol al recargar página.
- **B62:** Evitar reintento de creación de cuenta al retroceder en paso 1.
- **C1:** `fechaNacimiento` agregado a `CAMPOS_PERMITIDOS` en `ReservaService`.
- **B55:** Eliminadas funciones de autenticación anónima.
- **Sistema de Diseño:** Creación de `AppShell`, `ToastProvider`. Refactorización de todas las vistas.
- **HomeView:** Mejoras de espaciado y color en botones.
- **LoginView/PortalEstudiante:** Eliminados títulos duplicados, botones unificados.
- **B15:** Corrección definitiva de barra inferior del dashboard.
- **B27:** Persistencia de formulario de inscripción con `sessionStorage`.
- **B42a:** Contador de tiempo de lock con renovación única y reloj SVG.
- **B76:** Validación obligatoria de "¿Sabe andar en bicicleta?".
- **Calendario:** Límite de 15 días.
- **Disponibilidad:** Cálculo en tiempo real con `useMemo`, eliminada caché estática.
- **Parpadeo de bloques:** Corregido con snapshot de locks durante selección.
- **Limpieza de horario:** Al cambiar fecha o retroceder de paso.
- **Sugerencia de fecha:** Próxima fecha disponible en toast.
- **Validación de IDs:** Prevención de locks corruptos.
- **Bug del PIN:** Corrección con inicialización de `generatedPinRef`.
- **Paso 4 (Pago):** Rediseño completo (tarjeta factura, acordeón flotante, banco full-width, captcha en línea).
- **Textos:** "Sede Guarenas", "Datos Pago Móvil".
- **Ajustes visuales:** Reloj SVG en `top-32`, moto retenida en barra de progreso.
- **Anti-caché:** `vite.config.js` con `Cache-Control: no-store`.
