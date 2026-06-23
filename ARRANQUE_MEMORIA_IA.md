# ⚠️ REGLA: Este archivo es de solo ADICIÓN. NUNCA se reemplaza. Cada sesión agrega al final.
# ARRANQUE_MEMORIA_IA.md – MotoEscuela App v1.1.0
## Contexto de Emergencia para el Arquitecto IA

**Instrucción de Arranque:** El Operador te ha pedido que leas este archivo. Asimila todo su contenido como si fuera tu memoria de la conversación anterior. Ahora eres el Arquitecto del proyecto "MotoEscuela App". Aplica rigurosamente el Marco de Trabajo V6.3 y el Manual del Arquitecto V2.1.

### 1. Proyecto y Stack
- **Nombre:** MotoEscuela App v1.1.0 (Escuela de Manejo de Moto).
- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3 + React Router 6 + Lucide React 0.400.0.
- **Backend:** Firebase (Auth, Firestore). Plan Spark (gratuito).
- **Entorno:** Desarrollo en Termux (móvil). El Operador usa comandos `cat << 'EOF'` que tú debes proporcionar en cajas de texto bien formateadas.

### 2. Estado General del Sistema
- **Registro de estudiantes (ESTABLE):** Flujo de 4 pasos con validaciones, creación temprana de cuenta, y auto-login.
- **Panel del estudiante (ESTABLE):** Muestra datos de la reserva, estado del pago y avance académico.
- **Dashboard administrativo (FUNCIONAL):** Acceso para admin, instructor y proveedor. Tiene bugs pendientes (B17, B51).
- **Página de prueba (ACTIVA):** Existe una ruta `/test-bloques` con una página aislada para depurar la disponibilidad de horarios. Carga datos directamente desde Firestore sin depender del contexto global.

### 3. Decisiones Arquitectónicas Clave (NO DEBES CAMBIAR)
1.  **Creación temprana del estudiante:** La cuenta se crea al final del PASO 1.
2.  **Autenticación anónima ABANDONADA:** No usar `signInAnonymously`.
3.  **`appId` CORRECTO:** `motoescuela-pro-v1`.
4.  **Campo de fecha en Firestore:** Las reservas usan el campo `fecha` (no `fecha1`).
5.  **Página de prueba aislada:** `TestBloquesView` carga sus propios datos con `getDocs` para evitar dependencias del contexto.

### 4. Deuda Técnica Actualizada (Ver BACKLOG_V2.md)
[Incluir lista resumida de bugs críticos y alta]

### 5. Archivos Clave
- `src/views/TestBloquesView.jsx`: Página de prueba con carga directa de Firestore.
- `src/context/AppContext.jsx`: Contexto global con `appId` corregido.
- `src/services/ReservaService.js`: Transacción atómica con `cursoId` obligatorio.

---
### SESIÓN 16-18/06/2026 – Refactorización mayor y sistema de diseño (v1.7.3)

**Decisiones clave:**
- **Estructura modular:** Implementada estructura canónica `src/modules/{auth,inscripcion,admin,shared}`.
- **Sistema de diseño:** Creado `AppShell.jsx` y `ToastProvider.jsx` para unificar todas las vistas.
- **Diseño Seamless:** Paso 4 de inscripción con tarjeta-acordeón fusionados mediante `overflow-hidden`.
- **Reloj SVG:** Temporizador de lock con anillo de progreso, renovación única y expiración automática.
- **Persistencia de formulario:** `sessionStorage` para paso, datos y PIN.
- **Disponibilidad:** Cálculo en tiempo real con `useMemo`, eliminada caché estática.
- **StaffService:** REST API para crear instructores/proveedores sin cerrar sesión admin.
- **Reglas Firestore:** Lectura restringida a `isAuth()` en todas las colecciones.

**Bugs cerrados:** B15, B17, B27, B42a, B43, B50, B51, B55, B62, B76, C1, C2, B71-B74, B14/B46/B60.

**Ajustes visuales:** Paso 4 factura, reloj SVG, moto en barra, límite 15 días, sugerencia de fecha, captcha reorganizado, placeholders mejorados, botones unificados, títulos duplicados eliminados.

**Archivos nuevos:**
- `src/modules/admin/services/StaffService.js`
- `src/modules/shared/components/AppShell.jsx`
- `src/modules/shared/components/ToastProvider.jsx`
- `vite.config.js` (anti-caché)

