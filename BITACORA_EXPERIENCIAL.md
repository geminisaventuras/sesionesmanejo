# ⚠️ REGLA: Este archivo es de solo ADICIÓN. NUNCA se reemplaza. Cada sesión agrega al final.
#### [ARQUITECTO] – 2026-06-16 – FASE 2 (Registro) y FASE 3 (Panel del Estudiante)
**Decisión/Lección Clave:**
> Recuperar funciones perdidas de la versión antigua (CAPTCHA, placeholders, datos de la escuela) fue esencial para cerrar el ciclo de seguridad y usabilidad del registro. La comparación directa de archivos antiguos vs. refactorizados es una técnica de auditoría muy eficaz.

**Contexto:**
> El paso 4 (Pago) estaba funcional pero incompleto. Faltaban los placeholders que guían al usuario sobre el formato de los datos de pago, los datos bancarios de la escuela (para que el usuario sepa a quién transferir) y el CAPTCHA de seguridad. Estos elementos estaban presentes en la versión antigua del código pero se perdieron en la refactorización. También se rescató la función `isPastBlock` para validar bloques de horario vencidos (B64).

**Alternativas Consideradas:**
> - Opción A: Rediseñar el paso 4 desde cero con un nuevo CAPTCHA y componentes. → Se descartó por costo de tiempo.
> - Opción B (elegida): Copiar textualmente las funciones y fragmentos JSX de la versión antigua que el Operador compartió. → Más rápido, ya probado, y garantiza el mismo comportamiento que antes.

**Impacto y Deuda:**
> El paso 4 quedó completo con CAPTCHA, placeholders, helperText y datos bancarios. La validación de bloques vencidos (B64) ahora cubre fechas pasadas y horas vencidas del día actual. Se generó nueva deuda: B65 (compactar tarjetas del paso 4), B66 (edad máxima), B67 (opción `prestamoMoto` en cursos).

**Para el Futuro:**
> Mantener un registro de "funciones perdidas" durante las refactorizaciones. Antes de eliminar una función, verificar si está siendo utilizada en algún flujo, aunque sea secundario.

#### [ARQUITECTO] – 2026-06-16 – FASE 2 (Diagnóstico de disponibilidad)
**Decisión/Lección Clave:**
> La creación de una página de prueba aislada que carga datos directamente desde Firestore fue esencial para aislar y diagnosticar el fallo de disponibilidad. El `appId` correcto es `motoescuela-pro-v1`.

**Contexto:**
> Los bloques de horario no reflejaban las reservas reales. Tras múltiples intentos, se determinó que el problema no era la autenticación, sino que la consulta de respaldo usaba un campo incorrecto (`fecha1` en lugar de `fecha`). La página de prueba permitió experimentar sin romper el flujo principal.

**Alternativas Consideradas:**
> - Opción A: Modificar el flujo de registro. → Demasiado riesgo.
> - Opción B: Cambiar reglas de Firestore. → Inviable por seguridad.
> - Opción C (elegida): Página de prueba aislada con carga directa. → Aportó flexibilidad y confirmó la causa raíz.

**Impacto y Deuda:**
> Se resolvió la discrepancia de campos. Queda pendiente integrar este aprendizaje en el flujo real y eliminar la página de prueba cuando ya no sea necesaria. Se añadió deuda para gestión de horarios (B69, B70).

**Para el Futuro:**
> Ante bugs de disponibilidad, usar siempre una página de prueba que emule el componente pero con consultas directas, para eliminar dependencias del contexto global.

#### [ARQUITECTO] – 2026-06-18 – Refactorización Completa y Diseño Seamless
**Decisión/Lección Clave:**
> Centralizar la lógica de negocio en servicios y separar la UI con un sistema de diseño (AppShell + ToastProvider) fue esencial para corregir bugs persistentes y unificar la experiencia visual. La técnica de "Componentes Seamless" (contenedor unificado con overflow-hidden) resolvió definitivamente la fusión visual tarjeta-acordeón en el paso 4.

**Contexto:**
> El proyecto tenía 25 bugs, problemas de caché, estilos inconsistentes y una estructura plana que dificultaba el mantenimiento. Se abordó una refactorización mayor alineada al Marco V6.3 y Manual V2.0.

**Alternativas Consideradas:**
> - Parchear bugs uno por uno sin cambiar la estructura → Más rápido a corto plazo, pero no escalaba.
> - Refactorización completa → Elegida por el Operador para garantizar calidad y cumplimiento del marco.

**Impacto y Deuda:**
> Se cerraron 15 bugs críticos/altos. La estructura modular permite agregar funcionalidades sin romper existentes. Nueva deuda técnica registrada (B75, B77, B78, B79, B80).

