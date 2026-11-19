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

---
### SESIÓN 23/06/2026 – Correcciones finales de disponibilidad y hardening completo

**Decisiones clave:**
- **Solución definitiva de disponibilidad (Opción B - SRE Golden Path):** Eliminada la función `buscarProximaFechaDisponible` de `LockService.js` y `useDisponibilidad.js`. La asignación de la primera fecha disponible ahora usa el array `diasDisponibles` del hook `useDisponibilidad`, consolidando la Fuente Única de Verdad (SSOT).
- **Cinta de fechas restaurada:** El componente `Paso3Horario.jsx` vuelve al diseño original con 3 días antes, el día central y 3 días después.
- **Mensaje de "sin disponibilidad":** Actualizado con diseño UI del sistema (ícono Calendar + texto estilizado).
- **Cierre síncrono del candado:** El `useEffect` de búsqueda inicial en `InscripcionView.jsx` usa `!form.fecha1` como candado natural.
- **Validación isomórfica con Zod:** Restaurados los esquemas en `src/modules/shared/schemas/validations.js` e integrados en `Paso1DatosPersonales`, `Paso4Pago` y `ReservaService`.
- **Optimización Hash Maps O(1):** Refactorizado `calcularDisponibilidadBloque` con diccionarios precalculados, eliminando bucles anidados O(N²).
- **Clock Tick:** Añadido `clockTick` cada 60s para refrescar `isPastBlock` sin recargar.
- **Zona horaria Venezuela:** Todos los cálculos de fechas usan `Intl.DateTimeFormat` con `America/Caracas`.

**Archivos modificados:** `InscripcionView.jsx`, `LockService.js`, `useDisponibilidad.js`, `Paso1DatosPersonales.jsx`, `Paso4Pago.jsx`, `ReservaService.js`, `validations.js`.
**Deuda técnica saldada:** B130, B132, B133, B134, B137, B147.

---
### SESIÓN 23/06/2026 – Arquitectura de Colección Espejo y cierre de inconsistencia de disponibilidad

**Decisiones clave:**
- **Colección Espejo `ocupacionConfirmada`:** Creada para resolver el fallo BOLA que impedía a los estudiantes leer las reservas de otros. Es una colección pública anonimizada que refleja las reservas confirmadas sin PII.
- **Sincronización atómica:** `ReservaService.crearReserva` ahora usa `runTransaction` para escribir en `reservas` (privada) y `ocupacionConfirmada` (pública) atómicamente.
- **Limpieza del listener de locks:** Eliminado `Timestamp.now()` estático de `LockService.escucharOcupacionTemporal`. La reactividad se gestiona con filtro en memoria y `clockTick`.
- **Sincronización en panel admin:** `AdminReservaDetalle.jsx` ahora usa `writeBatch` para actualizar/eliminar documentos en `ocupacionConfirmada` al aprobar, rechazar o cancelar reservas, liberando los horarios inmediatamente.
- **Migración de datos históricos:** Se añadió botón temporal en `AdminResumen.jsx` para migrar reservas existentes a la colección espejo.
- **Protección de UI:** El paso 3 muestra un `Spinner` si no hay sesión válida, evitando mostrar disponibilidad falsa.

**Archivos modificados (8):**
- `firestore.rules`
- `ReservaService.js`
- `FirestoreProvider.js`
- `useDisponibilidad.js`
- `LockService.js`
- `InscripcionView.jsx`
- `AppContext.jsx`
- `AdminReservaDetalle.jsx`

**Deuda técnica saldada:** B130, B132, B133, B134, B137, B147, B148.
**Deuda técnica nueva:** Ninguna.


---
### SESIÓN 22/07/2026 – Corrección masiva de regresiones en inscripción y panel admin (v1.8.0)

**Decisiones clave:**
- **B154 – Reinscripción:** Cuando un estudiante con cuenta previa intenta reinscribirse, el sistema busca su progreso en la colección `progresoInscripcion` vía `getDoc` (ID = correo sanitizado), inicia sesión automáticamente con el PIN almacenado y restaura el paso exacto donde se quedó.
- **Firestore:** Regla `allow get: if true` en `progresoInscripcion/{docId}` para permitir la lectura sin autenticación (necesaria para el flujo de reinscripción). `AuthService.crearEstudiante` ahora guarda el documento inicial de progreso.
- **Validaciones Zod:** Ahora se ejecutan en cada paso de `handleNext`. Paso 1 (incluye mayoría de edad), paso 2 (curso, sede, tipo moto, sabeBicicleta), paso 4 (campos de pago). Se importó `validarPaso4`.
- **Disponibilidad:** Corrección en `isInstructorOcupado` e `isMotoOcupada` para filtrar por `horaId` también en reservas confirmadas, no solo en locks. Antes un instructor/moto ocupado en un bloque aparecía como ocupado todo el día.
- **Contadores de disponibilidad:** `instructoresLibresSinLocks` y `motosLibresSinLocks` ahora también filtran por `horaId`, arreglando el estado "Reservado" que aparecía incorrectamente.
- **Spinner infinito:** `activeLocks` inicializado como `[]`, listener incondicional con fallback a `getTodayStr()`, `useMemo` defensivo sin dependencia de `null`, guardia de renderizado inteligente en paso 3.
- **Panel Admin – Aprobar/Rechazar:** `aprobarPago` usa `batch.set` con `merge: true` para crear/actualizar el espejo `ocupacionConfirmada`, eliminando el error `No document to update`. `rechazarPago` para corrección mantiene el espejo con `estadoPago: 'Pendiente'` (bloquea el horario); solo `cancelar` borra el espejo y libera el horario.

**Bugs cerrados:**
- B154 (reinscripción)
- B17/B51/B62/B82/B114/B121/B130/B132/B133/B134/B137/B147/B148 (validaciones, disponibilidad, UX)
- Error "No document to update" en admin
- Doble reserva por liberación prematura en rechazo
- Spinner infinito en paso 3
- Bloqueo masivo de horarios al confirmar pago

**Archivos modificados:**
- `src/modules/inscripcion/views/InscripcionView.jsx`
- `src/modules/inscripcion/services/ReservaService.js`
- `src/modules/auth/services/AuthService.js`
- `src/modules/shared/schemas/validations.js`
- `src/modules/admin/components/AdminReservaDetalle.jsx`
- `firestore.rules`

**Deuda técnica pendiente:** B115-B120 (Material, reversión módulos, clases virtuales, reserva tiempo, D1→D2, tiempo excedente)


---
### SESIÓN 26/07/2026 – Corrección definitiva de reinscripción (B154) y validación de cédula duplicada

**Decisiones clave:**
- **B154 (Reinscripción):** Se corrigió el conflicto entre la validación de cédula duplicada y la reinscripción. El problema era el orden de las operaciones: la verificación de cédula se ejecutaba antes de saber si el correo ya existía, bloqueando a usuarios legítimos.
- **Solución final (FIRE):** Invertir el orden en `AuthService.crearEstudiante`. Primero se intenta crear la cuenta en Auth. Si es exitoso (usuario nuevo), se verifica la cédula en `cedulasRegistradas`. Si la cédula ya existe, se elimina el usuario recién creado (`user.delete()`) como rollback y se retorna error. Si el correo ya existe (`email-already-in-use`), se retorna `already-enrolled` directamente, sin verificar cédula.
- **Refuerzo de identidad en reinscripción:** En `InscripcionView.jsx`, cuando se detecta `already-enrolled`, el sistema compara la cédula ingresada en el paso 1 con la cédula guardada en el progreso (`datosFormulario.cedula`). Si no coinciden, se bloquea el avance con un mensaje de error y se limpia el estado de carga. Si coinciden, se procede con el login automático y la restauración del paso.
- **Seguridad adicional:** Este control impide que alguien que conozca un correo (pero no la cédula original) pueda suplantar al usuario legítimo y acceder a su progreso.

**Archivos modificados:**
- `src/modules/auth/services/AuthService.js` – Método `crearEstudiante` refactorizado con rollback y orden corregido.
- `src/modules/inscripcion/views/InscripcionView.jsx` – Bloque de reinscripción modificado para verificar cédula antes de restaurar progreso.

**Deuda técnica:** La validación de cédula duplicada quedó implementada y funcional. No se genera nueva deuda.

**Lección aprendida:** Nunca anteponer validaciones de recursos secundarios (cédula) a la creación del recurso principal (cuenta Auth), especialmente cuando el flujo depende de manejar el error de recurso duplicado (`email-already-in-use`) para ejecutar otra lógica (reinscripción). El orden correcto es: crear → verificar duplicados posteriores → hacer rollback si es necesario.
### SESIÓN 27-28/08/2026 – Trabajo integral sobre inscripción, página pública, paneles, aula, locks y producción

**Contexto:**
Trabajamos sobre MotoEscuela App en desarrollo, corrigiendo errores de producción y consolidando múltiples mejoras. No se modificaron reglas de Firestore en esta sesión; solo frontend/servicios y datos manuales cuando fue necesario.

**1. Flujo de inscripción:**
- Se corrigió priorización y precarga de curso desde la página pública.
- Se implementó soporte para cursos de un solo día:
  - `cursoUnDia = duracionTotal <= 120`
  - `fecha2` puede ser `null`
  - `formatearRangoCorto` soporta una sola fecha
  - `ReservaService` ya no exige `fecha2`
- Se corrigió selección automática de curso para recompra.
- Se ajustó `Paso2Configuracion` para:
  - recompra: bici/tipo/curso fijos
  - origen público: selector editable y precarga
- Se corrigió flujo de PIN:
  - restauración con sesión activa
  - guardado en `form.pin`
  - captura antes de limpiar sesión
  - pantalla de éxito robusta

**2. Página pública `/cursos`:**
- Se creó `CursosPublicosView`.
- Se agregó ruta pública `/cursos`.
- Se creó modal `ModalCursoDetalle`.
- Se agregaron enlaces accionables: teléfono, WhatsApp, correo.
- Se compactó la sección de sedes.
- Se agregó botón flotante de volver.
- Se corrigió visualización de duración.

**3. Panel del estudiante:**
- Se corrigió priorización de reservas múltiples.
- Muestra la reserva más reciente no completada como principal.
- Se listan reservas activas y completadas.
- Se resolvió desbloqueo de Práctica en la Vía.
- Se corrigió catálogo con `tipoCurso` y prerequisitos.

**4. Panel del instructor:**
- Se cambió de `ctx.reservas` global a listener local:
  - `where('instructorId', '==', uid)`
- Se corrigió identificador de instructor en producción.

**5. Aula Virtual:**
- Se corrigió sincronización de reserva de tiempo usando timestamps.
- Se ajustaron banderas de sesión y módulos.
- Se permitió finalizar módulo activo siempre.
- Se actualizó `estadoCurso` al completar todos los módulos.

**6. Locks y disponibilidad:**
- Se diagnosticó clock skew.
- Se creó `renovarLock`.
- Se dejó `crearLock` solo para creación.
- Se aplicó margen de 10 segundos.
- Se corrigieron locks corruptos con moto nula.

**7. Firestore / producción:**
- Reglas:
  - lectura pública de `cursos`
  - colección pública `informacionPublica`
  - ampliación de `reservas.update` para instructor y presencia
- Colecciones creadas: `informacionPublica/contacto`, `informacionPublica/sedes`.
- Cursos actualizados con campos informativos.
- `duracionTotal` de Equilibrio ajustado a 120.

**8. Documentación:**
- Se creó `docs/MIGRACION_PRODUCCION.md`.
- Se registraron pasos para producción.

---
### SESIÓN 28/08/2026 – Mejora de vista de reservas administrativas

**Decisiones clave:**
- **Filtros combinados:** Añadidos filtros por rango de fechas, sede, curso e instructor en `AdminReservasList`.
- **Sección "Hoy":** Reservas del día se muestran en sección especial destacada, excluidas de la lista paginada para evitar duplicados.
- **Badges visuales:** `HOY`, `EN CURSO` (con animación pulsante) y `PRÓXIMA` para identificar rápidamente el estado temporal.
- **Orden por defecto:** Cambiado a `curso_cercano` para priorizar próximas reservas, con selector para alternar.
- **Utilidades:** Creado `src/modules/admin/utils/reservasHelpers.js` con `obtenerHoyVenezuela`, `esReservaEnCurso`, etc. usando zona horaria `America/Caracas`.
- **Actualización periódica:** Tick cada 60 segundos para recalcular el estado "EN CURSO".

**Archivos creados/modificados:**
- `src/modules/admin/utils/reservasHelpers.js` (nuevo)
- `src/modules/admin/components/AdminReservasList.jsx` (modificado)
- `src/modules/admin/components/AdminReservasHome.jsx` (modificado)

**Validación:** FIRE aprobó con ajustes de zona horaria y detección en curso. Pruebas manuales exitosas en servidor de desarrollo.

---
### SESIÓN 28/08/2026 – Cierre de bugs: locks corruptos, PIN faltante y mejoras admin

**Decisiones clave:**
- **Purga de locks corruptos:** `LockService.purgarLocksCorruptos` ahora consulta y valida `locks` y `ocupacionTemporal`. Elimina documentos corruptos/expirados (máx. 10 por ejecución).
- **Eliminada purga automática en cliente:** Causaba error de permisos. La purga ahora es manual desde `AdminOcupacion` con botón “Purgar locks corruptos (7 días)”.
- **Filtros estructurales:** `evaluarDisponibilidad` y `handleSelectHorario` descartan locks sin `instructorId`, `fecha`, `horaId` o expirados.
- **PIN robusto:** `handleConfirmarPago` captura el PIN antes de limpiar sesión, con fallback a Firestore. `ReservaService.crearReserva` guarda `pin` en la reserva.
- **Reasignación de instructor y cambio de horario:** Se permite en Pendiente, Rechazado y Aprobado. `cambiarHorario` libera locks del horario anterior en cualquier estado.
- **Reglas Firestore:** Admin puede leer/borrar locks corruptos/expirados; estudiantes sin cambios.

**Archivos modificados/creados:**
- `src/modules/inscripcion/services/LockService.js` (purga doble colección, validación)
- `src/modules/inscripcion/views/InscripcionView.jsx` (filtros, captura PIN, sin purga automática)
- `src/modules/inscripcion/services/ReservaService.js` (campo `pin`)
- `src/modules/admin/components/AdminReservaDetalle.jsx` (reasignación, cambio de horario)
- `src/modules/admin/components/AdminOcupacion.jsx` (botón purga)
- `firestore.rules` (permisos admin limitados)

**Bugs cerrados:** Locks corruptos, disponibilidad fantasma, PIN no mostrado, cambio de horario bloqueando horario anterior.

**Pendiente:** Verificar en producción. Posible mejora futura: purgas programadas con Cloud Functions.

---
### SESIÓN 30/08/2026 – Correo de bienvenida con PIN y limpieza de recuperación

**Decisiones clave:**
- **Correo de bienvenida:** Se implementó `EmailService.js` usando EmailJS con Gmail (sin dominio personalizado). El correo incluye nombre, apellido, correo y PIN.
- **Integración:** En `InscripcionView.jsx`, después de confirmar pago y capturar `pinParaMostrar`, se envía el correo en modo fire-and-forget, validando que existan `correo`, `nombre`, `apellido` y `pin`.
- **Error 422 resuelto:** El error ocurría cuando `correo` estaba vacío; se agregó validación previa.
- **Recuperación de PIN eliminada:** Se removió el flujo con `sendPasswordResetEmail` y la página `ResetearPinView` porque Firebase Auth web siempre usa la página intermedia `__/auth/action` y no redirigía a la app. También se eliminó `public/__/auth/action.html`.
- **Login limpio:** `LoginView.jsx` quedó solo con login de estudiante (PIN) y staff, sin opción de olvidé mi PIN.

**Archivos creados/modificados/eliminados:**
- `src/modules/shared/services/EmailService.js` (nuevo)
- `src/modules/inscripcion/views/InscripcionView.jsx` (modificado)
- `src/modules/auth/views/LoginView.jsx` (limpiado)
- `src/App.jsx` (limpiado)
- `.env` (credenciales EmailJS)
- `src/modules/auth/views/ResetearPinView.jsx` (eliminado)
- `public/__/auth/action.html` (eliminado)

**Validación:** Correo de bienvenida probado con 200 OK en desarrollo. Prueba en producción pendiente.

**Deuda técnica vigente:** Recuperación de PIN (futura), `estudiantePresente` solo primer módulo, reloj diario 120/120, habilitación de Práctica en la Vía, causa raíz de locks corruptos.

---
### SESIÓN 31/08/2026 – Análisis de relojes del Aula Virtual y cierre de bugs de reserva

**Estado:**
- Modo solo lectura para el Aula Virtual.
- Se corrigió `LockService.crearLock` para incluir `userId` en `ocupacionTemporal`, eliminando bloqueos EN_ESPERA_PAGO.
- Quedan pendientes de implementar las correcciones detectadas en los relojes.

**Problemas detectados (para próxima sesión):**
1. Reloj grande no se detiene en 120 min el día 1; usa `generalSegundos` global.
2. Reserva se vuelve 0 al activarse y no se refleja en la interfaz.
3. Al reloj general llegar a 0, no se pueden iniciar más módulos aunque haya reserva.
4. Indicador D1/D2 no cambia automáticamente al abrir el Aula Virtual en el día 2.
5. Falta alerta sonora al terminar un módulo.

**Reglas de negocio confirmadas:**
- Curso de 1 día: duración 120 min.
- Curso de 2 días: 240 min totales, 120 por día.
- El reloj grande debe detenerse en 120 el día 1 y continuar desde 120 el día 2.
- El reloj diario se reinicia a 0 en el día 2.
- La pausa acumulada no detiene el reloj general; se guarda como reserva.
- La reserva es tiempo no trabajado que puede usarse después.
- El tiempo efectivo es el total del curso menos la pausa acumulada.

**Archivos críticos:**
- `src/modules/sesiones/hooks/useSessionTimer.js`
- `src/modules/aula/views/AulaVirtualView.jsx`
- `src/modules/shared/components/RelojSesion.jsx`
- `src/modules/shared/components/FilaTiempo.jsx`
- `src/modules/inscripcion/services/LockService.js`


### SESIÓN 01/09/2026 – Corrección de relojes D1/D2 y alerta sonora

**Decisiones clave:**
- **Cálculo híbrido por día:** El reloj grande se detiene en 120 min en D1 y continúa desde 120 en D2. Se agregaron los campos `tiempoAcumuladoHastaD1` y `pausasHastaD1` para guardar el acumulado de D1 al iniciar D2 (solo 1 escritura adicional por curso).
- **Indicador D1/D2 automático:** Se calcula en cliente usando la fecha actual de Venezuela y `fecha2`. No requiere escritura.
- **Pausas por día:** Las pausas de D1 se descuentan del tiempo D1; las de D2, del tiempo D2.
- **Reserva:** Se mantiene contador separado y se corrigió el descuento de pausas al activar reserva.
- **Alerta sonora:** Implementada con Web Audio API en `src/modules/shared/utils/audio.js`. Configurable desde el header del Aula Virtual (ícono de volumen).