**Reglas a futuro:** Ningún archivo de memoria o bitácora se reemplaza. Siempre se añade al final.

---
### SESIÓN 19/06/2026 – Correcciones finales en inscripción y mejoras en dashboard (v1.7.8)

**Decisiones clave:**
- **Corrección de validación de recursos:** `handleSelectHorario` ahora permite `traeMoto === 'Sí'` sin `motoAsignadaId`.
- **Extensión de lock al avanzar al paso 4:** `handleNext` renueva el lock 10 minutos antes de ir al paso 4.
- **Protección del useEffect de cambio de fecha:** No borra el lock si el usuario ya está en el paso 4.
- **Formato de fecha natural:** Nueva función `formatearFechaNatural` para sugerencias legibles ("viernes 20 de junio").
- **Dashboard:** Implementados acordeones colapsables en Ajustes Generales (cerrados por defecto), selectores de moneda para clientes y staff (USD, EUR, VES, USDT), grid de 2 columnas en Reglas de Negocio, y toggle de descuento promocional.

**Bugs cerrados:** Bloque sin recursos para traeMoto=Sí, error "no se encontró el bloqueo" tras confirmar PIN, sugerencia de fecha errática.

**Pendiente:** Corrección de `buscarProximaFechaDisponible` para buscar siempre hacia adelante desde la fecha seleccionada.

---
### SESIÓN 17/06/2026 – Cierre de inscripción (v1.7.9)

**Decisiones clave:**
- **Diseño Seamless restaurado:** Contenedor unificado con `overflow-hidden` en el paso 4.
- **Captcha reorganizado:** "Escriba el resultado" a la izquierda, operación + input a la derecha.
- **Correcciones de lógica:** Recursos para `traeMoto === 'Sí'`, bloque de almuerzo no disponible, búsqueda de fechas hacia adelante, extensión de lock al avanzar al paso 4.
- **Prohibición de `sed` para JSX:** Todos los cambios HTML/JSX se harán con `cat` (archivo completo) o edición manual.

**Deuda técnica nueva:** B82 (color del reloj SVG).

### SESIÓN 17/06/2026 – Saneamiento de archivos fantasma
- **Archivo eliminado:** `src/admin/DashboardView.jsx` (duplicado obsoleto sin acordeones).
- **Confirmación:** `src/views/DashboardView.jsx` es la versión canónica con acordeones colapsables y barra inferior fija.

### SESIÓN 17-18/06/2026 – Saneamiento y rediseño del InstructorPanel (v1.7.14)

**Decisiones clave:**
- **Archivo fantasma:** `AdminPanelView.jsx` nunca existió. El duplicado real era `src/admin/DashboardView.jsx`. Eliminado.
- **Header unificado:** El AppShell ahora gestiona un header dinámico que muestra navegación (volver + título) en sub-vistas y solo el nombre en resumen.
- **Tarjeta de detalle optimizada:** Sello mes/año en esquina superior derecha. Tarjeta interna con texto `xs`, fondo gris `bg-gray-800/50` y grid de 2 columnas.
- **Módulos sin checkbox:** Reemplazados por círculo verde con check blanco al completar.
- **Footer condicional:** Oculto en vistas de detalle para maximizar espacio vertical.

**Archivos modificados:**
- `src/views/InstructorPanel.jsx` – Rediseño completo.
- `src/admin/DashboardView.jsx` – Eliminado.

### SESIÓN 18/06/2026 – Lógica del InstructorPanel (v1.7.15)

**Decisiones clave:**
- **Privacidad:** El instructor nunca ve el teléfono del estudiante. Eliminado de TarjetaSimple y VistaDetalleCurso.
- **Avance secuencial:** Cada módulo se habilita solo si el anterior está completado. Módulos bloqueados muestran candado 🔒.
- **Confirmación al desmarcar:** `window.confirm` antes de quitar un módulo completado. Marcar no requiere confirmación.
- **Cursos aprobados en solo lectura:** Todos los módulos deshabilitados, botón "Completar Curso" oculto.
- **Deuda registrada:** B89-B99 (calificación mutua, logros, chat, insignias, accesibilidad).

**Archivos modificados:**
- `src/views/InstructorPanel.jsx` – Lógica de privacidad y avance secuencial.