**Para el Futuro:**
> Mantener la separación de capas (servicios, componentes, contexto). Usar siempre `AppShell` para nuevas vistas. No almacenar lógica de negocio en componentes de UI. Nunca reemplazar archivos de memoria; solo añadir al final.

#### [ARQUITECTO] – 2026-06-19 – Correcciones finales y mejoras en dashboard
**Decisión/Lección Clave:**
> La validación de recursos debe contemplar el caso de `traeMoto === 'Sí'` (sin moto asignada). Extender el lock al avanzar al paso 4 previene que expire durante el pago. Los acordeones en el dashboard reducen la fatiga de scroll y mejoran la experiencia del administrador.

**Contexto:**
> Tras implementar el diseño Seamless y los selectores de moneda, surgieron bugs en el flujo de inscripción (bloque sin recursos, lock expirado al confirmar PIN, sugerencia de fecha errática). Además, el dashboard necesitaba mejoras visuales para la gestión de configuración.

**Alternativas Consideradas:**
> - Parchar cada bug por separado con `sed` → Alto riesgo de romper el archivo.
> - Regenerar el archivo completo con todas las correcciones → Elegido por seguridad y consistencia.

**Impacto y Deuda:**
> Se cerraron 3 bugs críticos. El dashboard ahora tiene acordeones funcionales. Pendiente: corregir la dirección de búsqueda en `buscarProximaFechaDisponible`.

**Para el Futuro:**
> Siempre regenerar archivos completos en lugar de parchar con `sed` cuando hay múltiples cambios. Documentar cada función con su propósito.

#### [ARQUITECTO] – 2026-06-17 – Cierre de la página de inscripción
**Decisión/Lección Clave:**
> El uso de `sed` para modificar JSX es extremadamente frágil y causó múltiples roturas de archivo. Se estableció la regla de solo usar `cat` para archivos completos o edición manual con `nano`. El protocolo Base64 es la forma más segura de transferir archivos extensos.

**Contexto:**
> Tras múltiples intentos fallidos de corregir el captcha y el diseño Seamless con `sed`, se decidió regenerar el archivo completo con `cat`, incluyendo todas las mejoras. Esto resolvió los bugs de una vez y dejó el sistema funcional.

**Alternativas Consideradas:**
> - Seguir usando `sed` → Provocaba errores de sintaxis y archivos rotos.
> - Regenerar con `cat` (elegida) → Seguro, rápido y confiable.

**Impacto y Deuda:**
> Inscripción cerrada con todas las funcionalidades operativas. Nueva deuda: B82 (color del reloj).

#### [ARQUITECTO] – 2026-06-17 – Saneamiento de archivo fantasma
**Decisión/Lección Clave:**
> `AdminPanelView.jsx` nunca existió en disco. El archivo con acordeones era el propio `DashboardView.jsx`. El verdadero duplicado obsoleto estaba en `src/admin/DashboardView.jsx` (sin acordeones). Eliminarlo resolvió la confusión sin afectar la app.

**Contexto:**
> Al cargar el contexto de la otra instancia, se recibió un archivo llamado `AdminPanelView.jsx` que en realidad era una copia de `DashboardView.jsx` renombrada para transferencia. Se interpretó erróneamente que eran dos archivos coexistentes. El `grep` reveló que `src/views/DashboardView.jsx` ya contenía los acordeones, y que el duplicado real era `src/admin/DashboardView.jsx`.

**Impacto y Deuda:**
> Eliminado `src/admin/DashboardView.jsx`. Ningún impacto funcional. La app compila correctamente.

#### [ARQUITECTO] – 2026-06-17/18 – Saneamiento de archivo fantasma y rediseño del InstructorPanel
**Decisión/Lección Clave:**
> La coexistencia de archivos obsoletos por falta de trazabilidad entre instancias de IA generó confusión. Se eliminó código muerto y se rediseñó la interfaz del instructor con un header unificado y una tarjeta de detalle optimizada para no usar scroll.

**Contexto:**
> Al cargar el contexto de la instancia anterior, se detectó que `AdminPanelView.jsx` nunca existió en disco; era una copia de `DashboardView.jsx` renombrada para transferencia. El verdadero duplicado obsoleto era `src/admin/DashboardView.jsx`. Paralelamente, el InstructorPanel requería compactar su vista de detalle para que los módulos cupieran en pantalla sin necesidad de hacer scroll.