**Archivos creados/modificados:**
- `src/modules/shared/utils/audio.js` (nuevo)
- `src/modules/sesiones/hooks/useSessionTimer.js` (modificado)
- `src/modules/aula/views/AulaVirtualView.jsx` (modificado)

**Reglas de Firestore:** Se agregaron `tiempoAcumuladoHastaD1` y `pausasHastaD1` a la lista blanca del instructor en `reservas.update`. No se modificó archivo local; se actualizó directamente en consola.

**Deuda técnica atendida:** B119 (cambio automático D1→D2). Parcialmente B118 y B120.

**Pendiente:** Probar en producción cursos de 1 y 2 días. Verificar que la alerta sonora funcione tras interacción del usuario. Evaluar almacenamiento de preferencia de sonido por instructor en Firestore (actualmente usa localStorage).
### SESIÓN 03/09/2026 – Fase 0 Portal del Instructor: estabilización y endurecimiento

**Decisiones clave:**
- **Aislamiento Hermético:** Creado `useReservasInstructor.js` con toda la lógica de Firestore (onSnapshot, manejo de errores, limpieza). El componente InstructorPanel ya no importa Firestore directamente.
- **Índice compuesto:** Creado en Firebase Console: `reservas(instructorId ASC, fecha DESC)`. La consulta usa `orderBy('fecha','desc')` y `limit(100)`.
- **Zona horaria Venezuela:** Nueva utilidad `src/modules/shared/utils/zonahoraria.js` con `obtenerFechaVenezuela()` aplicada al cálculo de "hoy".
- **UI Hardening:** Input teléfono con `type="tel"`, `inputMode="numeric"`, `pattern="\d+"`.
- **Anti-pánico:** Estado `isSaving` en guardarPerfil, botón deshabilitado durante guardado.
- **Validación Isomórfica:** Esquema Zod `perfilSchema.js` valida teléfono y prepara extensibilidad.
- **Error Boundary:** Creado `ErrorBoundary.jsx` y envuelto el panel.
- **Feature flag:** Creado `src/config/featureFlags.js` con `INSTRUCTOR_PANEL_V2`.
- **Pestaña Finanzas:** Se mantiene vacía con mensaje "Próximamente disponible".

**Archivos nuevos:**
- `src/modules/instructor/hooks/useReservasInstructor.js`
- `src/modules/instructor/schemas/perfilSchema.js`
- `src/modules/shared/utils/zonahoraria.js`
- `src/modules/shared/components/ErrorBoundary.jsx`
- `src/config/featureFlags.js`

**Archivos modificados:**
- `src/modules/instructor/views/InstructorPanel.jsx`

**Deuda técnica pendiente:** Fase 1 (subcomponentes, filtros avanzados, agrupación visual), Fase 2 (Finanzas, perfil ampliado, skeleton loaders).

**Reglas recordadas:** Backup antes de modificar, no usar sed para JSX, zona horaria Venezuela, no mostrar teléfono del estudiante, validar antes de mutar.


cat >> ARRANQUE_MEMORIA_IA.md << 'EOF'

### SESIÓN 03/09/2026 – Fase 1 Portal del Instructor, Historial y Validación de Hora

**Decisiones clave:**
- **Refactor estructural:** Se extrajeron componentes `ResumenTab`, `PendientesTab`, `HistorialTab`, `ReservaCard`, `FiltrosReservas`, `ModalDetalleReserva`, `GrupoReservas`.
- **Agrupación visual:** Las reservas activas se agrupan por Hoy, Mañana, Próximos 7 días, Después.
- **Filtros avanzados:** Búsqueda por nombre, sede, curso, estado de pago, traeMoto, rango de fechas.
- **Historial:** Subvista dentro de Inicio que muestra todas las reservas pasadas o completadas, en solo lectura, sin botón "Iniciar Clase".
- **Validación de hora:** El botón "Iniciar Clase" solo aparece si el pago está aprobado, el curso no está completado y la hora actual está dentro del bloque horario.
- **Corrección de fechas:** Solo reservas con `fecha` o `fecha2` >= hoy se consideran activas en vistas principales.
- **EmptyState y ErrorBoundary:** Se agregaron componentes reutilizables para estados vacíos y captura de errores.
- **Zona horaria:** Creada utilidad `zonahoraria.js` con `obtenerFechaVenezuela()`.

**Archivos nuevos:**
- `src/modules/instructor/components/ResumenTab.jsx`
- `src/modules/instructor/components/PendientesTab.jsx`
- `src/modules/instructor/components/HistorialTab.jsx`
- `src/modules/instructor/components/ReservaCard.jsx`
- `src/modules/instructor/components/FiltrosReservas.jsx`
- `src/modules/instructor/components/ModalDetalleReserva.jsx`
- `src/modules/instructor/components/GrupoReservas.jsx`
- `src/modules/instructor/utils/reservasHelpers.js`
- `src/modules/shared/components/EmptyState.jsx`
- `src/modules/shared/components/ErrorBoundary.jsx`
- `src/modules/shared/utils/zonahoraria.js`

**Archivos modificados:**
- `src/modules/instructor/views/InstructorPanel.jsx`
- `src/modules/instructor/hooks/useReservasInstructor.js`
- `src/modules/instructor/schemas/perfilSchema.js`
- `src/config/featureFlags.js`

**Deuda técnica pendiente:**
- `FirestoreProvider` lanza `permission-denied` en consola para instructores; no afecta al panel pero ensucia logs.
- Fase 2: Finanzas, perfil ampliado, skeleton loaders, paginación real si volumen crece.
- Probar validación de hora con datos reales.

**Reglas recordadas:** Backup antes de modificar, no usar sed para JSX, zona horaria Venezuela, no mostrar teléfono del estudiante, validar antes de mutar.
EOF

cat >> ARRANQUE_MEMORIA_IA.md << 'EOF'

### SESIÓN 03/09/2026 – Corrección agrupación/orden y etiqueta D2 en Panel Instructor + respaldo GitHub

**Decisiones clave:**
- **Agrupación por período:** `agruparReservasPorPeriodo` ahora considera `fecha2` como parte de "Hoy" o "Mañana" según corresponda.
- **Orden por hora:** Nueva función `ordenarPorHora` ordena reservas por hora de inicio del bloque, usada en los grupos "Hoy".
- **Etiqueta D2:** Se añadió badge "D2" en `GrupoReservas` cuando la reserva está en su segundo día (`fecha2` === hoy).
- **Respaldo GitHub:** Se realizó `git rm --cached node_modules`, limpieza de `.gitignore`, y push forzado a `origin/main` para alinear el remoto con la versión local.

**Archivos modificados:**
- `src/modules/instructor/utils/reservasHelpers.js`
- `src/modules/instructor/components/GrupoReservas.jsx`
- `src/modules/instructor/components/ResumenTab.jsx`
- `src/modules/instructor/components/PendientesTab.jsx`

**Deuda técnica pendiente:**
- Fase 2 completa (Finanzas, Perfil ampliado, Skeleton loaders).
- `FirestoreProvider` global debe filtrar reservas por rol para evitar `permission-denied`.

**Reglas recordadas:** Backup antes de modificar, no usar sed para JSX, zona horaria Venezuela, no mostrar teléfono del estudiante, usar `cat` para archivos completos.
EOF
### SESIÓN 04/09/2026 – Optimización de Firestore para Plan Spark

**Decisiones clave:**
- **Catálogos a `getDocs`:** `sedes`, `horarios`, `cursos`, `instructores`, `proveedores`, `motos`, `admins` y `movimientos` se cargan una sola vez al iniciar sesión. Se expone `refreshCatalogos` para actualización manual.
- **Reservas globales:** solo admin se suscribe con `orderBy('fecha','desc')` y `limit(100)`.
- **`ocupacionConfirmada`:** se mantiene en contexto global pero optimizada con `where('estadoPago','==','Aprobado')` y `limit(500)` para no romper inscripción/proveedor.
- **Heartbeat de presencia:** eliminado `setInterval` de 60s. Ahora se actualiza solo en mount, `visibilitychange` y `online`, y se limpia al desmontar.
- **Notificaciones:** se mantienen en tiempo real pero con límite 100 para admin.
- **refreshCatalogos:** nueva función para refrescar catálogos manualmente tras cambios admin.

**Archivos modificados:**
- `src/context/FirestoreProvider.js`
- `src/modules/sesiones/hooks/useSessionTimer.js`

**Deuda técnica pendiente:**
- Paginación real en admin si se superan 100 reservas.
- Posible extracción de `ocupacionConfirmada` a hooks específicos para reducir lecturas globales.
- Monitorear métricas de Firebase para confirmar ahorro.

**Reglas recordadas:** Backup antes de modificar, no usar sed para JSX, zona horaria Venezuela, `getDocs` para catálogos, `onSnapshot` solo para tiempo real.

### SESIÓN 04/09/2026 – Optimización Firestore y recargas panel admin

**Decisiones clave:**
- **ErrorBoundary sin recarga:** se eliminó `window.location.reload()` y se reemplazó por botón "Reintentar" que solo limpia el estado.
- **Purga de locks manual:** `cleanExpiredLocks` ya no se ejecuta automáticamente en `AdminResumen`; se agregó botón "Purgar Locks".
- **Aislamiento de reservas admin:** creado hook local `useAdminReservas` con `onSnapshot` limitado a 100.
- **Catálogos con getDocs:** ya implementado en sesión anterior; ahora los componentes admin no dependen de `ctx.reservas`.
- **Componentes actualizados:** `AdminResumen`, `AdminReservasList`, `AdminReservasHome` usan hook local.

**Archivos nuevos:**
- `src/modules/admin/hooks/useAdminReservas.js`

**Archivos modificados:**
- `src/components/ErrorBoundary.jsx`
- `src/modules/admin/components/AdminResumen.jsx`
- `src/modules/admin/components/AdminReservasList.jsx`
- `src/modules/admin/components/AdminReservasHome.jsx`

**Deuda técnica pendiente:**
- Revisar reglas de Firestore para permitir purga de locks vencidos por admin.
- Monitorear métricas y confirmar reducción de lecturas/escrituras.

**Reglas recordadas:** Backup antes de modificar, no usar sed para JSX, zona horaria Venezuela, `getDocs` para catálogos, hooks locales para datos transaccionales.

### SESIÓN 05/09/2026 – Segunda optimización Firestore: ocupacionConfirmada y notificaciones

**Decisiones clave:**
- **Hook local `useOcupacionConfirmada`:** creado con `getDocs`, filtro `estadoPago == 'Aprobado'` y `limit(100)`.
- **Eliminada `ocupacionConfirmada` del contexto global** para reducir lecturas.
- **Notificaciones:** solo admin usa `onSnapshot`; los demás cargan una vez con `getDocs` (`limit(50)`).
- **ProveedorActividad:** reemplazado `onSnapshot` por `getDocs` + botón de refresco.
- **Componentes actualizados:** InscripcionView, ProveedorCalendario, ProveedorActividad, ProveedorPanel.

**Archivos nuevos:**
- `src/hooks/useOcupacionConfirmada.js`

**Archivos modificados:**
- `src/context/FirestoreProvider.js`
- `src/context/AppContext.jsx`
- `src/modules/inscripcion/views/InscripcionView.jsx`
- `src/modules/proveedor/components/ProveedorCalendario.jsx`
- `src/modules/proveedor/components/ProveedorActividad.jsx`
- `src/modules/proveedor/views/ProveedorPanel.jsx`

**Deuda técnica pendiente:**
- Migrar `LockService` y `useDisponibilidad` a `getDocs` con intervalo (Fase 2).
- Revisar permisos de purga de locks.
- Monitorear métricas de Firebase.

**Reglas recordadas:** Backup antes de modificar, no usar sed para JSX, zona horaria Venezuela, `getDocs` para catálogos, hooks locales para datos transaccionales.

### SESIÓN 05/09/2026 – Decisión: LockService permanece en tiempo real

**Decisiones clave:**
- **No migrar `LockService` a `getDocs`.** La disponibilidad debe actualizarse en tiempo real.
- Se mantienen las optimizaciones ya realizadas en catálogos, notificaciones y contexto global.
- Firestore está restringido por consumo; no se abrirá Firebase Console hasta que se restablezca.

**Archivos NO modificados:**
- `src/modules/inscripcion/services/LockService.js`
- `src/modules/inscripcion/hooks/useDisponibilidad.js`

**Deuda técnica pendiente:**
- Monitorear consumo y realizar prueba controlada cuando Firestore se restablezca.
- Revisar permisos de purga de locks si es necesario.

**Reglas recordadas:** Antes de optimizar, validar requisitos funcionales. Backup antes de modificar. No abrir Firestore Console durante restricción.

### SESIÓN 06/09/2026 – Intento de optimización/regresiones – Cierre sin estabilizar

**Decisiones:**
- Se detienen los cambios por inestabilidad crítica.
- Se usará respaldo manual para revertir.
- Próxima sesión debe comenzar restaurando la versión estable y luego atacar un único problema a la vez.

**Deuda técnica pendiente:**
- Doble asignación de instructor a la misma hora (causa raíz: validación transaccional incompleta y `fecha1` vs `fecha`).
- Error en validación Zod al procesar pago.
- Disponibilidad debe mantener tiempo real sin consumo excesivo.

**Archivos con regresión (revertir):**
- `src/hooks/useOcupacionConfirmada.js`
- `src/modules/inscripcion/views/InscripcionView.jsx`
- `src/modules/inscripcion/services/ReservaService.js`
- `src/context/FirestoreProvider.js`
- `src/modules/shared/schemas/validations.js`
- `src/modules/shared/utils/zodHelpers.js`

**Reglas reforzadas:**
- Un solo cambio a la vez.
- Probar inmediatamente después de cada cambio.
- Consultar a FIRE/MAMBA antes de modificar lógica de negocio.
- No usar `sed` para JSX.
- Backup antes de cualquier modificación.


### SESIÓN 08-09/09/2026 – Cancelación, disponibilidad y temporizador

**Decisiones clave:**
- **Instructor:** `useReservasInstructor` ahora devuelve `reservas` (todas) y `reservasActivas` (sin `Cancelado`/`Rechazado`). `ResumenTab` y `PendientesTab` usan `reservasActivas`; `HistorialTab` y `FinanzasTab` usan `reservas`.
- **Cancelación admin:** en `rechazarPago('cancelar')` se eliminan locks asociados consultando `ocupacionTemporal` por `instructorId` y filtrando en memoria por `horaId` y fechas; se borran en ambas colecciones (`locks` y `ocupacionTemporal`).
- **Reglas Firestore:** `isAdmin()` puede eliminar locks de `locks` y `ocupacionTemporal` sin restricciones (opción A MAMBA).
- **Temporizador:** `tiempoAgotado = sgta.totalCompletado` (no incluye `diarioCompletado`). Se añadió banner amarillo cuando `diarioCompletado && !totalCompletado`.
- **Disponibilidad:** `useOcupacionConfirmada` usa operador `in` para `[fecha, fecha2]`, con dependencias estables y doble listener.
- **Inscripción:** se elevó `cursoSeleccionado`, `cursoUnDia` y `fecha2Calc` antes del hook, inyectando `fecha2Calc` en lugar de `form.fecha2`.

**Archivos modificados:**
- `src/modules/instructor/hooks/useReservasInstructor.js`
- `src/modules/instructor/views/InstructorPanel.jsx`
- `src/modules/instructor/components/HistorialTab.jsx`
- `src/modules/admin/components/AdminReservaDetalle.jsx`
- `src/hooks/useOcupacionConfirmada.js`
- `src/modules/inscripcion/views/InscripcionView.jsx`
- `src/modules/sesiones/hooks/useSessionTimer.js`
- `src/modules/aula/views/AulaVirtualView.jsx`
- `firestore.rules` (reglas manualmente en consola)

**Deuda técnica pendiente:**
- Verificar y corregir `ReservaService.crearReserva` para eliminar `ocupacionTemporal/{lockId}` en la transacción.
- Actualizar cabecera de `InscripcionView.jsx` al estándar.
- Probar temporizador y cancelación en producción.

**Reglas recordadas:** Consultar a FIRE/MAMBA antes de cambios importantes. Backup antes de modificar. Usar `instructorId` para locks. Eliminar siempre en `locks` y `ocupacionTemporal`.


# Bloque para `ARRANQUE_MEMORIA_IA.md`

Copia al final del archivo:

```markdown

---
### Protocolo de trabajo vigente — actualizado 2026-09-16

**Entorno:**
- Dos carpetas activas: `motoescuela-app` (dev) y `motoescuela-pro` (prod).
- Service Accounts separados: `sa-dev.json` y `sa-prod.json` (nunca en git).
- Shell: **git bash** en MINGW64 (Windows).

**Herramientas obligatorias:**
- `code <ruta>` — abrir archivos en VS Code para revisión o edición manual.
- `cat <ruta> | clip` — enviar contenido de archivo al portapapeles para pegar en el chat.
- `grep -rn "patrón" src/ --include="*.js" --include="*.jsx"` — verificar uso antes de eliminar código.
- Scripts `.mjs` con `firebase-admin` para migraciones y diagnósticos. Siempre con modo dry-run por defecto y `--apply` para escribir.

**Protocolo de backup (obligatorio):**
Antes de modificar cualquier archivo, ejecutar:
```bash
mkdir -p backup/$(dirname RUTA)
cp RUTA "backup/RUTA.backup-$(date +%Y%m%d-%H%M%S)"
```
Los backups se preservan con timestamp y nunca se sobrescriben.

**Reglas de modificación:**
- Prohibido `sed` para JSX. Solo edición manual con `code` o `cat` con archivo completo.
- Cambios paso a paso: aplicar uno → guardar → verificar → siguiente.
- Nunca eliminar código sin `grep -rn` previo que confirme cero consumidores.
- Nunca asumir reglas de negocio. Preguntar al Operador o consultar a FIRE.

**Consulta a FIRE + MAMBA (obligatorio para lógica sensible):**
Toda modificación a reglas de negocio, schema de Firestore o cambios que toquen múltiples archivos requiere consulta formal en caja XML a FIRE y MAMBA antes de tocar código. Formato estándar:
```xml
<CONSULTA_ARQUITECTO>
  <ID>identificador-único</ID>
  <CONTEXTO>...</CONTEXTO>
  <HALLAZGOS>...</HALLAZGOS>
  <OBJETIVO>...</OBJETIVO>
  <PREGUNTAS>...</PREGUNTAS>
  <ALTERNATIVAS_EVALUADAS>...</ALTERNATIVAS_EVALUADAS>
  <SOLICITUD>...</SOLICITUD>