### Regla de Backup Obligatorio (18/06/2026)
Antes de sobrescribir cualquier archivo con cat, se debe ejecutar primero una copia de seguridad:
  mkdir -p backup/$(dirname RUTA_DEL_ARCHIVO)
  cp RUTA_DEL_ARCHIVO backup/RUTA_DEL_ARCHIVO.backup-$(date +%Y%m%d-%H%M%S)
Esto garantiza un punto de restauración antes de cada modificación.

### SESIÓN 19/06/2026 – Formalización del Protocolo de Backup

**Regla formalizada:**
- Antes de cada `cat >`, se ejecuta un backup con timestamp.
- El comentario `@build` ahora incluye `@backup` con el nombre exacto del archivo de respaldo.
- Esta regla queda registrada en el Manual del Arquitecto (Sección XII) y en este Arranque de Memoria.
### SESIÓN 19/06/2026 – Deuda estética B114
- **B114:** Reemplazar `window.confirm` nativo por modal personalizado con estilo de la app.

### SESIÓN 19-20/06/2026 – Refactorización definitiva y Aula Virtual

**Decisiones clave:**
- **Aula Virtual:** Creada como página independiente (`/aula/:reservaId`), reutilizable por instructor y estudiante.
- **Componentes compartidos:** `RelojSesion`, `FilaTiempo`, `BannerPausa`, `ModuloItem`, `CarruselModulos`, `DashboardHeader`, `DashboardFooter`.
- **Hook de temporizador:** `useSessionTimer` encapsula toda la lógica del SGTA.
- **InstructorPanel:** Simplificado a dashboard puro con redirección al Aula Virtual.
- **EstudiantePanel:** Restaurado con tick local, lista de cursos, detalle de completados y redirección al Aula Virtual.

**Deuda técnica registrada:**
- B116: Restricción de reversión de módulos.
- B117: Clases virtuales online para módulo teórico.

**Reglas de oro recordadas:**
- Prohibido usar `sed` para JSX (solo cambios triviales).
- Siempre hacer backup antes de modificar archivos.
- Cero escrituras innecesarias en Firestore (respetar el plan Spark).

### SESIÓN 20/06/2026 – Dashboard del estudiante con botón de sesión activa

**Decisiones clave:**
- **Botón "Sesión Activa":** Diseñado con fondo azul, sombra, indicador verde pulsante y datos mínimos debajo. Reemplaza la tarjeta azul redundante en el panel del estudiante.
- **Deudas registradas:** B115 (Material), B116 (restricción de reversión), B117 (clases virtuales online).
- **Documentación actualizada:** BITACORA, BACKLOG y ARRANQUE_MEMORIA.
### SESIÓN 20/06/2026 – Temporizador unificado y sincronización total
- **useSessionTimer.js**: Suscripción directa a Firestore, cálculo derivado desde timestamps, tick local.
- **AulaVirtualView.jsx**: Consume el hook unificado. Misma vista para instructor y estudiante.
- **Resultado**: Ambos roles ven exactamente el mismo tiempo, incluso al recargar o entrar en momentos diferentes.

### SESIÓN 20/06/2026 – Triple reloj y gestión de excedentes

**Decisiones clave:**
- **Reloj grande (4h):** Se detiene al llegar a 240 minutos. El tiempo de pausa acumulado se ofrece como reserva opcional.
- **Indicador D1/D2:** Cambia automáticamente al iniciar la sesión en la segunda fecha programada.
- **Círculo naranja de reserva:** Aparece en la parte inferior izquierda del reloj grande solo cuando este llega a 4h y existe pausa acumulada.

**Deuda técnica registrada:**
- B118: Flujo de reserva de tiempo.
- B119: Cambio automático D1 → D2.
- B120: Registro de tiempo excedente de sesión.

**Documentación actualizada:** BITACORA, BACKLOG y ARRANQUE_MEMORIA.

### SESIÓN 21/06/2026 – Control administrativo de contadores
- **B121:** Permitir al administrador resetear `sesionDiariaInicio` y `sesionTotalInicio` desde el panel de administración si un instructor inició un módulo por error.

### SESIÓN 21/06/2026 – Correcciones finales de inscripción y panel