**Alternativas Consideradas:**
> - Aplicar los ajustes de la otra instancia con `sed` → Alto riesgo de rotura de JSX, prohibido por lecciones anteriores.
> - Rediseño completo con `cat` → Elegido por seguridad y consistencia. Se unificó el header, se añadió un sello mes/año, se compactó la tarjeta interna con fuente `text-xs` y fondo gris, y se eliminaron los checkboxes reemplazándolos por círculos con check.

**Impacto y Deuda:**
> Eliminado `src/admin/DashboardView.jsx`. InstructorPanel completamente funcional con diseño responsive. Nueva deuda: B88 (unificar headers en todas las vistas).

**Para el Futuro:**
> Nunca asumir la estructura de archivos por el nombre con que otra IA los envía. Siempre verificar con `grep` contra el sistema de archivos real.

#### [ARQUITECTO] – 2026-06-18 – Lógica de privacidad y avance secuencial en InstructorPanel
**Decisión/Lección Clave:**
> El instructor no debe ver el teléfono del estudiante en ningún estado. La comunicación debe ser interna. El avance secuencial de módulos y la confirmación para desmarcar previenen errores operativos.

**Contexto:**
> El Operador pidió ocultar el teléfono, deshabilitar módulos en cursos aprobados y evitar cambios accidentales. El panel de expertos EdTech recomendó orden secuencial, calificación mutua y logros.

**Alternativas Consideradas:**
> - Mostrar teléfono solo en estado Aprobado → Rechazado por privacidad.
> - Permitir saltar módulos → Rechazado por integridad académica.
> - Confirmación con toast → Rechazado por complejidad; se usó window.confirm nativo.

**Impacto y Deuda:**
> InstructorPanel v1.7.15 con lógica de privacidad y avance. Registrada deuda B89-B99 (calificación, logros, chat, insignias, etc.).
#### [ARQUITECTO] – 2026-06-19 – Observación sobre diálogos nativos
**Decisión/Lección Clave:**
> Los diálogos `window.confirm` nativos del navegador se ven anticuados y rompen la experiencia visual. Deben ser reemplazados por un componente ModalConfirm personalizado que use el mismo lenguaje de diseño que los Toast.

**Contexto:**
> Mientras se implementaba el SGTA, el Operador notó que el mensaje de confirmación para desmarcar módulos o completar cursos usaba el `window.confirm` estándar del navegador. Esto desentona con el diseño cuidado del resto de la app.

**Para el Futuro:**
> Crear un `ModalConfirm.jsx` en `src/modules/shared/components/` que reciba mensaje, onConfirm, onCancel y se renderice con el estilo de la aplicación (overlay oscuro, tarjeta blanca redondeada, iconos de Lucide, botones con variantes). Reemplazar todos los `window.confirm` por este componente.

#### [ARQUITECTO] – 2026-06-20 – Refactorización Mayor, Aula Virtual y Restauración del SGTA
**Decisión/Lección Clave:**
> La creación del Aula Virtual como página independiente y la fusión del panel del estudiante con ella resolvió los problemas de duplicación de código, parpadeo del reloj y desincronización de datos. Extraer los componentes compartidos a `src/modules/` fue esencial para cumplir con el Marco de Trabajo V6.3 y el Manual del Arquitecto V2.1.

**Contexto:**
> El proyecto presentaba duplicación masiva entre InstructorPanel y EstudiantePanel, el temporizador causaba re-renderizados completos de la página cada segundo, y la migración a una arquitectura modular había dejado funcionalidades críticas sin restaurar. Se dedicó una sesión completa a reestructurar el sistema.

**Alternativas Consideradas:**
> - Parchear los bugs uno por uno → Rechazado por no resolver la raíz del problema.
> - Refactorización completa con componentes compartidos y Aula Virtual independiente → Elegida y ejecutada.

**Impacto y Deuda:**
> Se restauraron todas las funcionalidades del SGTA (temporizador, pausas, receso automático, input "Otro", regla anti-fantasma). Se registró deuda B116 (restricción de reversión de módulos) y B117 (clases virtuales online).

#### [ARQUITECTO] – 2026-06-20 – Dashboard del estudiante y rediseño del botón de sesión activa
**Decisión/Lección Clave:**
> El estudiante no debe aterrizar en el Aula Virtual si reservó con antelación. La página principal debe ser un dashboard con un botón prominente de "Sesión Activa" cuando corresponda, y ofertas de cursos/servicios cuando no.

**Contexto:**
> Tras analizar la experiencia del usuario, se determinó que redirigir automáticamente al Aula Virtual cuando la reserva es para una fecha futura dejaba al estudiante en una página vacía. Se diseñó un dashboard que prioriza visualmente el acceso al aula cuando hay una sesión activa.