</CONSULTA_ARQUITECTO>
```
Esperar respuesta de AMBOS. Si hay conflicto, el Arquitecto Principal resuelve con fundamento técnico.

**Nota Meta firmada (2026-09-16) — Anti-Alucinación:**
Toda propuesta de modificación de código DEBE incluir el extracto textual real del archivo (imports + firmas + fragmento a modificar). **Prohibido asumir estructura por memoria.** Esta regla surgió tras detectar 8 errores de asunción en propuestas de FIRE y MAMBA.

**Ciclo de trabajo estándar:**
1. Reconocimiento — leer archivos reales con `cat | clip`.
2. Consulta a FIRE + MAMBA (si aplica).
3. Backup con timestamp.
4. Cambio paso a paso + verificación después de cada uno.
5. Pruebas funcionales con evidencia (capturas, dumps de Firestore).
6. Registro en BITACORA_EXPERIENCIAL.md (solo adición, nunca reemplazo).
7. Registro de deuda en BACKLOG_V2.md.

**Estado de sesión (última actualización 2026-09-16):**
- **A1 completado en dev:** preferencia de pago a staff (método + banco por defecto) + fix de `merge:true` en ConfigProvider + fix puntual de `showToast` fantasma en AdminAjustes.
- **Pendiente:** replicar A1 a prod (`motoescuela-pro`), deploy de frontend, y atender deudas críticas registradas en BACKLOG (bug sistémico de toasts, bug financiero de deuda del proveedor).

**Regla de oro:**
Cero asunciones. Cero tokens desperdiciados en propuestas prematuras. Leer archivo real → consultar → aplicar → verificar → registrar.
```

---

**Pega este bloque en `ARRANQUE_MEMORIA_IA.md` y confírmame.**

Con eso cierro la sesión formalmente. Todo lo trabajado queda trazado en los 3 archivos de memoria.


---
### Protocolo de trabajo – Actualizado 2026-09-21

**Estado del proyecto:**
- **Dev:** A2.1, A2.2, A2.3, A2.4, A2.5, A2.6, A2.7, A2.7-bis + fixes #1 y #22 aplicados. Pendiente build + deploy.
- **Prod:** tiene A1, A2.1, A2.2, A2.3 (bloqueos admin multi-fecha) aplicados. A2.4 a A2.7 pendientes de deploy.

**Reglas de negocio confirmadas (esta sesión):**
- **Prereqs SUAVES:** básicos (auto/sincro) NUNCA se bloquean. Solo avisan.
- **Prereqs DUROS:** Práctica en Vía, Motero y futuros con prereq → bloqueo real.
- **Bloqueos multi-fecha:** bloqueosAdmin y bloqueosProveedor se validan contra fecha1 Y fecha2.
- **Cancelación definitiva:** SOLO por falta de pago no coincidente. Texto del aviso al estudiante ya definido.
- **Reintento ≠ Recompra:** flujos separados para métricas (campo `origenReinscripcion`).
- **Reintento aterriza en Paso 1** con datos prellenados (solo estáticos).
- **Campos volátiles** (sabeBicicleta, tipoMoto, traeMoto) SIEMPRE se preguntan de nuevo.
- **Formato VZ:** montos en `Bs. XX.XXX,XX` con puntos miles y comas decimales. Helper manual.
- **Estudiante con canceladas** → ve catálogo + aviso rojo + botón "Ver cursos disponibles".

**Reglas de proceso (confirmadas con FIRE + MAMBA):**
- **Sin índices compuestos innecesarios:** filtrar en cliente cuando volumen por usuario es bajo (<20 docs).
- **Sin transacciones con queries:** Firestore SDK cliente NO permite queries dentro de transacciones. Solo `get(docRef)`.
- **Sin forzar datos volátiles:** preguntar siempre. "Determinismo Categórico".
- **Excepción de básicos:** en el consumidor (render), no en el helper `cumplePrerequisito`. Helper mantiene semántica pura.
- **Sin límites de reintentos:** no inventar reglas no confirmadas.
- **Trazabilidad de origen:** campo `origenReinscripcion` en reservas ('nueva' | 'recompra' | 'reintento').

**Archivos clave (actualizado):**
- `src/modules/estudiante/views/EstudiantePanel.jsx` — panel del estudiante, catálogo, reintento, aviso canceladas.
- `src/modules/inscripcion/views/InscripcionView.jsx` — orquestador con 3 flujos (público, recompra, reintento).
- `src/modules/inscripcion/services/ReservaService.js` — `obtenerReservasCanceladas`, `origenReinscripcion`.
- `src/modules/inscripcion/components/Paso4Pago.jsx` — formato VZ + desglose con alquiler moto.
- `src/modules/inscripcion/components/BotonCopiarDatos.jsx` — copiado con monto VZ.
- `src/constants/cursoSecuencia.js` — `cumplePrerequisito` con fallback `tipoCurso` desde `cursoId`.

**Deuda técnica priorizada:**
1. 🔴 Bug refresh en pasos 2-4 de inscripción.
2. 🔴 Recompra falla con solo canceladas (resuelto parcialmente con A2.6).
3. 🟡 A2.4-b1: extraer helpers `afectaFecha`/`afectaProveedor` a módulo.
4. 🟡 A2.4-b2: validar bloqueos en transacción `crearLock`.
5. 🟡 Receso automático por tiempo real.
6. 🟢 A2.2-b1 a b5 (editable tipoMotoFijo/orden, modo AND/OR, purgar hardcode, validación en servicio).

**Comandos habituales (MINGW64):**
- `code <ruta>` — abrir en VS Code.
- `cat <ruta> | clip` — copiar archivo al portapapeles.
- `grep -rn "patrón" src/ --include="*.js" --include="*.jsx" | clip` — búsqueda (usar **comillas simples** para evitar expansión de `!`).
- `cp <origen> "backup/<ruta>.backup-$(date +%Y%m%d-%H%M%S)"` — backup obligatorio antes de modificar.
- `npm run build 2>&1 | tail -8 | clip` — build.

**⚠️ Recordatorio crítico:**
- SIEMPRE backup antes de modificar (nunca después).
- NUNCA usar `sed` para JSX.
- NUNCA asumir reglas de negocio sin consultar al Operador.
- CONSULTAR a FIRE + MAMBA antes de tocar flujos críticos.
- Esperar confluencia 3/3 antes de aplicar cambios en flujos críticos (inscripción, pagos, prereqs, bloqueos).
- Usar comillas simples en `grep` si el patrón contiene `!`.
---

### Protocolo de trabajo – Actualizado 2026-09-22

**Estado del proyecto:**
- **Dev:** A2.9, A2.10, A2.11 aplicados y probados. Fases 1-2 del Pack Comercial (CRUD admin + vista pública `/packs`) aplicadas y probadas. Pendiente build + deploy.
- **Prod:** A1, A2.1, A2.2, A2.3 aplicados. A2.4 a A2.11 pendientes de deploy. Fases Pack 1-8 pendientes.

**Nuevo contexto — Pack Comercial:**
- Producto configurable desde admin (sección "Packs" en `AdminConfigHub`).
- 2 packs previstos: Pack Auto, Pack Sincro (composición: Equilibrio + Básico + Refuerzo + Práctica en Vía).
- Precio: suma de cursos − descuento configurable (fijo $ o %). Cálculo dinámico, congelado en `reservasPack` al comprar.
- Vencimiento configurable por pack.
- Reserva maestra (`reservasPack`) + sub-reservas (`reservas`) que se activan al avanzar.
- Agenda secuencial pura (solo el curso actual se agenda).
- Agendamiento desde portal del estudiante, página dedicada (no modal): `/reservas/:reservaId/agendar`.
- **Modelo de comisiones HÍBRIDO (aprobado 3/3):** precio prorrateado en child + comisión instructor/proveedor completa + negocio absorbe la diferencia.

**Reglas de negocio del pack (confirmadas):**
- Sin reembolso. El estudiante debe completar el curso.
- Cliente con Equilibrio previo igual repite (pack es producto distinto).
- Refuerzo Práctico solo para quienes completaron un Básico.
- Prácticas Libre NO va en el pack.

**Reglas de proceso (actualizadas):**
- **Antes de firmar confluencia entre IAs, exigir dictamen individual verificable.** La firma indebida de FIRE+MAMBA en la consulta PACK-COMERCIAL-V1 fue detectada por el Arquitecto Principal y forzó re-consulta.
- **Colecciones nuevas > extender colecciones con flags** cuando la colección existente tiene 8+ consumidores. La separación de Bounded Contexts es más barata que refactor preventivo.
- **Valores financieros congelados en la transacción (FIX-036).** El precio del pack se congela en `reservasPack` al momento de la compra.
- **Reglas Firestore viven en la consola, NO hay archivo local.** Editar directo en Firebase Console → Firestore → Reglas → Publicar. Verificar que el `match` esté DENTRO del bloque `match /artifacts/{appId}/public/data`.

**Archivos clave del Pack:**
- `src/modules/admin/forms/FormPack.jsx` — formulario con drag & drop + flechas ↑↓.
- `src/modules/admin/components/AdminPacks.jsx` — wrapper del CRUD con renderItem custom.
- `src/modules/public/views/PacksPublicosView.jsx` — vista pública `/packs`.
- `src/modules/admin/components/CRUDView.jsx` — extendido con `renderItem` opcional.

**Fases del Pack (pendientes):**
1. ✅ Fase 1 — Schema `packs` + CRUD Admin.
2. ✅ Fase 2 — Vista pública.
3. ⏳ Fase 3 — Compra de pack (reserva maestra + sub inicial).
4. ⏳ Fase 4 — Extracción de componentes a `shared/agenda/`.
5. ⏳ Fase 5 — Agendamiento secuencial desde portal.
6. ⏳ Fase 6 — Panel admin.
7. ⏳ Fase 7 — Comisiones prorrateadas (híbrido).
8. ⏳ Fase 8 — Reglas prod + testing E2E.

**Deuda técnica nueva:**
- 🟢 Líneas pegadas en `AppContext.jsx`, `AdminCRUDPage.jsx`, `FirestoreProvider.js` (cosmético).
- 🟡 Reglas `packs` faltan replicar a prod (Fase 8).
- 🟡 `Refuerzo Práctico.prerequisitos` debe ser `['basico_auto', 'basico_sincro']` en prod (hoy vacío).

**Comandos habituales (MINGW64):**
- `code <ruta>` — abrir en VS Code.
- `cat <ruta> | clip` — copiar archivo al portapapeles.
- `grep -rn "patrón" src/ --include="*.js" --include="*.jsx" | clip` — búsqueda (usar **comillas simples** si hay `!`).
- `cp <origen> "backup/<ruta>.backup-$(date +%Y%m%d-%H%M%S)"` — backup obligatorio antes de modificar.
- `npm run build 2>&1 | tail -8 | clip` — build.

**⚠️ Recordatorio crítico:**
- SIEMPRE backup antes de modificar (nunca después).
- NUNCA usar `sed` para JSX.
- NUNCA asumir reglas de negocio sin consultar al Operador.
- CONSULTAR a FIRE + MAMBA antes de tocar flujos críticos.
- Exigir dictamen individual verificable antes de firmar confluencia 3/3.
- Reglas Firestore en consola, no hay archivo local.

---

### Sesión 25-26/09/2026 – Pack Comercial: Fases 1, 2, 3.7, 3.8a, 3.8b

**Estado del proyecto:**
- **Dev:** Pack Comercial funcional end-to-end. Compra → aprobación admin. Pendiente 3.8c/d/e.
- **Prod:** A1, A2.1, A2.2, A2.3 aplicados. A2.4 a A2.15 pendientes de deploy. Fases Pack 1-8 pendientes.

**Pack Comercial — Modelo confirmado (confluencia 3/3):**
- **2 packs previstos:** Pack Auto, Pack Sincro.
- **Composición:** Equilibrio + Básico (Auto/Sincro) + Refuerzo Práctico + Práctica en Vía.
- **Precio:** suma de cursos − descuento configurable (fijo $ o %).
- **Vencimiento:** configurable por pack, congelado al comprar.
- **Reserva maestra + child:** `reservasPack/{id}` (maestra) + `reservas/{id}` con `tipoReserva: 'pack_sub'` (child del curso actual).
- **Agenda secuencial pura:** solo el curso actual se agenda. Los demás pasan a `estado: 'bloqueado'`.
- **Modelo HÍBRIDO de comisiones:**
  - Child: `precio` prorrateado (15/90 × 81 = 13.50).
  - Child: `comisionInstructor` y `comisionProveedor` completas.
  - Negocio absorbe déficit (`deficitComision`, `comisionAbsorbidaPorNegocio`).
- **Aprobación cascada:** admin aprueba maestra → se aprueba child + espejo automáticamente.

**Archivos clave del Pack:**
- `src/modules/admin/forms/FormPack.jsx` — formulario con drag & drop.
- `src/modules/admin/components/AdminPacks.jsx` — CRUD admin.
- `src/modules/admin/components/AdminPackDetalle.jsx` — detalle + aprobación.
- `src/modules/admin/hooks/useAdminReservas.js` — 2 listeners (reservas + reservasPack).
- `src/modules/public/views/PacksPublicosView.jsx` — vista pública `/packs`.
- `src/modules/inscripcion/components/Paso2Pack.jsx` — Paso 2 variante pack.
- `src/modules/inscripcion/services/ReservaService.js` — `crearReservaPack`, `aprobarReservaPack`, `rechazarReservaPack`, `cancelarReservaPack`.

**Reglas Firestore vigentes (dev):**
- `packs`: `allow read: if true; allow write: if isAdmin();`.
- `reservasPack`: `allow read/create/update` para owner y admin. `delete: false`.
- `reservas.create` extendida: `precio >= 0`, valida `tipoReserva`, usa `getAfter()` para verificar maestra en transacción.

**Reglas de proceso (reforzadas):**
- **Antes de firmar confluencia 3/3, exigir dictamen individual verificable.** FIRE/MAMBA se contradijeron en la primera ronda; re-consulta forzada.
- **Extender reglas de colecciones compartidas con `getAfter()`, no `exists()+get()`.** La maestra no existe al evaluar la child en transacción atómica.
- **Componentes nuevos para lógicas nuevas.** No meter lógica de pack en `AdminReservaDetalle.jsx`.

**Fases del Pack (pendientes):**
1. ✅ Fase 1 — Schema + CRUD Admin.
2. ✅ Fase 2 — Vista pública.
3. ✅ Fase 3.7 — Compra del pack.
4. ✅ Fase 3.8a — Admin ve packs.
5. ✅ Fase 3.8b — Admin aprueba packs.
6. ⏳ Fase 3.8c — Movimiento contable al aprobar.
7. ⏳ Fase 3.8d — Email confirmación.
8. ⏳ Fase 3.8e — Panel estudiante ve pack.
9. ⏳ Fase 4 — Extracción componentes a `shared/agenda/`.
10. ⏳ Fase 5 — Agendamiento secuencial.
11. ⏳ Fase 6 — Panel admin con filtros.
12. ⏳ Fase 7 — Comisiones prorrateadas con reportes.
13. ⏳ Fase 8 — Reglas prod + testing E2E.

**Deuda técnica nueva:**
- 🟢 Indentación irregular en bloques pegados (cosmético).
- 🟡 Reglas Firestore del pack faltan replicar a prod (Fase 8).
- 🟡 `Refuerzo Práctico.prerequisitos` debe ser `['basico_auto', 'basico_sincro']` en prod.

**⚠️ Recordatorios críticos:**
- SIEMPRE backup antes de modificar.
- NUNCA usar `sed` para JSX.
- NUNCA asumir reglas de negocio sin consultar al Operador.
- CONSULTAR a FIRE + MAMBA antes de tocar flujos críticos.
- Exigir dictamen individual verificable antes de firmar confluencia.
- Reglas Firestore viven en consola, no hay archivo local.
- El pack es INVISIBLE en panel admin/estudiante hasta Fase 3.8c/d/e.

---

### Sesión 27-28/09/2026 – Fase 5 del Pack Comercial completa

**Estado del proyecto:**
- **Dev:** Fase 5 completa en código + reglas. Falta fix del filtro visual (`packCursoIndex === cursoActual`), 5.3 (agendar siguiente curso), 5.4 (página de agendamiento), 5.5 (botón).
- **Prod:** A1-A2.3, Fases 1-3 del pack aplicadas. Fix puntual de 2 reservas de Carlos Azuaje. Fases 3.8c/e y 5 pendientes de deploy.

**Fase 5 — Modelo confirmado (confluencia FIRE + MAMBA + Deek):**
- **Detección de curso completado:** ALT-E (batch atómico al completar curso). En la práctica: fire-and-forget con idempotencia.
- **OP-A elegida:** dos operaciones separadas (child update + fire-and-forget del avance de maestra). MAMBA cedió bajo condición de reparación isomórfica.
- **`cursoReservaId` NO se muta en el avance.**
- **Reparación isomórfica obligatoria** en `/mi-pack/:id` y `EstudiantePanel`.
- **`hasOnly` de instructor:** `['subReservas', 'cursoActual', 'estado']`. Sin cambios.
- **Regla simétrica:** tanto `read` como `update` de `reservasPack` incluyen rama instructor.

**Archivos clave del pack:**
- `src/modules/admin/components/AdminPacks.jsx` — CRUD admin.
- `src/modules/admin/components/AdminPackDetalle.jsx` — detalle + aprobación.
- `src/modules/admin/hooks/useAdminReservas.js` — 2 listeners (reservas + reservasPack).
- `src/modules/public/views/PacksPublicosView.jsx` — vista pública.
- `src/modules/inscripcion/components/Paso2Pack.jsx` — Paso 2 variante pack (v2 con derivación por tipoCurso).
- `src/modules/inscripcion/components/Paso3Horario.jsx` — reutilizable para agendamiento.
- `src/modules/estudiante/views/PackDetalleEstudiante.jsx` — página dedicada.
- `src/modules/inscripcion/services/ReservaService.js`:
  - `crearReservaPack` (compra).
  - `aprobarReservaPack`, `rechazarReservaPack`, `cancelarReservaPack`.
  - `avanzarPackTrasCompletarCurso` (Fase 5.2).
  - `corregirReferenciaPago` con `writeBatch` (maestra + child).
- `src/modules/sesiones/hooks/useSessionTimer.js` — llama a `avanzarPackTrasCompletarCurso` desde `finalizarModulo` y `completarCursoManualmente`.

**Reglas Firestore (dev y prod):**
- `packs`: `allow read: if true; allow write: if isAdmin();`.
- `reservasPack`:
  - `read`: admin OR userId OR instructor del `cursoReservaId`.
  - `create`: userId + validaciones de shape.
  - `update`: admin OR userId OR (instructor + hasOnly(['subReservas', 'cursoActual', 'estado'])).
  - `delete: false`.
- `reservas.create`: valida `tipoReserva` y verifica maestra con `getAfter()`.

**Scripts de producción usados (temporales, NO commitear):**
- `migrar-curso-reserva-id-dev.mjs` — agrega `cursoReservaId` a packs existentes.
- `fix-pack-test-dev.mjs` — cambia fecha de child de prueba.
- `reset-modulo3-dev.mjs` — borra el módulo 3 para re-probar.
- `verificar-pack-avance-dev.mjs` — verifica estado del pack.
- `check-instructores-dev.mjs` — lista instructores en dev.
- `check-reservas-instructor-dev.mjs` — reservas por instructor.
- `read-pack-prueba-dev.mjs` — lectura de packs.
- `read-estudiante-pack-dev.mjs` — correo + pin del estudiante.
- **PROD:** `fix-reservas-carlos-prod.mjs` + backup en `backup/prod/reservas-carlos-2026-09-28T01-21-45.json`.