**Decisiones clave:**
- **Refactorización completa de disponibilidad:** La función `calcularDisponibilidadBloque` reemplaza a `findAvailableResources`, cubriendo todas las combinaciones de "trae moto / no trae moto" y múltiples instructores/motos. La cinta de fechas usa solo reservas (sin locks) para estabilidad visual.
- **Corrección de campo `activo` en motos:** El campo en Firestore es `activo`, no `activa`. Se documentó con comentario en el código.
- **Flujo de expiración del lock (paso 4):** Modal con dos botones ("Seleccionar Bloque", "Salir del sistema") y máximo 3 intentos. El PIN nunca se muestra si el tiempo expiró.
- **Control de acceso al portal:** Solo ingresan estudiantes con reservas activas o históricas. Modo corrección con footer limitado (solo Mi Curso y Perfil).
- **Dos variantes de rechazo:** "Rechazar (corregir)" con 20 min de gracia, y "Cancelar" (libera el bloque de inmediato). `isReservaActiva` maneja 'Cancelado' como nunca activo.
- **Toasts en días inhabilitados:** Cinta de fechas y calendario flotante muestran "Sin horarios disponibles para esta fecha" al tocar un día inhabilitado.
- **Botón de copiar datos de pago:** Funciona con código del banco automático desde `config.pagoMovilEscuela`.
- **Placeholders, validaciones y atributos HTML** en todos los campos del formulario de inscripción.

---
### SESIÓN 21/06/2026 – Correcciones finales de hooks y tipado
- **Corrección de hooks en EstudiantePanel:** Error "Rendered more hooks" corregido.
- **Corrección de typo `today` → `todayStr` en bloques.**
- **Protección contra `activeLocks = null` en `calcularDisponibilidadBloque`.**


---
### SESIÓN 21-22/06/2026 – PWA, Restricciones de Sesión y Mejoras del Instructor

**Decisiones clave:**
- **PWA:** Instalada `vite-plugin-pwa`, creados `manifest.json` e iconos. App instalable en Android/iOS.
- **Restricciones de inicio de módulo:** El instructor no puede iniciar si el pago no está aprobado, el estudiante no está presente, o es antes de la fecha/hora del curso.
- **Límite diario dinámico:** Calculado según hora de fin del bloque contratado.
- **Presencia del estudiante:** Se escribe `estudiantePresente` al entrar al Aula Virtual y se limpia al salir (2 escrituras, plan Spark respetado).
- **Relojes corregidos:** Tick estable sin dependencia de reserva, reloj diario se reinicia en D2, reloj general continúa.
- **Pausa en tiempo real:** `pausaTotalAcumulada` se actualiza cada segundo durante pausas.
- **InstructorPanel:** Tarjetas con etiqueta "Verificando pago" para cursos no aprobados, header dinámico con botón volver.
- **Cierre de sesión robusto:** Limpia estado local incluso si Firebase falla. Botón en Home e Inscripción.

**Archivos modificados/creados:**
- `src/modules/sesiones/hooks/useSessionTimer.js` (reestructuración completa)
- `src/modules/aula/views/AulaVirtualView.jsx`
- `src/modules/instructor/views/InstructorPanel.jsx`
- `src/modules/shared/components/DashboardHeader.jsx`
- `src/context/AuthProvider.jsx`
- `public/manifest.json` (nuevo)
- `vite.config.js`
- `index.html`

---
### SESIÓN 22/06/2026 – Refactorización mayor de InscripcionView (Arquitectura Modular)

**Decisiones clave:**
- **Extracción de hooks:** Creado `useInscripcionState` (estado del formulario, paso, locks, persistencia en sessionStorage) y `useDisponibilidad` (cálculo de bloques, días, delegación a LockService).
- **Orquestador simplificado:** `InscripcionView.jsx` pasó de 600+ líneas monolíticas a un orquestador que delega estado y disponibilidad a hooks y renderiza subcomponentes puros.
- **Componentes presentacionales puros:** Creados `Paso1DatosPersonales`, `Paso2Configuracion`, `Paso3Horario`, `Paso4Pago`, `Stepper`, `CalendarioFlotante`, `FormularioSalud`, `CalendarioNacimiento`, `LockTimerFlotante`, `ModalExpiracion`, `BotonCopiarDatos`.
- **IoC cumplido:** `buscarProximaFechaDisponible` extraído de la UI y delegado a `LockService`.
- **Corrección ConfigProvider:** Suscripción a Firestore ahora depende de `fbUser` (token listo), eliminando errores de permisos.

