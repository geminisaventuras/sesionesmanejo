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