**Reglas de proceso (reforzadas):**
- **Simetría read/write:** al extender reglas para un nuevo rol, revisar TODOS los verbs (read, get, list, create, update, delete).
- **Fire-and-forget con idempotencia** para flujos no críticos.
- **Scripts de fix en PROD:** dry-run por defecto + backup automático + idempotencia.
- **Cuando un usuario reporta "no aparece X":** verificar estados de TODOS los flujos relacionados (no asumir).

**Deuda técnica pendiente:**
- 🟡 Fix del filtro visual: `packReservaId && packCursoIndex === cursoActual` en `PackDetalleEstudiante` y `EstudiantePanel`.
- 🟡 3.8d: Email al estudiante cuando se aprueba pack.
- 🟡 Alquiler moto en Práctica dentro del pack (precio dinámico).
- 🔴 5.3: `ReservaService.agendarSiguienteCursoPack`.
- 🟡 5.4: Página `/mi-pack/:id/agendar`.
- 🟡 5.5: Botón "Agendar" en `PackDetalleEstudiante`.
- 🟢 5.6: Testing E2E completo.

**⚠️ Recordatorios críticos:**
- SIEMPRE backup antes de modificar.
- NUNCA usar `sed` para JSX.
- NUNCA asumir reglas de negocio.
- CONSULTAR a FIRE + MAMBA para cambios críticos.
- Exigir dictamen individual verificable.
- Reglas Firestore en consola, no hay archivo local.
- Commit solo al pasar a producción.

---

### Sesión 28/09/2026 – Fase 5 del Pack Comercial COMPLETA

**Estado del proyecto:**
- **Dev:** Fase 5 completa y funcionando end-to-end. Fix crítico de `instructoresPermitidos` aplicado en 2 capas. Falta solo replicar a prod.
- **Prod:** Fases 1-3 aplicadas, fix puntual de Carlos Azuaje. Fases 3.8c/e + 5 pendientes de deploy.

**Fase 5 — Modelo completo (confluencia 3/3):**

- **Detección de curso completado:** ALT-E (batch atómico). En la práctica: fire-and-forget con idempotencia triple.
- **OP-A elegida:** dos operaciones separadas (child update + fire-and-forget del avance de maestra).
- **`cursoReservaId` NO se muta al avanzar (instructor).** Sí se actualiza al agendar el siguiente curso (estudiante).
- **Reparación isomórfica obligatoria** en `/mi-pack/:id` y `EstudiantePanel` (pendiente de implementar como deuda).
- **`hasOnly` de instructor:** `['subReservas', 'cursoActual', 'estado']`.
- **Regla simétrica:** `read` y `update` de `reservasPack` incluyen rama instructor.

**Flujo completo del pack (verificado en dev):**
Estudiante compra pack ($81)
→ Maestra (Pendiente) + Child Equilibrio (Pendiente)

Admin aprueba el pack
→ Maestra (Aprobado) + Child Equilibrio (Aprobado + En Curso) + Espejo

Estudiante va al Aula Virtual
→ Completa los 3 módulos de Equilibrio
→ Instructor presiona "Completar Curso"
→ Fire-and-forget: avanzarPackTrasCompletarCurso
→ subReservas[0].estado = 'completado'
→ subReservas[1].estado = 'activo'
→ cursoActual = 1

Estudiante va a /mi-pack/:id
→ Ve "Próximo curso: Básico Automática" con "Pendiente de agendar"
→ Clic "Agendar fecha"

Página /mi-pack/:id/agendar
→ Selecciona fecha/hora → crea lock
→ agendarSiguienteCursoPack:
→ Nuevo child Básico (Aprobado + Pendiente)
→ Maestra: subReservas[1].reservaId = childBásico.id
→ Maestra: cursoReservaId = childBásico.id
→ Espejo + purga de locks

Estudiante ve "Curso actual: Básico Automática" con fecha/hora

text

**Archivos clave del pack (actualizado):**

- `src/modules/admin/components/AdminPacks.jsx` — CRUD admin.
- `src/modules/admin/components/AdminPackDetalle.jsx` — detalle + aprobación.
- `src/modules/admin/hooks/useAdminReservas.js` — 2 listeners (reservas + reservasPack).
- `src/modules/public/views/PacksPublicosView.jsx` — vista pública.
- `src/modules/inscripcion/components/Paso2Pack.jsx` — v2 con derivación por `tipoCurso`.
- `src/modules/estudiante/views/PackDetalleEstudiante.jsx` — página dedicada.
- `src/modules/estudiante/views/AgendarPackView.jsx` — **NUEVO**, página `/mi-pack/:id/agendar`.
- `src/modules/inscripcion/hooks/useDisponibilidadPack.js` — **NUEVO**, hook con 4 validaciones + filtro de `instructoresPermitidos`.
- `src/modules/inscripcion/services/ReservaService.js`:
  - `crearReservaPack` (compra).
  - `aprobarReservaPack`, `rechazarReservaPack`, `cancelarReservaPack`.
  - `avanzarPackTrasCompletarCurso` (Fase 5.2).
  - `agendarSiguienteCursoPack` (Fase 5.3).
  - `corregirReferenciaPago` con `writeBatch`.
- `src/modules/sesiones/hooks/useSessionTimer.js` — fire-and-forget en `finalizarModulo` y `completarCursoManualmente`.

**Reglas Firestore (dev):**

- `packs`: `allow read: if true; allow write: if isAdmin();`.
- `reservasPack`:
  - `read`: admin OR userId OR instructor del `cursoReservaId`.
  - `create`: userId + validaciones de shape.
  - `update`: admin OR userId OR (instructor + `hasOnly(['subReservas', 'cursoActual', 'estado'])`).
  - `delete: false`.
- `reservas.create`:
  - Reserva individual normal → `estadoPago: 'Pendiente'`.
  - `pack_sub` → `estadoPago in ['Pendiente', 'Aprobado']` + valida `packReservaId`.

**Reglas de proceso (reforzadas):**

- **Simetría read/write:** al extender reglas para un nuevo rol, revisar TODOS los verbs.
- **Bifurcar reglas por contexto:** cuando un campo varía según `tipoReserva`, usar OR explícito.
- **Filtros de negocio en hook + defensa en profundidad** en la capa de UI.
- **Fire-and-forget + idempotencia** para flujos no críticos.
- **Scripts de fix en PROD:** dry-run + backup automático + idempotencia.

**Deuda técnica priorizada:**

1. 🟡 **Consolidar disponibilidad en SSOT único** (`InscripcionView.evaluarDisponibilidad` + `useDisponibilidadPack`).
2. 🔴 **Deploy a prod:** Fases 3.8c/e + 5 completa + reglas Firestore actualizadas.
3. 🟡 **3.8d:** Email al estudiante cuando se aprueba el pack.
4. 🟡 **Reparación isomórfica** de desfase `avanzarPackTrasCompletarCurso` en `/mi-pack/:id` y `EstudiantePanel` (FIRE + MAMBA lo condicionaron).
5. 🟡 **Receso automático por tiempo real de sesión** (no por módulo activo).
6. 🟡 **Alquiler moto en Práctica** con precio dinámico del pack.
7. 🟡 **Casos borde:** pack vencido durante agendamiento, cambio de instructor entre sesiones.

**Comandos habituales:**