**Bugs cerrados:**
- ✅ Error de permisos en ConfigProvider al iniciar sesión.
- ✅ Shadow Accounts: PIN mostrado tras Paso 1 (antes solo en Paso 4).
- ✅ Bloqueo fatal en ModalPIN: corregida bifurcación paso 1 vs paso 4.
- ✅ Calendario de nacimiento con scroll funcional restaurado.
- ✅ Toasts en días inhabilitados restaurados.

**Archivos creados (14):**
- `src/modules/inscripcion/hooks/useInscripcionState.js`
- `src/modules/inscripcion/hooks/useDisponibilidad.js`
- `src/modules/inscripcion/views/InscripcionView.jsx` (refactorizado)
- `src/modules/inscripcion/components/Paso1DatosPersonales.jsx`
- `src/modules/inscripcion/components/Paso2Configuracion.jsx`
- `src/modules/inscripcion/components/Paso3Horario.jsx`
- `src/modules/inscripcion/components/Paso4Pago.jsx`
- `src/modules/inscripcion/components/Stepper.jsx`
- `src/modules/inscripcion/components/CalendarioFlotante.jsx`
- `src/modules/inscripcion/components/FormularioSalud.jsx`
- `src/modules/inscripcion/components/CalendarioNacimiento.jsx`
- `src/modules/inscripcion/components/LockTimerFlotante.jsx`
- `src/modules/inscripcion/components/ModalExpiracion.jsx`
- `src/modules/inscripcion/components/BotonCopiarDatos.jsx`

**Archivos modificados:**
- `src/modules/inscripcion/services/LockService.js` (método `buscarProximaFechaDisponible`)
- `src/context/ConfigProvider.jsx` (corrección de suscripción)

**Validación:** Centinela V4.0 otorgó sello APROBADO (Luz Verde para Producción).



---
### SESIÓN 23/06/2026 – Auditoría Centinela V4.0 (Fases 1-4) – Sistema APROBADO

**Decisiones clave:**
- **Migración a Proyecto Estándar:** El sistema dejó de ser MVP. Se activaron todas las fases del Marco V6.3: SAST/SCA local obligatorio, DAST pasivo, métricas DORA, y bitácora experiencial obligatoria.
- **Fase 1 – La Bóveda:** Blindaje de creación de reservas en `firestore.rules` (validación de `estadoPago`, `precio > 0`, prohibición de campos de sesión). Mitigación de Lock Poisoning (`expiresAt <= request.time + 900s`). Restricción de lectura de locks al propietario para eliminar fuga de PII.
- **Fase 2 – Motor Financiero:** Alineación de esquema (`precio` añadido a `CAMPOS_PERMITIDOS` en `ReservaService.js`). Sustitución de polling por `onSnapshot` en `LockService.escucharLocks`. Limpieza de locks por `userId`. `buscarProximaFechaDisponible` sin consultar locks (solo reservas). `try/catch` en `ConfigProvider.saveConfig`.
- **Fase 3 – Núcleo Operativo:** Bloqueo optimista en `pausarSesion` y `reanudarSesion` (estado local limpiado antes de la red, rollback si falla). Listeners de `visibilitychange`, `online`, `offline` para heartbeat. `conexionPerdida` propagada desde `useSessionTimer` a `AulaVirtualView` y `RelojSesion`.
- **Fase 4 – UI Hardening y Accesibilidad:** Sanitización determinista de inputs numéricos. Prevención de doble envío con `isSubmitting`. Layout estable con `h-dvh` y `overflow-x-hidden`. Deuda WCAG registrada: focus trap en modales (B132), atributos `autocomplete` (B133), headers HTTP de seguridad (B134).

**Archivos modificados (8):**
- `firestore.rules`
- `src/modules/inscripcion/services/ReservaService.js`
- `src/modules/inscripcion/services/LockService.js`
- `src/modules/inscripcion/hooks/useDisponibilidad.js`
- `src/modules/inscripcion/views/InscripcionView.jsx`
- `src/context/ConfigProvider.js`
- `src/modules/sesiones/hooks/useSessionTimer.js`
- `src/modules/aula/views/AulaVirtualView.jsx`

**Deuda técnica nueva:** B125-B130, B132-B134 (ver BACKLOG_V2.md). Deuda B131 cancelada.

**Veredicto final:** APROBADO. El sistema superó el escrutinio Zero-Trust del Centinela en las 4 fases. Autorizado para despliegue en producción.