```bash
cd /c/motoescuela-app   # dev
cd /c/motoescuela-pro   # prod

code <ruta>
cat <ruta> | clip
grep -n "patrón" <ruta> | clip
cp <ruta> "backup/<ruta>.backup-$(date +%Y%m%d-%H%M%S)"
npm run build 2>&1 | tail -8 | clip
node <script>.mjs | clip          # dry-run
node <script>.mjs --apply | clip  # apply
⚠️ Recordatorios críticos:

SIEMPRE backup antes de modificar.

NUNCA usar sed para JSX.

NUNCA asumir reglas de negocio sin consultar al Operador.

CONSULTAR a FIRE + MAMBA para cambios críticos.

Exigir dictamen individual verificable antes de firma conjunta.

Reglas Firestore viven en consola, NO hay archivo local.

Commit solo cuando se pasa a producción.

Documentar reglas nuevas en INSTRUCCIONES_A_LA_IA.md.

---

### SESIÓN 29-30/09/2026 – 5 frentes de trabajo en dev (sin deploy a prod)

**Estado del proyecto al cierre:**
- **Dev (`/c/motoescuela-app`):** 5 fixes aplicados, todos en código.
  Falta smoke test E2E final.
- **Prod (`/c/motoescuela-pro`):** intacto. Esperando que dev esté
  verificado para deployar.

**Fix aplicados en dev (por orden):**

1. **Feature Reponer D2** — Modal admin + Badge visual + Helper
   centralizado `reservaHelpers.js` + migración de 5 archivos para
   usar `horaIdReposicion`.
2. **Fix disponibilidad h4/h6** — Consumidores migrados a
   `getHoraIdOcupacion`.
3. **Fix prereq bypass (Esslen)** — 3 capas de validación:
   `handleNext`, `ReservaService.crearReserva`, `Paso2Configuracion`.
4. **Fix moto (`motoIncluida: false`)** — 2 capas: cliente
   (`cursoIncluyeMoto`) + backend (SSOT).
5. **Fix bootstrap registro** — Consolidación de 4 useEffect en 1
   bootstrap con 7 fases secuenciales. Eliminados 3 useEffect
   migrados. Extendido `handleNext` Paso 1→2 sin auto-login.

**Reglas de negocio confirmadas:**
- **NUNCA auto-login.** Siempre `/login` para PIN manual.
- **Básicos son soft.** Solo avisan, no bloquean.
- **Curso con `motoIncluida: false`** NO asigna moto.
- **Usuario con CUALQUIER reserva** (Pendiente, Aprobado, Rechazado,
  Cancelado, o pack activo) → `/portal-reservas`.
- **Excepciones:** recompra, reintento, pack → dejar flujos.

**PENDIENTE INMEDIATO (próxima sesión):**

1. **Verificar el fix del bootstrap.** Correr este smoke test:
   - Usuario logueado con reserva (cualquier estado) → debe redirigir.
   - Refresh en Paso 2/3/4 → debe mantener el paso.
   - Cédula bloqueada y vacía → debe resolverse con precarga.
   - Usuario sin sesión con correo existente → debe ir a `/login`.

2. **Limpiar `publicoInicializadoRef`** — si el `useRef` quedó
   huérfano en `InscripcionView.jsx:316`, eliminarlo.

3. **Verificar toast login** — línea 1314 de `InscripcionView.jsx`.

**PENDIENTES MEDIANOS:**

4. **Registrar bug de correr fechas un día** (Giovanny Valera,
   caso 25/09). No reproducido. Puede ser mal uso del cliente.
   Ya en BACKLOG.

5. **Limpiar BACKLOG duplicado** — `B-REG-DISPONIBILIDAD-H3` aparece
   x2 (líneas ~1028 y ~1075).

6. **Limpiar reserva `bGLolv1sndec`** — tiene 7 reprogramaciones de
   prueba. Dejar solo 1.

7. **Consolidar disponibilidad en SSOT único** — `evaluarDisponibilidad`
   de `InscripcionView` vs `useDisponibilidadPack`. Duplicación
   documentada.

8. **Receso automático por tiempo real** — no por módulo.
   Documentado en BACKLOG.

**PENDIENTES GRANDES:**

9. **Deploy a prod** de todos los fixes de esta sesión:
   - Copiar `src/` de dev a prod.
   - Reglas Firestore actualizadas (verificar las actuales).
   - Build + deploy Firebase Hosting.
   - Smoke test E2E en prod.

10. **Extraer bootstrap a hook** `useInscripcionDispatcher` — deuda
    técnica documentada.

**Archivos nuevos importantes:**
- `src/modules/shared/utils/reservaHelpers.js` (9 funciones).
- `src/modules/shared/components/BadgeReposicion.jsx`.

**Archivos críticos modificados:**
- `src/modules/inscripcion/views/InscripcionView.jsx` — bootstrap
  consolidado + handleNext extendido.
- `src/modules/inscripcion/services/ReservaService.js` — validación
  prereqs + moto null.
- `src/modules/inscripcion/components/Paso2Configuracion.jsx` —
  useEffect revalidación prereqs.
- `src/modules/admin/components/CambiarHorarioModal.jsx` — modo
  Reponer D2.
- `src/modules/admin/components/AdminReservaDetalle.jsx` — handler
  cambiarHorario reescrito.

**Protocolo de trabajo reforzado:**
- **SIEMPRE** backup antes de modificar.
- **SIEMPRE** `code <ruta>` para abrir.
- **SIEMPRE** `| clip` en comandos de terminal.
- **NUNCA** `sed` para JSX.
- **NUNCA** asumir reglas de negocio.
- **CONSULTAR** a FIRE + MAMBA con dictamen individual.
- **VETO SUPREMO** del Arquitecto tras 3 rondas sin confluencia.


---

### SESIÓN 30/09/2026 – Deploy a producción + Módulo Teórico (Fase 1 + 2)

**Contexto general:**
Sesión maratón de ~24 horas. Se deployó a prod todo el trabajo legal acumulado y se inició el Módulo Teórico.

**Estado del proyecto al cierre:**
- **Dev (`/c/motoescuela-app`):** todo el trabajo aplicado, sin commitear.
- **Prod (`/c/motoescuela-pro`):** DEPLOYADO Y OPERATIVO (https://motoescuelapp.web.app).
- **Firebase CLI:** apunta a `motoescuela-dev`. `.firebaserc` corregido a `motoescuela-dev` (antes apuntaba por error a `motoescuela-139e4`, proyecto vacío).
- **Proyectos Firebase confirmados:**
  - `motoescuela-139e4` (displayName: "motoescuela") → **VACÍO**, obsoleto.
  - `motoescuela-dev` (projectId real) → DEV.
  - `motoescuelapp` (displayName: "motoescuela-prod") → PROD.

**Lo que se deployó a producción:**
1. Terminología legal completa (~40 archivos): Escuela→Moto App, Instructor→Tutor, Curso→Sesión, Alumno/Estudiante→Usuario, Certificado→Constancia, Aula Virtual→Panel de Sesiones.
2. Términos y Condiciones reescritos por asesor legal.
3. LegalFooter + disclaimer en páginas públicas.
4. Ruta /cursos → /sesiones con redirect.
5. Fix bootstrap de /inscripcion (A2.8).
6. Feature Reponer D2 + fix moto + helper getHoraIdOcupacion (Grupo Y completo, 12 archivos).
7. Botón WhatsApp + llamar por teléfono en AdminReservaDetalle.
8. Reglas Firestore con colecciones nuevas del módulo teórico.

**Lo que se creó en dev (NO deployado aún a prod):**
- Módulo Teórico Fase 1: colecciones `cursosTeoricos`, `modulosTeoricos`, `quizzesTeoricos`, `packsTeoricos`, `accesosTeoricos`, `logrosUsuario`.
- Módulo Teórico Fase 2: CRUD admin completo (`AdminCursosTeoricos.jsx`, `FormCursoTeorico.jsx`, `EditorModulos.jsx`, `FormModuloTeorico.jsx`, `ModuloTeoricoService.js`).
- Tab "Teóricos" en Admin → Cursos.

**Bugs cerrados:**
- Warning "duplicate key" en notificaciones (causado por `Date.now().toString()` colisionando en el mismo ms). Fix: `crypto.randomUUID()` con fallback.

**Optimización Firestore adicional:**
- Notificaciones: eliminado `onSnapshot` para admin. Ahora `getDocs` con `limit(30)` bajo demanda vía `refreshNotificaciones` que se dispara al abrir el dropdown. Ahorro estimado 85-95%.

**Deuda técnica nueva prioritaria:**
- Módulo Teórico Fase 3+: vista pública `/teorico`, panel estudiante, flujo de compra, aprobación admin, editor de módulos accesible desde el admin.
- Los `console.log` de debug quedan en `useSessionTimer.js` y otros (cosmético).
- El `FirestoreProvider` tiene un listener de reservas solo para admin con `limit(100)`; revisar si conviene migrar a `getDocs` también.

**Reglas reforzadas esta sesión:**
- **NUNCA dar un texto para `Ctrl+H` sin verificar antes cómo está en disco.** Varias veces el Arquitecto entregó el texto "como debía quedar" en lugar del texto real, causando que los buscadores no encontraran coincidencias. Protocolo: leer el archivo primero, extraer el texto EXACTO, después proponer el reemplazo.
- **SIEMPRE `| clip` en comandos de Git Bash.** El Operador insiste en esto — sin `| clip` no ve la salida.
- **Cada `code <ruta>` va al INICIO del mensaje, en su propio bloque, sin enterrarlo en el párrafo.**
- **Los archivos `.rules` SÍ existen localmente** (`firestore.rules` en raíz). El Manual decía lo contrario, está desactualizado.

---

---

### SESIÓN 01-02/10/2026 – Fix crítico de notificaciones (sangrado Firestore) + Cleanup prod

**Contexto de arranque:**
Sesión iniciada desde traspaso de instancia anterior. El frente original era "verificar fix de notificaciones en dev" y "deployar a prod". Se descubrió un bug crítico de sangrado de Firestore que se resolvió end-to-end (dev + prod) con 3 capas de fix + limpieza + migración de datos.

**Problema detectado:**
- `notificaciones` en dev tenía **4265 docs** con UUIDs duplicados (warnings `Encountered two children with the same key`).
- En prod tenía **3758 docs** con mismo patrón.
- Cada recarga del admin generaba ~100 `setDoc` adicionales (sangrado Firestore plan Spark).
- Los dropdowns mostraban "Hoy" en notificaciones de reservas viejas.

**Causa raíz (3 capas):**
1. `saveNotificacion` en `FirestoreProvider.js` no estaba memoizada → identidad nueva en cada render → `NotificationsProvider` re-disparaba el effect.
2. `NotificationsProvider` no tenía bootstrap silencioso → `prevReservasRef.current` arrancaba `[]` → todas las reservas del snapshot se veían como "nuevas" → 100 `saveNotificacion` por recarga.
3. `setNotifications(prev => [...prev, newItem])` acumulaba sin dedupe.

**Fixes aplicados (3 archivos dev, luego copiados a prod):**
- **`FirestoreProvider.js`**: `saveNotificacion` con `useCallback` + `setNotifications` idempotente por `id`. Header actualizado a `FIX-NOTIF-DUPLICADOS-V1`.
- **`NotificationDropdown.jsx`**: dedupe defensivo por `id` antes de ordenar.
- **`NotificationsProvider.jsx`**: IDs determinísticos (`nueva_${r.id}`, `aprobado_${r.id}`, `rechazado_${r.id}`, `finalizada_${r.id}`) + bootstrap silencioso con `bootstrapDoneRef` (useRef).
- **`FirestoreProvider.jsx` (fantasma)**: eliminado de dev y prod. No lo importaba nadie (Vite resuelve a `.js`).

**Limpieza de datos ejecutada (dry-run + --apply + backup):**
- **Dev:** 4265 → **225** docs (4040 eliminados).
- **Prod:** 3758 → **332** docs (3426 eliminados).
- Regla: conservar 1 doc por grupo `(tipo + reservaId)`. Si algún doc del grupo tenía `leida: true`, se conservó ESE. `sesion_iniciada` y `sesion_pausada` se conservan todos (eventos repetibles).

**Migración de fechas de notificaciones:**
- **Fix v1:** 42 `nueva_reserva` con `createdAt` reescrito a hoy por el sangrado → migradas al `createdAt` de su reserva (threshold 7 días).
- **Fix v2:** 74 más con diffs de 19h a 1538h → migradas con threshold 1h.
- **Total: 116 notificaciones** con fechas corregidas.
- **Verificación final:** 0 `nueva_reserva` desfasadas (>1h).

**Deploy a prod ejecutado:**
- 4 archivos copiados dev → prod (`FirestoreProvider.js`, `AppContext.jsx`, `NotificationsProvider.jsx`, `NotificationDropdown.jsx`).
- Fantasma `FirestoreProvider.jsx` eliminado de prod.
- `npm run build` exitoso (27s, 65 entries PWA, 2487 KiB).
- `firebase deploy --only hosting --project motoescuelapp` exitoso.

**Fase 1 cleanup prod ejecutada:**
- Eliminada cuenta Auth `523523532@ewrwdkd.com` (cuenta de prueba del Operador).
- Eliminados 2 progresos huérfanos: `leyda2012_gmail_com`, `yorfrank_prueba_com`.
- Eliminados 2 cursos legacy: `c1`, `c2` (inactivos).

**Caso Richard Vallenilla (desbloqueo en prod):**
- Síntoma: "PIN no coincide" + "correo vinculado a tu cuenta" al reintentar.
- Causa: cuenta Auth borrada manualmente por admin + progreso huérfano con `pin: ''` + regla Firestore bloqueaba sobrescribir.
- Fix: eliminado doc `progresoInscripcion/rvallenilla28_gmail_com`.
- Richard quedó desbloqueado para reinscribirse desde cero.

**Backups generados (todos en `/c/motoescuela-pro/backup/` y `/c/motoescuela-app/backup/`):**
- `notif-cleanup/notificaciones-*.json` (4265 dev, 3758 prod)
- `notif-dates/plan-*.json` (v1, 42 notifs)
- `notif-dates-v2/plan-*.json` (v2, 74 notifs)
- `pre-deploy-notif/*.backup-*` (4 archivos)
- `cleanup-fase1/fase1-*.json`

**Estado actual del proyecto:**
- **Dev:** fix notif + limpieza completados. Sin commitear.
- **Prod:** deployado con fix notif + limpieza + 5 acciones cleanup.
- **Firestore prod:** 332 notifs, 0 desfasadas, 0 sangrado.

**Pendientes registrados:**
1. **Fix raíz huérfanos `progresoInscripcion`** — regla Firestore bloquea sobrescribir cuando cambia `userId`. Requiere consulta a FIRE + MAMBA.
2. **Dropdown vacío en dev** — tras el fix de notif, el dropdown del admin en dev muestra "No tienes notificaciones" aunque Firestore tiene 225. Es un bug de render/contexto, no de datos. Pendiente diagnostico.
3. **Módulo Teórico Fase 3** — vista pública `/teorico`, panel estudiante, flujo de compra.
4. **Fix de dropdown: orden por fecha puro** — actualmente el sort prioriza NO leídas por encima de la fecha. Puede mostrar "Ayer no leídas" arriba de "Hoy leídas". Decisión: cambiar a sort puramente por fecha (pendiente OK del Operador).
5. **Commit + push a GitHub** — todos los cambios de la sesión en dev y prod sin commitear.

**Reglas de la sesión (recordatorio):**
- Backup antes de modificar archivos.
- Scripts con dry-run + `--apply` + backup JSON.
- `cat >>` para bitácora (nunca reemplazo).
- Comandos con `| clip` excepto los que cambian el estado del shell (cd, history, etc.).
- Usar comillas simples en `grep` con `!`.


---

### SESIÓN 02/10/2026 – Fix huérfanos progresoInscripcion (regla A6) + cierre caso Richard

**Contexto:**
Sesión de continuación tras el fix de notificaciones. El frente original era Módulo Teórico Fase 3, desviado por reporte urgente del Operador sobre Richard Vallenilla en prod.

**Bug resuelto: `[BUG-HUERFANO-PROGRESO]`**

**Síntoma:** usuario con cuenta Auth eliminada por admin no puede reinscribirse. Recibe "PIN no coincide".

**Causa raíz:**
- Regla `progresoInscripcion.update` exigía `resource.data.userId == request.auth.uid`.
- Cuando admin borra cuenta Auth, el `userId` del doc queda desincronizado.
- El `.catch(() => {})` en `InscripcionView.jsx` silenciaba el error `permission-denied`.

**Solución aplicada (regla A6 + OP-A):**

**Caja 1 — `firestore.rules`:**
```js
match /progresoInscripcion/{docId} {
  allow get: if true;
  allow list: if false;
  allow create: if isAuth() && request.resource.data.userId == request.auth.uid;
  // A6: adopción de docs huérfanos solo si correo coincide Y pin está vacío
  allow update: if isAuth() && (
    resource.data.userId == request.auth.uid ||
    (resource.data.correo == request.auth.token.email && resource.data.pin == '')
  );
  allow delete: if isAuth() && (
    resource.data.userId == request.auth.uid ||
    (resource.data.correo == request.auth.token.email && resource.data.pin == '')
  );
}
Caja 2 — ReservaService.js: log de adopción cuando userId cambia.

Caja 3 — InscripcionView.jsx: helper guardarProgresoConRetry (3 intentos 1s + 2s).

Cajas 4/5/6 — InscripcionView.jsx: aborto con toast en fallo de guardado (reemplaza .catch silencioso) en Pasos 1, 2, 3.

Caja 7 — revertida: el bloque de adopción dentro de already-enrolled no resolvía nada (retorna already-enrolled por construcción). A6 sola resuelve el bug.

Protección de datos:

201/219 docs sanos (pin != '') → protegidos 100%.

18/219 docs rotos (pin == '') → adoptables.

Riesgo residual: nulo (docs rotos no contienen PII del formulario completo).

Consultas FIRE + MAMBA:
3 rondas hasta confluencia 2/2:

V1: FIRE votó A2, MAMBA votó A2+A3 con email_verified.

V1.1: Detectado que el proyecto NO usa verificación de email → conflicto.

V1.2: Datos duros (201 sanos + 18 rotos) → ambos votaron A6.

V1.3: Detectado que OP-B rompe el fix del bootstrap → ambos confirmaron OP-A.

Tests ejecutados (dev):

✅ Flujo nuevo end-to-end sin errores.

✅ Refresh en Pasos 2, 3, 4 → mantiene (bootstrap intacto).

✅ Progreso abandonado con PIN válido → sesión recuperada.

✅ Doc huérfano (pin: '') → adoptado correctamente.

✅ Doc sano (pin: '228948') → bloqueado con toast.

Deploy a prod:

Reglas A6 publicadas: firebase deploy --only firestore:rules --project motoescuelapp.

Build: 11.86s, 65 entries.

Hosting: firebase deploy --only hosting --project motoescuelapp.

Commit 54369404 pusheado a origin/main.

Archivos modificados (dev + prod):

firestore.rules

src/modules/inscripcion/services/ReservaService.js

src/modules/inscripcion/views/InscripcionView.jsx

Backups:

Dev: backup/fix-huerfano/*.backup-20261001-221901

Prod: backup/fix-huerfano/*.backup-20261001-230457

Deuda técnica nueva registrada:

[DEUDA-DOCID-CORREO] correo sanitizado como docId es antipatrón NoSQL.

[DEUDA-TOAST-CRIPTICO] Missing or insufficient permissions se muestra crudo al usuario.

[DEUDA-RULES-WARNINGS] warnings de compilación en firestore.rules línea 15 + esLockCorrupto sin usar.

[DEUDA-SORT-NOTIF] sort de dropdown prioriza no-leídas sobre fecha.

[DEUDA-DROPDOWN-VACIO-DEV] dropdown vacío en dev (bug de render/contexto).

Pendiente inmediato próximo:

Verificar A6 en prod con flujo real (test no ejecutado en prod).

Módulo Teórico Fase 3 (frente original sin arrancar): vista /teorico, panel estudiante, flujo compra.

Sort de notificaciones por fecha (1 línea).

Depuración de warnings de firestore.rules.

Estado del proyecto al 02/10/2026:

Dev:

Fix notif completo (3 capas + limpieza 4265 → 225).

Migración de fechas de notificaciones (116 corregidas).

Fix A6 aplicado + tests positivos.

Build limpio.

Prod:

Deploy fix notif.

Deploy fix A6 (reglas + hosting).

Limpieza de notificaciones (3758 → 332).

Migración de fechas (116 corregidas).

Richard desbloqueado.

Fase 1 cleanup ejecutada.

Commits f3847e53 (notif) + 54369404 (A6).

Reglas de la sesión (reforzadas):

Antes de consultar a FIRE + MAMBA, recopilar TODOS los datos duros del código y entorno.

Nunca silenciar errores de escritura con .catch(() => {}).

En flujos multi-paso con persistencia: UI debe reflejar Firestore (aborto > desincronización silenciosa).

Comandos con | clip excepto los que cambian el estado del shell.

Cada cat >> con comillas simples en EOF para evitar expansión.


---

### SESIÓN 03/10/2026 – Fix SSOT tipoMoto packs + palabras prohibidas Aula + Bloque 1 Módulo Teórico

**Contexto:**
Sesión que cerró 3 frentes abiertos: (1) bug de tipoMoto en sub-reservas de pack, (2) palabras prohibidas en Aula Virtual, (3) Bloque 1 del Módulo Teórico (vista pública).

**Fix 1 — SSOT tipoMoto en packs:**

**Bug:** al comprar un pack (ej. "Pack Sincrónico"), el child de Equilibrio heredaba `tipoMoto: 'Sincrónica'` del pack, aunque el curso Equilibrio solo acepta Automática. Generaba moto incorrecta + proveedor incorrecto.

**Causa raíz (2 capas):**
- `InscripcionView.jsx:676`: `tipoMotoDerivado` se calculaba desde `cursoBasico.tiposMotoEscuela`, no desde el curso a agendar (`cursoEquilibrio`).
- `ReservaService.js` (`crearReservaPack` y `agendarSiguienteCursoPack`): copiaban `packData.tipoMoto` sin validar contra `cursoData.tiposMotoEscuela`.

**Fix:**
- `InscripcionView.jsx:680`: derivar `tipoMoto` desde `cursoEquilibrio.tiposMotoEscuela[0]` (SSOT).
- `ReservaService.js:405` y `:618`: blindaje backend con función anónima que valida contra `cursoData.tiposMotoEscuela`. Si es único, fuerza ese. Si hay varios, usa el que venga del frontend si está permitido. Si vacío, `null`.
- `AgendarPackView.jsx:196`: helper `tipoMotoEfectivo` con la misma lógica (defensa en profundidad).

**Verificación:** reserva post-fix con Equilibrio → `tipoMoto: 'Automática'`, moto `1782055081899`, proveedor correcto.

**Fix 2 — Palabras prohibidas Aula Virtual:**

**Cambios:**
- `ResumenFinal.jsx:46`: `"Curso Completado"` → `"Sesión Completada"`.
- `useSessionTimer.js:294`: `"Curso programado para..."` → `"Sesión programada para..."`.
- `useSessionTimer.js:296`: `"Curso vencido"` → `"Sesión vencida"`.
- `useSessionTimer.js:394`: `"Curso completado exitosamente"` → `"Sesión completada exitosamente"`.

**Fix 3 — Layout anti-desborde en ResumenFinal:**

**Bug:** las duraciones (`22 min`, `1 h 22 min`) desbordaban el contenedor en mobile. El nombre del módulo truncaba, pero la duración se salía del card.

**Fix:**
- `ResumenFinal.jsx`: fila de módulo con `gap-2`, nombre `text-sm truncate`, duración `text-xs` con `flex-shrink-0 whitespace-nowrap`.
- Bloque "Tiempo Total Invertido": `gap-3`, `flex-1 min-w-0` en el label, `flex-shrink-0 whitespace-nowrap` en el monto.

**Bloque 1 — Módulo Teórico (vista pública):**

**Creados:**
- `src/modules/public/views/TeoricoPublicoView.jsx` (~160 líneas): catálogo público `/teorico`, header con gradiente teal, grid de tarjetas, modal de detalle.
- `src/modules/public/components/ModalDetalleTeorico.jsx` (~130 líneas): modal con precio, duración de acceso, disclaimers, botón "Inscribirme" (toast informativo hasta Bloque 5).

**Modificados:**
- `App.jsx`: ruta `/teorico` con lazy loading.
- `HomeView.jsx`: rediseño del Home con grid 2 columnas para "Ver Sesiones" + "Aprende Online" (teal), botón Packs ancho completo, Chat + Mi Panel/Acceso compactos.

**Terminología legal:** "Módulo Formativo" (item), "Formación Educativa" (header), "Retos" (quizzes), "Sesión Completada" (formación finalizada).

**Deploy a prod:**
- 9 archivos copiados dev → prod.
- Build: 12.14s, 69 entries.
- `firebase deploy --only hosting --project motoescuelapp` → OK.
- Reglas Firestore sin cambios (diff exit 0).
- Commit `71dff8aa` + push a `origin/main`.

**Verificación visual prod:** Home rediseñado + `/teorico` funcional + Aula Virtual con "Sesión Completada" + sin desbordes.

**Pendientes próximos:**
1. Módulo Teórico Bloque 2 (panel estudiante tab "Formación").
2. Módulo Teórico Bloque 3 (vista de módulo con lecciones + retos).
3. Módulo Teórico Bloque 5 (flujo de compra).
4. Deuda: validar orden de cursos en packs (asume Equilibrio en posición 0).
5. Deuda: dropdown vacío en dev (bug de contexto).
6. Deuda: warnings de `firestore.rules` (línea 15 + esLockCorrupto).


---

### SESIÓN 07/10/2026 – Fix reservas 06/10 + migración masiva de módulos huérfanos

**Contexto:**
Apagón eléctrico del Operador impidió completar 3 reservas el 06/10. Además se
detectaron 12 reservas históricas con módulos huérfanos del pensum viejo.

**Fix reservas 06/10 (3 casos):**
- Lisbeth Aleman: `sesionTotalLimite` estaba en 240 (curso quedó mal configurado).
  Corregido a 120 + timers limpiados.
- Maikel Hernández: `sesionDiariaLimite` en 60 (por fecha2 huérfana). Corregido a 120
  + módulo "Dinámica de Inercia" completado + estadoCurso='Aprobado'.
- Olga García: 0 módulos, nunca inició. Marcados los 4 módulos del Refuerzo Práctico.

**Migración módulos huérfanos (12 reservas):**
- 90 módulos agregados con duraciones reales del curso.
- 19 huérfanos eliminados (módulos con nombres viejos tipo "Practicas de Equilibrio",
  "Coordinación Motora" sin "y Acelerador").
- Backup: `backup/fix-modulos-faltantes-v2/docs-2026-10-07T10-50-06-162Z.json`.

**Fix timer post-aprobación:**
- `useSessionTimer.js`: cuando `estadoCurso === 'Aprobado'`, el timer muestra 00
  en lugar de contar desde `sesionTotalInicio`.
- Deployado a prod.

---

### SESIÓN 09/10/2026 – Módulo Teórico Bloque 4 + Bloque 5 (Fases 1, 2, 5a, 5b)

**Contexto:**
Sesión maratón. Se completaron 4 fases del Módulo Teórico y se resolvió un bug
crítico de permisos que parecía misterioso.

**Bloque 4 — Vista de módulo individual:**
- `ProgresoTeoricoService.js` (nuevo): lee/escribe progreso en `logrosUsuario.stats`.
- `QuizRenderer.jsx` (nuevo): renderiza quiz con validación + puntaje.
- `TeoricoModuloView.jsx` (nuevo): vista individual con render por tipo (lección/video/quiz).
- Ruta `/teorico/:cursoId/modulo/:moduloId` en App.jsx.
- Navegación secuencial funcional.

**BUG CRÍTICO — Scope de match en Firestore Rules:**
- Síntoma: `logrosUsuario.read` fallaba con `permission-denied` solo para esa colección.
  `modulosTeoricos.read` (misma regla `isAuth()`) funcionaba.
- Hipótesis iniciales (fallidas): multi-tab persistence, cache corrupto, uid stale.
- **Causa real:** el `match /logrosUsuario/{uid}` estaba FUERA del bloque
  `match /artifacts/{appId}/public/data`. El código leía de
  `artifacts/.../data/logrosUsuario/{uid}` pero la regla cubría `/logrosUsuario/{uid}`.
  Default deny → permission-denied.
- **Fix:** mover el match dentro de `artifacts/{appId}/public/data`.
- **Lección:** cuando una regla falla para una colección específica mientras otras
  funcionan, **comparar la ubicación jerárquica del match**, no sospechar del SDK.

**Decisión arquitectónica — Modelo SSOT `usuarios/{uid}`:**
Consulta abierta a FIRE + MAMBA. Confluencia 2/2:
- Nueva colección `usuarios/{uid}` como SSOT de PII.
- `reservas`, `reservasPack`, `accesosTeoricos` mantienen snapshot histórico.
- Campo `capacidades` (booleans) + `contadores` para UI dinámica futura.
- Rol `estudiante` sin cambios (rename a `cliente` diferido).

**Fase 1 — SSOT (completada):**
- Regla Firestore `usuarios/{uid}` con `hasOnly` en create y update. cédula y correo
  inmutables por el cliente.
- `UsuarioService.js` (nuevo): `guardarPerfil` + `obtenerPerfil`.
- `AuthProvider.restoreUserRole`: lee `usuarios/{uid}` al montar sesión.
- `InscripcionView` + `InscripcionTeoricoView`: escriben perfil al completar Paso 1.
- **Fix bug del header "Estudiante / No registrado".**

**Fase 2 — Migración (completada en dev):**
- Script `migrar-usuarios.mjs`: recorre reservas + progresoInscripcion + accesosTeoricos.
- 155 usuarios migrados a `usuarios/{uid}` en dev.
- Backup: `backup/migracion-usuarios/plan-2026-10-09T23-40-05-048Z.json`.

**Fase 5a — Compra standalone (completada):**
- `AccesoTeoricoService.js` (nuevo): crear / obtener / aprobar / rechazar accesos.
- `InscripcionTeoricoView.jsx` (nuevo): orquestador que reutiliza Paso1DatosPersonales
  y Paso4Pago, con Paso2Teorico intermedio y salto de Paso3.
- `Paso2Teorico.jsx` (nuevo): resumen del módulo + precio.
- Modal `ModalDetalleTeorico`: "Inscribirme" → `/teorico/:cursoId/comprar` con
  `state: { esTeorico: true }`.

**Fase 5b — Admin aprueba teóricos (completada):**
- `AdminAccesoTeoricoDetalle.jsx` (nuevo): detalle + aprobar/rechazar/cancelar.
- `useAdminReservas`: 3er listener para `accesosTeoricos`.
- `AdminReservasHome`: sección "Accesos Teóricos (N)".
- Ruta `/admin/acceso-teorico/:accesoId`.
- Batch atómico verificado: acceso + capacidad + contador + notificación.

**Cierre experiencia estudiante:**
- `VistaFormacion.jsx`: `handleProximamente` reemplazado por `handleAbrirModulo`
  que navega a `/teorico/:cursoId`.
- `EstudiantePanel`: agregado mapeo de `?tab=formacion` desde URL.
- `TeoricoCursoView` + `TeoricoModuloView`: botón atrás dinámico (estudiante → panel,
  anónimo → catálogo).

**Archivos nuevos (10):**
- `src/modules/public/services/AccesoTeoricoService.js`
- `src/modules/public/services/ProgresoTeoricoService.js`
- `src/modules/public/components/QuizRenderer.jsx`
- `src/modules/public/views/TeoricoComprarView.jsx` (obsoleto, reemplazado por InscripcionTeoricoView)
- `src/modules/public/views/TeoricoModuloView.jsx`
- `src/modules/public/views/TeoricoCursoView.jsx`
- `src/modules/estudiante/components/VistaFormacion.jsx`
- `src/modules/inscripcion/components/Paso2Teorico.jsx`
- `src/modules/inscripcion/views/InscripcionTeoricoView.jsx`
- `src/modules/shared/services/UsuarioService.js`
- `src/modules/admin/components/AdminAccesoTeoricoDetalle.jsx`

**Fases pendientes del Bloque 5:**
- **5c:** Packs comerciales incluyen teóricos. Consulta a FIRE completada. MAMBA
  respondió consulta anterior por error, re-consulta pendiente.
- **5d:** Contabilidad (movimiento contable al aprobar acceso teórico).

**Reglas Firestore actuales en prod:**
- `usuarios/{uid}`: NO deployada aún a prod.
- `accesosTeoricos`: ya estaba (creada en sesión previa).
- Scope `logrosUsuario`: el fix está en local, falta deploy a prod.

**Estado de deploy:**
- **Dev:** todo aplicado y verificado. Sin deployar a prod hasta cerrar el bloque.
- **Prod:** última versión del 08/10. Sin Fase 1+2+5b.
- **Regla de sesión:** "no se sube nada a prod hasta que esté completo."


### SESIÓN 10/10/2026 – Bloque 5 completo + Fases 1-4 + Deploy PROD

**Estado del proyecto al cierre:**
- Dev (`/c/motoescuela-app`): todo aplicado y verificado.
- Prod (`/c/motoescuelapp.web.app`): deployado el mismo día.
- Reglas Firestore sincronizadas dev/prod.
- 357 usuarios en SSOT prod, 159 en dev.
- Métricas reconciliadas en ambos entornos.

**Lo que se cerró:**

1. **Fase 5c** — Packs incluyen teóricos. Batch post-transacción crea accesos con `accesosTeoricosCreados` en maestra (idempotente).
2. **Fase 5d** — Movimiento contable al aprobar acceso standalone. ID determinístico `mov_acc_{accesoId}`.
3. **SSOT usuarios/{uid}** — 351 usuarios en prod migrados + 159 en dev. AuthProvider lee perfil completo.
4. **Métricas** — Schema `metricas.totales` + `metricas.porServicio` con 8 estados. 12 flujos instrumentados con `increment()`.
5. **Fase 4** — Tabs dinámicos: `inicio | servicios | historial | perfil`. Hub dinámico (VistaInicio), grid servicios (VistaServicios), timeline (VistaHistorial), compra de packs (VistaPacks).
6. **Compra de pack desde panel** — Flujo completo: pack → /inscripcion con esPack → Paso 2 con datos del SSOT → portal directo.
7. **Fixes:** notif estudiante (índice), paywall, input corrección, colores VistaServicios, onBack pack, card morada sin F5.

**Scripts disponibles:**
- `migrar-usuarios.mjs --sa=<path>` (acepta prod)
- `migrar-metricas-dev.mjs --sa=<path>` (acepta prod)
- `reconciliar-metricas-dev.mjs --sa=<path>` (acepta prod)

**Flujo de trabajo nuevo (a partir de esta sesión):**
- Git Bash siempre en `/c/motoescuela-app`.
- Solo cambiar a `/c/motoescuela-pro` para deploy (2 min al final).
- Antes de cada deploy: `diff -rq` para verificar 0 diferencias.

**Pendientes próximas sesiones:**
- Reordenamiento formal del flujo (documentar en INSTRUCCIONES_A_LA_IA.md).
- Panel de usuarios en admin (`/admin/usuarios`) con botón "Recalcular métricas".
- Purga de contadores legacy.
- Fix notifs viejas que no se borran al rechazar/cancelar.


---

### SESIÓN 11/10/2026 – Rearquitectura de métricas + fixes varios

**Estado del proyecto al cierre:**
- Dev (`/c/motoescuela-app`): todo aplicado y verificado end-to-end.
- Prod (`motoescuelapp.web.app`): SIN cambios desde el 10/10. No se deployó nada hoy (decisión del Operador: no subir hasta estar 100% seguros).
- Reglas Firestore: sin cambios.

**Rearquitectura de métricas (ALT-B):**
- Nuevo hook: `src/hooks/useMetricasUsuario.js` — calcula en vivo desde reservas + accesos + packs.
- Firma: `useMetricasUsuario(uid, triggerInvalidacion)` donde el trigger es `ctx.user.data.updatedAt`.
- Caché: `useRef` con TTL 60s, invalidado por `triggerInvalidacion`.
- Consumidores: `EstudiantePanel`, `VistaInicio`, `VistaServicios`.

**Eliminado:**
- `MetricasService.js` (borrado del repo).
- 16 puntos de escritura de `metricas.*` (en AdminReservaDetalle, ReservaService, AccesoTeoricoService, useSessionTimer).
- `contadores.accesosTeoricosActivos` (split-brain con SSOT).
- `contadores.reservasActivas` / `contadores.reservasCompletadas` (nunca usados).

**Mantenido:**
- `capacidades.modulosTeoricos: true` (ABAC booleano).
- `capacidades.sesionesPracticas` (no usado pero no rompe).

**`updatedAt` agregado a 8 batches (trigger de invalidación):**
1. `AdminReservaDetalle.aprobarPago`
2. `AdminReservaDetalle.rechazarPago/cancelar`
3. `AdminReservaDetalle.rechazarPago/rechazar`
4. `ReservaService.aprobarReservaPack`
5. `ReservaService.rechazarReservaPack`
6. `ReservaService.cancelarReservaPack`
7. `ReservaService.corregirReferenciaPago` (rama pack_sub)
8. `ReservaService.corregirReferenciaPago` (rama individual)

**Fix flujo teórico logueado:**
- `InscripcionTeoricoView.jsx`:
  - `if (ctx.fbUser && !pinParaMostrar)` → toast info + redirect a `/portal-reservas?tab=servicios`.
  - `ctx.setUser` condicionado a `!ctx.fbUser` (evita sobreescritura).
  - Botones de pantalla de éxito: "Ir a mi panel" + "Ver el catálogo".
  - Mensaje naranja "Estado: Pendiente de validación".

**Otros fixes de la sesión:**
- Freno backend de pack de sesiones activo (`crearReservaPack`).
- VistaPacks (compra desde panel).
- Notificación `pack_cancelado`.
- onBack de PackDetalle con `state.from`.
- Badges numéricos en DashboardFooter.
- Colores verde/naranja en VistaServicios.
- Rediseño de Inicio.

**Archivos clave nuevos:**
- `src/hooks/useMetricasUsuario.js`
- `src/modules/estudiante/components/VistaPacks.jsx` (creado en sesión previa, ajustado hoy)

**Deudas nuevas registradas:**
- `[DEUDA-TRIGGER-INSTRUCTOR]`
- `[DEUDA-FLUJO-INSCRIPCION-SERVICE]`
- `[DEUDA-DOBLE-TOAST-CORRECCION]`
- `[DEUDA-BLOQUEOS-CAMBIAR-HORARIO]`
- `[DEUDA-TYPO-PINF]`
- `[DEUDA-FOUC-PASO2]`

**Reglas de proceso reforzadas hoy:**
- Toda modificación de código pasa por FIRE + MAMBA primero.
- No refactorizar mientras hay bugs abiertos.
- Exigir dictamen individual verificable antes de firmar confluencia.
- Antes de dar Ctrl+H, verificar con `grep -n` el texto EXACTO del archivo.
- Cada Ctrl+H → guardar → verificar con `grep` → siguiente.
- Backup obligatorio antes de tocar cualquier archivo.

**Pendientes próximas sesiones:**
- Deploy de TODO lo trabajado en dev a prod (cuando el Operador dé OK).
- Bloque 2 de tests E2E (Packs completos).
- Bloque 3 de tests E2E (Teóricos completos).
- Cerrar deuda de doble toast en corrección de referencia.


---

### SESIÓN 12/10/2026 – Triple fix: bootstrap race condition + default moto pack + pack residual v2

**Estado del proyecto al cierre:**
- Dev (`/c/motoescuela-app`): 3 bloques aplicados y validados con pruebas funcionales.
- Prod: sin cambios desde el 10/10. Pendiente deploy del batch completo.
- Reglas Firestore: sin cambios.

**Contexto — causa raíz del bug más grave de la sesión:**
El bootstrap de `InscripcionView.jsx` tenía `useEffect` con deps `[]` y marcaba `bootstrapEjecutado.current = true` ANTES de validar `ctx.authReady`. Si el componente montaba antes de que Firebase restaurara la sesión (caso normal), FASE 2 abortaba con `return` y el ref quedaba sellado → el bootstrap nunca volvía a correr. Resultado: usuarios que abandonaban inscripción y cerraban el navegador quedaban bloqueados en Paso 1 sin poder avanzar. Debían hacer logout manual.

**Cambios aplicados (3 bloques):**

**Bloque A — Bootstrap ALT-E (4 Ctrl+H en `InscripcionView.jsx`):**
1. Quitar marca temprana de `bootstrapEjecutado.current` antes de `bootstrap()`.
2. Agregar marca dentro de FASE 1 (origen público).
3. Dividir guardia de FASE 2: `if (!authReady) return;` (sin marcar) → `bootstrapEjecutado.current = true;` → `if (!fbUser) return;`.
4. Deps del `useEffect`: `[]` → `[ctx.authReady, ctx.fbUser?.uid]`.

**Bloque B — Default moto pack (2 Ctrl+H en `InscripcionView.jsx`):**
1. IIFE condicional en el `useEffect` de pack que inicializa `traeMotoPorCurso` con `'No'` para cada curso preguntable (solo si el mapa está vacío).
2. Freno táctico en `handleNext` Paso 2: validar que cada curso preguntable tenga valor explícito antes de avanzar (defensa en profundidad).

**Bloque C — FIX-PACK-FLAG-RESIDUAL v2 (3 Ctrl+H, 2 en `InscripcionView.jsx`, 1 en `HomeView.jsx`):**
1. Eliminar `performance.getEntriesByType('navigation')` (causa raíz del bug de SPA).
2. ALT-E: limpiar si `location.state.esPack !== true` (intención explícita NO-pack).
3. TTL numérico 4h: limpiar si `Date.now() - ts > 4h`.
4. Guardar `inscripcion_pack_ts` con `Date.now().toString()` al entrar con state de pack.
5. `HomeView.jsx`: botón "Inscribirse" pasa `state: { esPack: false, origen: 'publico' }`.

**Consultas FIRE + MAMBA — confluencia 2/2 en los 3 bloques:**
- Bug 1: ALT-E adoptado. 3 divergencias resueltas por el Arquitecto (isMounted ✅, bloque invitado FASE 6 ❌, spinner adicional ❌).
- Bug 2: Opción C+D combinadas. IIFE condicional + freno táctico.
- Bug 3: ALT-E + TTL numérico 4h. FIRE v3 rechazó `toDateString()` por Cinderella Bug. Adoptado timestamp numérico.

**Pruebas funcionales ejecutadas:**
- ✅ Bootstrap fix: abandona → cierra → reabre → restaura en Paso 2 con datos.
- ✅ F5 en Paso 2: mantiene datos y selecciones.
- ✅ Origen público: Paso 1 con curso preseleccionado.
- ✅ Usuario con reserva: redirige a `/portal-reservas` con toast.
- ✅ Pack normal: botón "Uso Moto App" con borde azul por defecto.
- ✅ Pack residual Test A: viejo (5h) + URL directa → flags limpiados.
- ✅ Pack residual Test B: fresco (0s) + URL directa → flags preservados.
- ✅ Pack residual Test C: fresco + botón "Inscribirse" → ALT-E limpia.

**Archivos modificados:**
- `src/modules/inscripcion/views/InscripcionView.jsx`
- `src/modules/home/views/HomeView.jsx`

**Backups:**
- `backup/batch-fixes-pack/InscripcionView.jsx.backup-20261012-113022`
- `backup/batch-fixes-pack/HomeView.jsx.backup-20261012-150620`
- Y los 4 del batch (EstudiantePanel, PackDetalleEstudiante, Paso2Pack, VistaServicios).

**Reglas de oro nuevas:**
- `performance.getEntriesByType('navigation')` es antipatrón en SPA.
- `Date.toDateString()` para TTL tiene Cinderella Bug (race a medianoche).
- En `useEffect` async con readiness, mover guard DESPUÉS de validar readiness y agregar deps de readiness.
- Después de HMR de Vite, hacer test en pestaña limpia antes de diagnosticar bugs.

**Pendiente próxima sesión:**
- Fases 4-5 del batch original (reactividad de packs) — del fragmento previo sin cerrar.
- Deploy a prod del batch completo (cuando el Operador dé OK).
- Trazabilidad: commit + push a GitHub.

---

### SESIÓN 12/10/2026 (2da parte) – Tanda 1 completa

**Estado del proyecto al cierre:**
- Dev: 5 bloques aplicados + Tanda 1 (corrección unificada) completa.
- Prod: sin cambios desde el 10/10.
- Reglas Firestore: sin cambios en Tanda 1.
- Build: verde.

**Bloques aplicados hoy:**

**A) Bootstrap race condition** (`InscripcionView.jsx`):
- ALT-E. FASE 1 sella, FASE 2 divide guardia, deps con authReady.
- 4 Ctrl+H.

**B) Default moto pack** (`InscripcionView.jsx`):
- IIFE de inicialización + freno táctico.
- 2 Ctrl+H.

**C) Pack residual v2** (`InscripcionView.jsx` + `HomeView.jsx`):
- ALT-E + TTL 4h numérico.
- 3 Ctrl+H.

**D) Precio legacy** (`fix-reserva-legacy.mjs`):
- Migrada reserva JTSmHvUEH3iHd9ryMALR con `precio: 35`.
- 21 reservas legacy pendientes (deuda).

**E) Reactividad packs** (`EstudiantePanel.jsx` + `PackDetalleEstudiante.jsx`):
- Trigger SSOT con guard + onSnapshot maestra/child.
- 5 Ctrl+H.

**F) Tanda 1 — Corrección unificada de pagos:**

**Archivos nuevos (5):**
- `src/constants/servicios.js`
- `src/modules/shared/services/CorreccionPagoService.js`
- `src/modules/shared/components/CorreccionReferencia.jsx`
- `src/modules/shared/components/ModalMotivoRechazo.jsx`
- `src/modules/shared/views/CorregirPagoView.jsx`

**Archivos modificados (5):**
- `src/App.jsx` (ruta)
- `src/modules/admin/components/AdminReservaDetalle.jsx` (modal motivo)
- `src/modules/admin/components/AdminPackDetalle.jsx` (modal motivo)
- `src/modules/inscripcion/services/ReservaService.js` (motivo)
- `src/modules/estudiante/views/EstudiantePanel.jsx` (CTA + fuera inline)
- `src/modules/estudiante/views/PackDetalleEstudiante.jsx` (redirect)
- `src/modules/estudiante/components/VistaServicios.jsx` (banner + colores)

**Consultas FIRE + MAMBA:**
- `CORRECCION-PAGOS-UNIFICADA-V1`: diseño de la página universal.
- `ACCESOS-TEORICOS-RECHAZO-REVISION-V1`: cómo manejar `motivoRechazo`.
- `ACCESOS-TEORICOS-RECHAZO-REVISION-V2-DESEMPATES`: validación de resoluciones.
- Confluencia 2/2 o 3/3 en todas las decisiones.

**Flujo validado E2E:**
- Rechazo de pack → corrección → aprobación ✅
- Rechazo de reserva individual → corrección → pendiente ✅
- Límite de 3 intentos bloquea ✅
- Banner + colores en VistaServicios ✅
- Redirect automático `/mi-pack/:id` cuando Rechazado ✅

**Backups generados:**
- `backup/corregir-pago-unificado/` (8 archivos).
- `backup/fix-reserva-legacy/` (2 archivos).
- `backup/batch-fixes-pack/` (5 archivos).

**Deuda nueva registrada en BACKLOG:**
- `[DEUDA-PRECIO-LEGACY-DEV]` – 21 reservas pendientes.
- `[DEUDA-PRECIO-LEGACY-PROD]` – auditoría pendiente.
- `[DEUDA-TANDA-2-TEORICOS]` – refactor de accesos teóricos.
- `[DEUDA-COMMIT-GIT]` – working tree acumulado.

**Pendiente próxima sesión:**
1. Tanda 2 (accesos teóricos) — regla Firestore + refactor service + UI.
2. Commit + push consolidado.
3. Auditoría de PROD para reservas legacy sin precio.
4. Deploy a prod del batch completo (cuando el Operador dé OK).

**Reglas de oro aprendidas hoy:**
- `performance.getEntriesByType` prohibido en lógica de flujo.
- En `useEffect` con readiness, mover guard DESPUÉS de validar readiness.
- `Date.toDateString()` para TTL tiene Cinderella Bug. Usar `Date.now()` + numérico.
- Flujos multi-servicio → facade con contrato unificado.
- Cambios grandes (8+ archivos) → fase por fase con build entre cada una.

---

### SESIÓN 12/10/2026 (3ra parte) – Tanda 2 completa: Refactor de accesos teóricos

**Estado del proyecto al cierre:**
- Dev: Tanda 1 completa + Tanda 2 completa.
- Prod: sin cambios desde el 10/10.
- Reglas Firestore: Tanda 2 deployada.
- Build: verde tras cada fase.

**Objetivo de Tanda 2:**
Unificar el flujo de corrección de pagos para `accesosTeoricos`, alineado con reservas y packs.

**Cambios aplicados (T2.0 a T2.7 + 5 fixes):**

**T2.0 — Eliminación de código muerto:**
- `src/modules/public/views/TeoricoComprarView.jsx` eliminado.
- Backup en `backup/tanda2-teoricos/`.

**T2.1 — `rechazarAcceso` refactor:**
- `'Pendiente'` → `'Rechazado'` (alineado con reservas/packs).
- Read-then-write para `intentosCorreccion` + `historialRechazos[]`.
- `'cancelar'` NO incrementa intentos.

**T2.2 — Nuevo `corregirReferenciaPago`:**
- Transición validada: `'Rechazado' → 'Pendiente'`.
- Freno táctico `intentos < 3`.
- Estudiante nunca toca `motivoRechazo` ni `historialRechazos`.

**T2.3 — `crearAcceso` ampliado:**
- `intentosCorreccion: 0` + `historialRechazos: []`.
- Pre-check suma `'Rechazado'`.

**T2.4 — Modal en `AdminAccesoTeoricoDetalle`:**
- Reemplaza `window.prompt` por `ModalMotivoRechazo`.

**T2.5 — Facade `CorreccionPagoService`:**
- Comentario actualizado (ya no dice "rechazarAcceso deja en Pendiente").

**T2.6 — `VistaFormacion` con CTA:**
- Banner rojo "Pago rechazado" + botón "Corregir pago".

**T2.7 — Regla Firestore:**
- Deployada en `motoescuela-dev`.
- `allow update` dividida en 2 ramas OR.
- Rama de corrección con transición + freno táctico `intentosCorreccion < 3`.

**Fixes post-test (5):**

**Fix 1 — `useMetricasUsuario.js`:**
- Detección legacy con `sinHistorial` (`historialRechazos` vacío).

**Fix 2 — `AdminAccesoTeoricoDetalle.jsx`:**
- Banner de intentos (naranja 1-2, rojo 3+).
- Botón "Rechazar (corregir)" oculto si ya rechazado o agotado.

**Fix 3 — Detección legacy en 3 archivos:**
- `useMetricasUsuario.js`, `VistaFormacion.jsx`, `CorreccionPagoService.js`.
- Solo legacy si `historialRechazos` está vacío.

**Fix 4 — `AdminReservasHome.jsx`:**
- Card admin visible para `estadoPago: 'Rechazado'`.
- Badge RECH + título rojo dinámico.

**Fix 5 — Trigger SSOT en `AccesoTeoricoService`:**
- `rechazarAcceso` + `corregirReferenciaPago` escriben `usuarios/{uid}.updatedAt`.
- Invalida cache de métricas sin esperar TTL 60s.

**Archivos modificados (7):**
- `src/hooks/useMetricasUsuario.js`
- `src/modules/admin/components/AdminAccesoTeoricoDetalle.jsx`
- `src/modules/admin/components/AdminReservasHome.jsx`
- `src/modules/estudiante/components/VistaFormacion.jsx`
- `src/modules/public/services/AccesoTeoricoService.js`
- `src/modules/shared/services/CorreccionPagoService.js`
- `firestore.rules`

**Archivos eliminados (1):**
- `src/modules/public/views/TeoricoComprarView.jsx`

**Testing E2E:**
- Rechazo de acceso teórico → banner rojo en VistaFormacion.
- Corrección → `'Rechazado' → 'Pendiente'`.
- Aprobación → acceso en "Mis Módulos Formativos".
- Cambio de estado desde admin → card del estudiante se actualiza sin F5.

**Backups generados:**
- `backup/tanda2-teoricos/TeoricoComprarView.jsx.backup-20261012-211924`
- `backup/tanda2-teoricos/firestore.rules.backup-20261012-213009`
- `backup/tanda2-teoricos/acceso-Ya4BLbE8PNK8n7uG8IQ8-*.json`

**Deuda nueva registrada en BACKLOG:**
- `[DEUDA-COMMIT-GIT]` — working tree acumulado.
- `[DEUDA-PRECIO-LEGACY-DEV]` — 21 reservas sin precio.
- `[DEUDA-PRECIO-LEGACY-PROD]` — auditoría pendiente.
- `[DEUDA-DEPLOY-PROD]` — batch completo pendiente.

**Reglas de oro aprendidas en Tanda 2:**
- Al unificar flujos multi-servicio, auditar el servicio menos desarrollado.
- Los estados en Firestore deben ser consistentes entre colecciones hermanas.
- Discriminar legacy por presencia de campos nuevos (`historialRechazos[]`).
- El trigger SSOT (`usuarios/{uid}.updatedAt`) debe actualizarse desde TODOS los métodos que mutan servicios relacionados.

**Pendiente próxima sesión:**
1. Commit + push a GitHub.
2. Auditoría de PROD.
3. Deploy a prod del batch completo.

---

### SESIÓN 13/10/2026 – SSOT de bloqueos + LOCK-INVALIDATION-SSOT-V1

**Estado del proyecto al cierre:**
- Dev: SSOT de bloqueos completo + LOCK-INVALIDATION cerrado.
- Prod: sin cambios desde el 10/10.
- Reglas Firestore: sin cambios en esta sesión.
- Build: verde tras cada fase.

**Bloque A — SSOT de bloqueos (7 fases):**

**Archivos nuevos (2):**
- `src/modules/shared/utils/bloqueosHelpers.js` (helper puro, 3 funciones).
- `src/hooks/useBloqueosAdmin.js` (hook SSOT con `getDocs` puntual).

**Archivos migrados (4):**
- `src/modules/admin/components/CambiarHorarioModal.jsx` (fix urgente + migración).
- `src/modules/inscripcion/views/InscripcionView.jsx` (migración + eliminación de código inline).
- `src/modules/estudiante/views/AgendarPackView.jsx` (migración).
- `src/modules/inscripcion/hooks/useDisponibilidadPack.js` (migración).

**Incidente corregido:**
- El hook `useBloqueosAdmin.js` apuntaba a la ruta incorrecta
  (`artifacts/{appId}/public/data/bloqueosAdmin`).
- La colección real está en la RAÍZ (`collection(db, 'bloqueosAdmin')`).
- Fix: `const COLL = 'bloqueosAdmin';`

**Testing:**
- `CambiarHorarioModal`: bloqueo respetado en el dropdown.
- `AgendarPackView`: bloqueo respetado en `/mi-pack/:id/agendar`.
- `InscripcionView`: pendiente prueba en flujo normal (implícito).

**Bloque B — LOCK-INVALIDATION-SSOT-V1:**

**Bug:** cambio de `traeMoto`/`tipoMoto`/`sedeId`/`cursoId`/`packId` no
invalidaba el lock activo.

**Fix aprobado por FIRE + MAMBA (confluencia 2/2 tras desempates):**
- Snapshot en `sessionStorage` (SOLO inputs, no outputs).
- `useEffect` de invalidación al volver a Paso 3.
- Revalidación defensiva (ALT-D) en `handleSelectHorario`.
- Serialización ordenada de `traeMotoPorCurso`.
- Guard `step !== '4'`.
- Telemetría diferenciada: `console.info` (useEffect) + `console.warn` (defensa).
- Limpieza en `limpiarSesion` (SSOT) + `handleBack`.

**Archivos modificados (2):**
- `src/modules/inscripcion/views/InscripcionView.jsx` (6 Ctrl+H).
- `src/modules/inscripcion/hooks/useInscripcionState.js` (1 Ctrl+H).

**Testing:** 4 escenarios positivos (Sí→No, No→Sí, tipoMoto, F5 Paso 4).

**Backups generados:**
- `backup/ssot-bloqueos/CambiarHorarioModal.jsx.backup-20261013-080720`
- `backup/ssot-bloqueos/InscripcionView.jsx.backup-20261013-080720`
- `backup/ssot-bloqueos/AgendarPackView.jsx.backup-20261013-080720`
- `backup/ssot-bloqueos/useDisponibilidadPack.js.backup-20261013-080720`

**Consultas FIRE + MAMBA:**
- `BLOQUEOS-SSOT-UNIFICADO-V1`: diseño de SSOT.
- `LOCK-INVALIDATION-SSOT-V1`: diseño del snapshot.
- `LOCK-INVALIDATION-SSOT-V1-DESEMPATES`: validación de resoluciones.
- Confluencia 2/2 en todos.

**Reglas de oro aprendidas:**
- Cuando una lógica se copia 3+ veces → extraer a helper.
- En flujos multi-paso, capturar snapshot del contexto con solo los INPUTS.
- Serializar maps con claves ordenadas antes de comparar strings.
- Guard `step !== 'N'` en el punto de no retorno transaccional.
- Telemetría diferenciada: `info` para esperado, `warn` para anomalías.
- Al agregar un campo nuevo a un flujo multi-paso, revisar si va al snapshot.

**Deuda pendiente (del arranque anterior + nuevas):**
- `[DEUDA-COMMIT-GIT]`
- `[DEUDA-PRECIO-LEGACY-DEV]`
- `[DEUDA-PRECIO-LEGACY-PROD]`
- `[DEUDA-DEPLOY-PROD]`
- `[DEUDA-TRIGGER-INSTRUCTOR]`
- `[DEUDA-DOBLE-TOAST-CORRECCION]`
- `[DEUDA-FLUJO-INSCRIPCION-SERVICE]`
- Deudas menores (dropdown vacío dev, sort notif, rules warnings, etc.)

**Pendiente próxima sesión:**
1. Commit + push a GitHub (consolidar 2 sesiones).
2. Auditoría de PROD (precio legacy).
3. Deploy a prod del batch completo.
4. Retomar deudas menores según prioridad.

---

### SESIÓN 13/10/2026 (2da parte) – SSOT bloqueos + LOCK-INVALIDATION + PACK-SEDE-POR-SESION

**Estado del proyecto al cierre:**
- Dev: 3 features completas, testeadas, build verde.
- Prod: pendiente deploy del batch acumulado (10/10 + 12/10 + 13/10).
- Reglas Firestore dev: actualizadas (Tanda 2 + PACK-SEDE-POR-SESION).
- Reglas Firestore prod: pendiente sincronización.

**Bloque A — SSOT de bloqueos:**

**Archivos nuevos (2):**
- `src/modules/shared/utils/bloqueosHelpers.js`
- `src/hooks/useBloqueosAdmin.js`

**Archivos migrados (4):**
- `CambiarHorarioModal.jsx`
- `InscripcionView.jsx`
- `AgendarPackView.jsx`
- `useDisponibilidadPack.js`

**Incidente:** hook apuntaba a ruta incorrecta (`artifacts/.../bloqueosAdmin`).
Fix: `const COLL = 'bloqueosAdmin';`.

**Bloque B — LOCK-INVALIDATION-SSOT-V1:**

**Archivos modificados (2):**
- `InscripcionView.jsx` (6 Ctrl+H)
- `useInscripcionState.js` (1 Ctrl+H, agregado en limpiarSesion)

**Fix:** snapshot + useEffect + ALT-D + telemetría + limpieza SSOT.

**Bloque C — PACK-SEDE-POR-SESION:**

**Archivos modificados (3):**
- `ReservaService.js` (denormalizar + validar intersección)
- `firestore.rules` (regla de validación de sede)
- `AgendarPackView.jsx` (selector + auto-fallback + invalidación + auto-jump)
- `FormPack.jsx` (validación de intersección en admin)

**Backups:**
- `backup/ssot-bloqueos/` (4 archivos)
- `backup/pack-sede-por-sesion/` (3 archivos + 1 maestra JSON)
- `backup/tanda2-teoricos/` (varios de sesión previa)

**Testing E2E positivo:**
- Cambiar sede → lock liberado + toast.
- Auto-fallback → salta a sede válida si default no aplica.
- Auto-jump → salta a primera fecha disponible.
- Regla Firestore deployada sin warnings nuevos.
- No regresión en packs con 1 sola sede.

**Reglas de oro aprendidas (nuevas):**
- Snapshot en sessionStorage para flujos multi-paso.
- Intersección de conjuntos para restricciones duales.
- Denormalización en maestra (no en child) para reglas Firestore.
- Los componentes variantes deben auditarse contra el patrón SSOT del original.
- Al agregar campo nuevo a flujo multi-paso, revisar si va al snapshot.

**Pendiente próxima sesión:**
1. Commit + push a GitHub.
2. Deploy a prod (frontend + reglas).
3. Auditoría de precio legacy en prod.
4. Deudas menores.

---

### SESIÓN 12/11/2026 – Cierre de rediseño de Ocupación y Homologación de Sedes

**Estado del proyecto al cierre:**
- Dev: Actualizado y verificado.
- Prod: Deployado y funcionando (build 2675.61 KiB).
- Reglas Firestore: Sin cambios en esta sesión.

**Herramientas nuevas creadas:**
- `src/hooks/useOcupacionPorRango.js`: Hook para carga de reservas por rango de fechas (D1 + D2).
- `src/modules/admin/utils/ocupacionHelpers.js`: Cerebro para cálculo de cupos (instructores y motos).
- `src/modules/shared/utils/sedesHelpers.js`: Helper `formatearSede(sede)` para mostrar Ciudad - Dirección.

**Fixes importantes:**
- `AdminOcupacion.jsx` rediseñado (filtros, semáforo de 4 estados, modal de detalle, estado `parcial_bloqueado`).
- Homologación de `formatearSede` en 15 archivos (Admin, Instructor, Proveedor, Estudiante, Aula).
- `InstructorPanel.jsx`: Corregido el paso de `sede` (objeto) al `ModalDetalleReserva`.
- `ProveedorActividad.jsx`: Corregida la hora de D2 usando `getHoraIdOcupacion`.
- Intercambio de tutores (Emanuel/Jesus) y reparación de reserva huérfana (Jesseira) mediante scripts con backup automático.

**Deudas prioritarias:**
- `B-LOOP-FECHAS-PASO3` (Brinco en paso 3 de inscripción).
- `B-FIX-APROBAR-USUARIO-FALTANTE` (Error de doc faltante al aprobar pago).
- `B-ESTADO-NO-ASISTIO` (Nuevo estado de inasistencia).
- `B-RESERVA-SIN-DATOS-LEGACY` (Defensa en creación de packs).

### SESIÓN 12/11/2026 (Parte 2) – Auditoría y cierre de reservas incompletas

**Estado del proyecto al cierre:**
- Dev: Actualizado.
- Prod: Los datos de las 7 reservas fueron corregidos en Firestore.
- **Alerta:** Estado `"Ausente"` introducido pero no mapeado en UI.

**Cambios de datos aplicados en PROD:**
- `YsRy5t7TrnqoXdVLkcF3`, `0med7do2iQanCoCMxuBr`, `jWZwc0TP0vvxbM21XTaJ` -> `estadoCurso: 'Aprobado'`.
- `nPDK0r7FiYADPBCdFrfh`, `aXPg0AivARSRDvePHnia` -> `horasPendientes: 1`.
- `oigWRcdViXY4qORcRyOH`, `oB5NxJJ5QByleK7g4Xkq` -> `estadoCurso: 'Ausente'`.

**Deuda prioritaria:**
- `B-ESTADO-AUSENTE` (Mapear `"Ausente"` en UI).
- `B-HORAS-PENDIENTES-UI` (Mostrar el saldo de horas pendientes).

### SESIÓN 12/11/2026 (Parte 3) – Fase 0: Rediseño de reprogramación y recargos

**Estado del proyecto al cierre:**
- **Fase 0 (Documentación) completada.** Toda la lógica de negocio para el nuevo flujo de reprogramación con recargos está documentada en `BACKLOG_V2.md`.
- **Freno Táctico activo.** No se ha tocado código. El diseño espera confluencia de FIRE + MAMBA.
- **Estado "Ausente"** introducido en Firestore para Raquelis y Franchesca, pero aún no mapeado en la UI.

**Próximos pasos sugeridos:**
1. Ejecutar la consulta `RECARGO-REPROGRAMACION-TARDIA-V1` con FIRE y MAMBA.
2. Iniciar Fase 1 (Modelo de datos) con confluencia 3/3.
3. Mapear el estado "Ausente" en la UI (Fase 2 del rediseño anterior).
4. Implementar el estado "Vencida" (Fase 1.5 del nuevo rediseño).

**Contexto de la Fase 0:**
- El modelo actual solo tiene `estadoCurso` por reserva. Los cursos de 2 días necesitan `asistenciaD1` y `asistenciaD2`.
- La reprogramación con recargo debe reutilizar el `Paso4Pago.jsx`.
- La configuración de recargos por curso va en el admin (similar a `comisionProveedor`).
- Los T&C deben estar accesibles desde el panel del estudiante en todo momento.

---

### SESIÓN 12/11/2026 – Sesión maratón: rediseño ocupación, homologación sedes, reservas incompletas

**Estado del proyecto al cierre:**
- **Dev:** todo aplicado y verificado.
- **Prod:** 4 deploys exitosos (build 2674-2675 KiB).
- **Reglas Firestore:** sin cambios en esta sesión.

**Frentes cerrados (14):**

| # | Frente | Archivos clave |
|---|---|---|
| 1 | Rediseño completo Ocupación Diaria | `useOcupacionPorRango.js`, `ocupacionHelpers.js`, `AdminOcupacion.jsx` |
| 2 | Estado `parcial_bloqueado` (bloqueos por sede) | `ocupacionHelpers.js`, `AdminOcupacion.jsx` |
| 3 | Homologación de sedes (15 archivos) | `sedesHelpers.js` + 14 consumidores |
| 4 | Fix hora D2 en Proveedor | `ProveedorActividad.jsx` |
| 5 | Fix modal instructor (objeto vs string) | `InstructorPanel.jsx` |
| 6 | Intercambio tutores Emanuel↔Jesus | Script `.mjs` (aplicado en Firestore) |
| 7 | Reparación reserva Jesseira | Script `.mjs` (aplicado en Firestore) |
| 8 | Cierre 7 reservas incompletas | Script `.mjs` (aplicado en Firestore) |
| 9 | Estado `Ausente` UI + `horasPendientes` UI | 4 archivos + `Backlog` |
| 10 | Filtro "Solo con horas pendientes" | `AdminReservasList.jsx` |
| 11 | Documentación Fase 0 reprogramación+recargo | `BACKLOG_V2.md` |
| 12 | Documentación estado `Vencida` | `BACKLOG_V2.md` |
| 13 | Documentación asistencia por día | `BACKLOG_V2.md` |
| 14 | Fix filtro académico "Todos" vs "todos" | `AdminReservasList.jsx` |

**Herramientas nuevas:**
- `src/hooks/useOcupacionPorRango.js` — carga reservas por rango (D1+D2) en 2 queries.
- `src/modules/admin/utils/ocupacionHelpers.js` — cálculo de cupos (instructores/motos).
- `src/modules/shared/utils/sedesHelpers.js` — `formatearSede(sede)` → "Ciudad - Dirección".

**Estados nuevos en Firestore:**
- `reservas.estadoCurso: 'Ausente'` (Raquelis, Franchesca).
- `reservas.horasPendientes: number` (Reinaldo, Marjorie → 1).

**Deudas pendientes críticas:**
- `B-SELECT-ACADEMICO-PLACEHOLDER` (baja) — `<Select>` muestra "Seleccione..." en lugar de "Todos".
- `B-LOOP-FECHAS-PASO3` (alta) — "brinco" de fechas en paso 3 de inscripción.
- `B-FIX-APROBAR-USUARIO-FALTANTE` (alta) — error al aprobar pago sin doc SSOT.
- `B-FEATURE-REPROGRAMACION-CON-RECARGO` (alta) — Fase 0 documentada, esperando confluencia FIRE+MAMBA.
- `B-ESTADO-VENCIDA` (alta) — nuevo estado para reservas +15 días sin acción.
- `B-ASISTENCIA-POR-DIA` (media) — `asistenciaD1`/`asistenciaD2` para cursos de 2 días.
- `B-ESTADO-AUSENTE` (parcial) — UI mapeada en admin e instructor; falta estudiante y filtros.
- `B-HORAS-PENDIENTES-UI` (parcial) — UI mapeada en admin e instructor; falta estudiante.

**Recordatorio crítico:**
- El proyecto usa `cat >>` para bitácora. NUNCA reemplazar archivos de memoria.
- Antes de tocar código en flujos críticos, consultar FIRE + MAMBA con caja XML.
- El protocolo de deploy es: DEV → backup en PROD → cp → grep de verificación → build → deploy.

**Fix de último minuto (12/11/2026):**
- **Bug:** `CambiarHorarioModal.jsx` bloqueaba slots disponibles si *cualquier* otra reserva los ocupaba, sin importar si era el mismo instructor o moto. Impedía reprogramar a Daniel a las 10 AM del 16/11 porque Jean (otro tutor/moto) tenía ese slot.
- **Solución:** Se reescribió `otraOcupaSlot` para retornar `true` solo si la reserva a mover es la misma, o si choca con su mismo `instructorId` o `motoAsignadaId`.
- **Estado:** Deployado y verificado en PROD.

### SESION 13/11/2026 - Directorio ERP y Rediseno de Comunicaciones

**Estado del proyecto al cierre:**
- Dev: Totalmente funcional.
- Prod: Pendiente subir los cambios de esta sesion.

**Frentes cerrados:**
1. **WhatsApp Integrado:** 4 plantillas (Aprobacion, Pack, Reprogramacion, Rechazo) con Google Maps, hidratacion y codigo corto. Refactorizacion en `WhatsAppService.js`.
2. **Directorio de Actores:** Buscador y filtros unificados en `AdminDirectorio.jsx`. Accesible desde Configuracion.
3. **Fichas de Actores:** Creados `AdminUsuarioDetalle`, `AdminInstructorDetalle`, `AdminProveedorDetalle`, `AdminMotoDetalle`. Historial filtrado por logica de negocio (Asignada, En Curso, Completado) y clickeable a la reserva original.
4. **Rediseno Admin:** Dashboard con metricas corregidas (fecha de compra), Top Ventas y Conversion. Boton de purgar locks eliminado (no funcionaba).
5. **Admin Completar Modulos:** `AdminReservaDetalle` ahora permite forzar la finalizacion de modulos y cursos, actualizando Firestore.

**Reglas de Negocio confirmadas:**
- El historial de un Tutor/Proveedor/Moto NO debe mostrar reservas canceladas o pendientes. Solo servicios reales.
- Los estados de la sesion son 3: "Asignada" (Pago OK, no inicio), "En Curso" (Iniciada en aula), "Completado" (Finalizada).
- Los ingresos del admin se calculan por `createdAt` (fecha de compra) y no por la fecha del curso.
- Precio del pack debe calcularse como Base - Descuento y congelarse en Firestore.

**Deuda tecnica vigente:**
- Archivos de memoria deben actualizarse siempre con `cat >>` (solo adicion) pero SIN tildes/emojis para evitar corrupcion en MINGW64.
- Boton "Atras" debe respetar la jerarquia (Ficha -> Directorio -> Configuracion -> Home).

### SESION 13/11/2026 (Noche) - Refactor SSOT y Optimizacion Spark

**Estado:** PROD actualizado con refactor SSOT, optimizacion de consultas y disclaimer de metricas.

**Frentes cerrados:**
1. Consulta formal a FIRE y MAMBA. Confluencia 2/2.
2. Extraccion de `getEstadoLogico` a `src/modules/shared/utils/estadoHelpers.js`.
3. Optimizacion de consultas: `where` especifico en fichas de Tutor, Proveedor y Moto (eliminado `limit(1000)` sin filtro).
4. Disclaimer visual "Calculado sobre N reservas" en las tarjetas de metricas.

**Reglas confirmadas por FIRE + MAMBA:**
- Precedencia de estados: cancelado > pendiente_pago > ausente > tiempo_pendiente > completado > en_curso > asignada.
- NUNCA usar `limit(1000)` sin `where` en fichas individuales.
- Centralizar toda logica repetida en `shared/utils/`.

**Deuda principal:**
- Desnormalizacion de contadores financieros (post-MVP).

### SESION 17/11/2026 (Noche) - INCIDENTE CRITICO: Loop auto-jump agota cuota Firestore

**Estado al cierre:**
- PROD: cuota Firestore agotada 100%. Clientes sin poder inscribirse.
- Dev: paridad con PROD (mismo codigo, mismo bug).
- Documentacion: registrada en BITACORA y BACKLOG como INC-2026-11-17.

**Causa raiz (parcial, pendiente de confirmar):**
- Loop de re-ejecucion del auto-jump en AgendarPackView.jsx.
- Reset-lock dispara recalculo de disponibilidad, que dispara auto-jump de nuevo.
- 4 fixes intentados (useStableArray, guard tipoMoto, remove ctx, isAutoJumpRef) NO resolvieron.

**Errores de proceso (autocritica):**
- 4 deploys a PROD con fixes no validados en DEV.
- Falta de Freno Tactico antes del 3er intento.
- No se monitoreo la cuota de Firestore.
- Confusion src/ vs dist/ en builds.
- No se probo con usuario real antes de tocar el flujo.

**Prioridades proximo dia (post-reset de cuota):**
1. Completar registro manual del cliente 19/11 10am.
2. Auditar locks huerfanos (19/11 h2 y 23/11 h1).
3. Diagnosticar causa raiz del auto-jump con evidencia real.
4. Decidir: rediseno del auto-jump o desactivacion permanente.

**Regla nueva propuesta:**
- El auto-jump no vuelve a PROD hasta estar 100% testeado en DEV con datos reales y monitoreo de cuota activo.


### SESION 19/11/2026 - BUG-1 resuelto: auditoria de reasignacion de tutor

**Estado:** Fix aplicado en DEV, sincronizado a PROD y deploy verificado (chunk AdminReservaDetalle-BaCKGH-E.js responde HTTP 200 y contiene reasignacion_tutor).

**BUG-1 (trazabilidad):**
- Causa: reasignarInstructor actualizaba instructorId, instructorAnteriorId, motivoRelevo, reasignadoPor y reasignadoEn, pero NO registraba evento en reprogramaciones ni incrementaba reprogramacionesCount.
- Fix (dictamen FIRE + MAMBA): evento tipo reasignacion_tutor con Timestamp.now() dentro del array (NO serverTimestamp), arrayUnion + increment(1), en rama simple y rama split.
- Archivo: src/modules/admin/components/AdminReservaDetalle.jsx (import increment agregado).
- Backup previo en PROD: backup/pre-deploy-bug1-reasignacion/AdminReservaDetalle.jsx.backup-20261119-145447.

**Divergencia intencional DEV/PROD:**
- AgendarPackView.jsx: PROD mantiene HOTFIX (auto-jump desactivado) por INC-2026-11-17. DEV NO lo tiene para poder redisenar. NO sincronizar este archivo hasta cerrar B-AUTOJUMP-REDISENO.

**Pendiente inmediato:**
- BUG-2: cross-check contra ocupacionConfirmada en crearReserva, crearReservaPack y agendarSiguienteCursoPack. Resolucion aprobada: opcion (a) pre-query + validacion; opcion (b) slotsInstructor como deuda post-MVP.
- Reparar historial de Simon (evento reasignacion_tutor del 19/11 17:01Z no registrado).
- Registro manual cliente 19/11 10am y locks huerfanos 19/11 h2 y 23/11 h1.



**Actualizacion 19/11/2026:** Reparacion aplicada - evento reasignacion_tutor del 19/11 17:01Z insertado retroactivamente en la reserva de Simon (count 1 -> 2). Backup previo: backup/prod/simon-RCPBr7pVP7OKu27o3mAW-2026-11-19T19-31-06-025Z.json. Script reparar-auditoria-simon.mjs eliminado tras uso.


**Regla de proceso (19/11/2026):** Toda modificacion (codigo o documentos) se realiza en DEV y luego se sincroniza a PROD. Nunca editar PROD primero.


### SESION 19/11/2026 - BUG-2 implementado en DEV: cross-check de ocupacion confirmada

**Estado:** Implementado y compilado en DEV (build 14.16s, bundle contiene slot-occupied). NO se toco PROD. Pendiente: pruebas E2E manuales en DEV y deploy con autorizacion.

**Confluencia FIRE + MAMBA + Deek (19/11):**
- Pre-check fuera de runTransaction (el SDK cliente no permite queries dentro de transacciones).
- Fail-closed total: error de red/permisos o truncamiento abortan la creacion (MAMBA).
- D1: consulta a ocupacionTemporal, NO a locks (las reglas solo permiten leer locks propios o admin).
- Sin excluir reservas del propio usuario en el espejo (idempotencia y doble sesion).
- Cross-check de instructor y de moto, normalizando traeMoto ('Si' con y sin tilde).
- Kill-switch de build SOLAPAMIENTO_CROSSCHECK_ENABLED (prohibido configurable desde cliente).
- Punto de FIRE rechazado: el espejo NO pasa a 'Rechazado' al rechazar para correccion (regla de negocio: sigue bloqueando el horario). Se registra deuda de espejos fantasma.

**Archivos nuevos:**
- src/modules/inscripcion/utils/solapamientoHelpers.js
- src/modules/inscripcion/services/ocupacionRepository.js

**Archivos modificados:**
- src/modules/inscripcion/services/ReservaService.js (cross-check en 3 flujos + horaIdReposicion/motoReposicionId en espejo)
- src/modules/inscripcion/views/InscripcionView.jsx (reset de lock ante slot-occupied)
- src/modules/estudiante/views/AgendarPackView.jsx (reset de lock ante slot-occupied)
- src/modules/admin/components/AdminReservaDetalle.jsx (cambio total de horario limpia D2 obsoleto)

**Pruebas:**
- Build DEV: OK.
- Fixtures del helper puro: 15/15 PASS (D2 con horaIdReposicion, moto propia con/sin tilde, reserva propia, locks ajenos/expirados, estados inactivos).
- Pendiente: E2E manual con 2 cuentas en DEV (reserva individual, compra de pack, siguiente curso de pack, fail-closed offline).

**Nota operativa:** El dev server de Vite (npm run dev --host) mantiene mapeado AgendarPackView.jsx; si el editor falla al escribir, detener el dev server o usar reemplazo controlado (ya ocurrio y se resolvio renombrando el archivo al backup).



**Auditorias pre-deploy (19/11/2026, solo lectura, scripts eliminados tras uso):**
- DEV replay: 54 espejos activos; 79/79 slots de instructor y 76/76 slots de moto detectados como conflicto; 60 combinaciones libres sin mismatches ni falsos positivos; queries 'in' consistentes. VEREDICTO: OK.
- PROD fantasmas: 17 reservas/espejos en rango (19/11 a 18/01), 0 espejos fantasma, 0 colisiones existentes, 0 locks activos, 1 lock expirado (30/11 h2, expiro 19/11 20:05Z) sin impacto. Los locks huerfanos de 19/11 h2 y 23/11 h1 ya no existen.
- Conclusion: el cross-check esta validado contra datos reales y no bloquea horarios legitimos. Pendiente: happy path en DEV y deploy a PROD con autorizacion.



**Regla de paridad DEV/PROD (19/11/2026):** Los archivos de codigo de DEV y PROD deben ser siempre identicos. No se permite divergencia permanente; cualquier diferencia se resuelve en el mismo release. Excepcion temporal unica: durante el desarrollo, DEV puede ir adelante hasta el deploy.

**Estado hotfix auto-jump (19/11/2026):** El HOTFIX `if (true) return;` de AgendarPackView.jsx ahora existe en DEV y en PROD. El auto-jump queda desactivado en ambos entornos hasta el rediseno (B-AUTOJUMP-REDISENO). Opciones futuras: retirar el hotfix en DEV, validar con monitoreo de cuota y sincronizar; o flag por entorno (import.meta.env.DEV) con dictamen FIRE + MAMBA.



**Post-deploy BUG-2 (19/11/2026):** Deploy a PROD completado (89 archivos, release completa). Verificacion en vivo: sitio HTTP 200; chunks AgendarPackView-CfrkTym4.js e InscripcionView-IqQkOKk1.js responden 200 y contienen slot-occupied. Paridad total src DEV/PROD: 0 diferencias (SHA256). Auto-jump desactivado en ambos por hotfix. Backups PROD: backup/pre-deploy-bug2-crosscheck. Pendiente: smoke test de reserva normal (happy path) y monitoreo de logs.



**Documentacion tecnica de flujos (19/11/2026):** Creado docs/README.md, docs/flujos/INDICE.md, docs/flujos/_PLANTILLA.md, fichas 01 (inscripcion individual) y 02 (reinscripcion/recuperacion), y ADR-001 (riesgo PIN/PII aceptado). Regla nueva: leer docs/flujos/INDICE.md antes de tocar un flujo. Los documentos viven en DEV y se sincronizan a PROD.



**Documentacion Fase 2 (19/11/2026):** Agregadas fichas 03 (disponibilidad y locks) y 04 (reserva y espejo). Hallazgos documentados: instructoresPermitidos NO esta homologado (individual fail-closed, packs fail-open); el PIN se muestra solo despues del pago; reserva.pin es campo muerto. Deuda nueva: B-ESPACIO-LIMITE-100.



**Documentacion Fase 3 (19/11/2026):** Agregada ficha 07 (aprobacion/rechazo/correccion de pagos). Hallazgos: movimiento de ingreso post-commit no atomico y ausente en packs; limite de 3 intentos solo UI; estadoCurso 'En Curso' al aprobar no lo usa el SSOT; rechazadoEn numero vs Timestamp. Deudas nuevas: B-MOVIMIENTOS-ATOMICOS, B-INTENTOS-CORRECCION.



**Documentacion Fase 4 (19/11/2026):** Fichas 05 (compra de pack) y 06 (agendamiento de pack) creadas. Hallazgo CRITICO: reservasPack.update permite al dueno actualizar cualquier campo (estadoPago/precio/vencimiento) y la child pack_sub puede nacer Aprobado sin maestra aprobada; ademas precios/comisiones se calculan desde cursoSnapshot del cliente. Deudas nuevas: B-PACK-RULES-OWNER, B-PACK-RULES-CHILD, B-PACK-PRECIOS-CLIENTE, B-PACK-PRECIO-TEORICOS, B-PACK-DOBLE-COMPRA, B-PACK-AVANCE-FIRE-AND-FORGET, B-PACK-CREATEDAT. Auto-jump de packs desactivado (AgendarPackView.jsx:302).



**Documentacion Fase 5 (19/11/2026):** Ficha 08 (reasignacion tutor, cambio moto, horario y D2). Hallazgos: el modal solo bloquea admin/proveedor (instructor/moto son advertencias); helper D2 ignora horaIdReposicion; auditoria se copia al espejo (legible por auth); cambio de horario permitido en canceladas; auditoria mutable. Deudas: B-D2-CONFLICTO-REPOSICION, B-ESPEJO-AUDITORIA, B-CAMBIO-CANCELADO, B-REPROG-AUDIT-MUTABLE, B-D2-PROVEEDOR, B-REASSIGN-PAGO-PARCIAL.



**Documentacion Fase 6 (19/11/2026):** Ficha 09 (aula virtual y sesiones). Hallazgos: presencia sin heartbeat periodico (ventana 2 min); revertir modulo no baja estadoCurso ni revierte pack; pausa >60 min no registra/finaliza; timestamps de sesion en cliente; TZ local vs Caracas; admin soportado en la vista pero no en la ruta. Deudas: B-AULA-PRESENCIA-HEARTBEAT, B-AULA-TZ, B-REVERTIR-MODULO, B-PAUSA-60, B-AULA-MANUAL-COMPLETE, B-AULA-TIMESTAMPS-CLIENTE, B-AULA-OFFLINE, B-AULA-ADMIN-ROUTE, B-AULA-EMERGENCIA.



**Documentacion Fase 7 (19/11/2026):** Ficha 11 (finanzas y movimientos). Hallazgo CRITICO: las tarjetas gananciaNeta/deudas usan pagoInstructor/pagoProveedor que las reservas no escriben (deuda 0, ganancia = ingresos). saveMovimiento pisa userId con el admin; movimientos.create abierto a cualquier auth; montoTotal sin reconciliar con detalles; proveedor con doble ruta (legacy sin pagosStaff). Deudas: B-FINANZAS-CAMPOS-LEGACY, B-MOVIMIENTOS-USERID, B-MOVIMIENTOS-RULE, B-PAGOS-MONTO-LIBRE, B-PAGOS-PROVEEDOR-LEGACY, B-MOVIMIENTOS-ID, B-FINANZAS-PROVEEDOR-CONFIG, B-PAGOS-PROVEEDOR-OWNERSHIP.



**Documentacion Fase 8 (19/11/2026):** Ficha 10 (portales estudiante/instructor/proveedor). Hallazgos CRITICOS: PerfilTab guarda en instructores pero la regla solo permite admin (perfil del instructor siempre falla); el portal del proveedor calcula cobrado/por cobrar/completadas desde el espejo, que no tiene pagadoProveedor ni estadoCurso (0 cobrado, todo por cobrar). Ademas el colaborador de split no aparece en resumen/historial y hay limites 100/500. Deudas: B-INSTRUCTOR-PERFIL-RULES, B-PROVEEDOR-MIRROR-PAGOS, B-INSTRUCTOR-SPLIT-VISIBILIDAD, B-PORTAL-LIMITS, B-ESTUDIANTE-CTX-RESERVAS, B-PROVEEDOR-MIRROR-STALE, B-PORTAL-EAGER, B-PROVEEDOR-BLOQUEOS.



**Documentacion Fase 9 (19/11/2026):** Ficha 12 (teoricos). Hallazgos CRITICOS: TeoricoModuloView no valida acceso (bypass por URL); crearAcceso confia en el precio del cliente; el vencimiento no se valida; doble compra no transaccional; puntaje de quiz calculado en cliente. Deudas: B-TEORICO-MODULO-BYPASS, B-TEORICO-PRECIO-CLIENTE, B-TEORICO-VENCIMIENTO, B-TEORICO-DOBLE-COMPRA, B-TEORICO-QUIZ-CLIENTE, B-TEORICO-MOV-ATOMICO, B-TEORICO-APROBACION-DOBLE, B-TEORICO-CAPACIDAD.

