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
#### [ARQUITECTO] – 2026-06-20 – Unificación final del temporizador
**Decisión/Lección Clave:**
> Eliminar los hooks separados (useTimerLectura/useTimerEscritura) y consolidar todo en useSessionTimer con suscripción directa a Firestore solucionó definitivamente la sincronización entre instructor y estudiante. El cálculo derivado desde timestamps garantiza que los contadores sobrevivan a recargas.

**Contexto:**
> La sincronización de tiempos entre roles fallaba por race conditions al recargar. Se intentó con suscripción directa en AulaVirtualView, pero competía con el AppContext. La solución final fue mover la suscripción al hook y eliminar la dependencia del contexto para la reserva.

#### [ARQUITECTO] – 2026-06-20 – Sistema de triple reloj y gestión de excedentes
**Decisión/Lección Clave:**
> El reloj general de sesión no debe depender del módulo activo. Se introduce `sesionDiariaInicio` como fuente de verdad independiente para el reloj diario, y `sesionTotalInicio` para el reloj de 4 horas. La pausa acumulada se ofrece como reserva opcional al llegar al límite.

**Contexto:**
> Al completar un módulo, el reloj general se reiniciaba porque dependía de `moduloEnProgreso.inicio`. Se detectó que el tiempo de pausa acumulado podía servir como reserva para el instructor al agotarse el tiempo reglamentario.

**Alternativas Consideradas:**
> - Usar `moduloEnProgreso.inicio` como fuente del reloj general → Descartado por reinicios al completar módulos.
> - Extensión automática del tiempo extra → Descartada por el Operador, quien prefiere decisión manual del instructor.

**Impacto y Deuda:**
> Se diseñó el sistema de triple reloj (grande 4h, diario 2h, pausa acumulada). Se registró deuda B118 para la implementación completa del flujo de reserva.

#### [ARQUITECTO] – 2026-06-20 – Relojes autónomos, pausa en tiempo real y sistema de reserva
**Decisión/Lección Clave:**
> Los relojes de sesión (general y diario) no deben detenerse durante las pausas. El tiempo de pausa se acumula como dato de auditoría y puede usarse opcionalmente como reserva al final del día o del curso.

**Contexto:**
> El diseño anterior detenía los relojes durante las pausas, lo que impedía al instructor ver cuánto faltaba para terminar el bloque horario contratado. Se rediseñó el sistema para que los relojes sean autónomos y la pausa sea solo un contador de tiempo perdido.

**Alternativas Consideradas:**
> - Mantener relojes detenidos durante pausas → Rechazado por pérdida de referencia horaria.
> - Extensión automática del tiempo extra → Rechazada por el Operador.

**Impacto y Deuda:**
> Se implementó el acumulador en tiempo real, el tiempo efectivo, el reloj naranja de reserva y los botones de control de reserva. Se registró deuda B118-B120.

#### [ARQUITECTO] – 2026-06-21 – Control administrativo de contadores
**Decisión/Lección Clave:**
> Si un instructor inicia un módulo por error, los contadores de sesión no deben detenerse. Solo el administrador debe tener la capacidad de resetearlos manualmente.

**Contexto:**
> El Operador detectó que, una vez iniciado el primer módulo, los relojes corren sin pausa hasta el final de la sesión. Si el inicio fue accidental, no hay forma de detenerlos. Se requiere un mecanismo administrativo para corregir esta situación.

**Impacto y Deuda:**
> Registrada deuda B121 para implementar el reseteo administrativo de contadores de sesión.

## [Arquitecto] � 20/06/2026 � Selector de fecha con tres ruedas

**Decisi�n/Lecci�n Clave:**
La implementaci�n de selectores de fecha con arrastre y snap requiere medici�n real de elementos (getBoundingClientRect) y manejo cuidadoso de scroll program�tico vs. scroll del usuario.

**Contexto:**
Se necesitaba un selector de fecha de nacimiento que fuera f�cil de usar en m�viles, evitando los problemas de navegaci�n del <input type="date"> nativo para a�os lejanos. Se probaron m�ltiples enfoques: calendario nativo, calendario desplegable tipo dropdown, tres inputs separados, tres ruedas con scroll infinito, y finalmente tres ruedas con medici�n real.

**Alternativas Consideradas:**
- Opci�n A: Calendario nativo (<input type="date">) ? descartado por dificultad para seleccionar a�os lejanos en m�viles.
- Opci�n B: Tres inputs separados (d�a, mes, a�o) ? funcional pero poco atractivo visualmente.
- Opci�n C: Tres ruedas con scroll infinito ? causaba movimientos err�ticos y problemas de rendimiento.
- Opci�n D (elegida): Tres ruedas con medici�n real usando ResizeObserver, getBoundingClientRect y event listeners (scrollend, touch). Ofrece control preciso y buen rendimiento.

**Impacto y Deuda:**
- Componente SelectorColumna reutilizable en el modal de fecha de nacimiento.
- Deuda t�cnica: no se aplic� trampa de foco en modales (B103).
- Deuda t�cnica: uscarProximaFechaDisponible carece de AbortController (B106).

**Para el Futuro:**
Encapsular el selector de fecha en un paquete independiente con pruebas unitarias. Considerar extraerlo a un m�dulo compartido para usar en otros formularios.

## [Arquitecto] � 20/06/2026 � Selector de fecha con tres ruedas

**Decisi�n/Lecci�n Clave:**
La implementaci�n de selectores de fecha con arrastre y snap requiere medici�n real de elementos (getBoundingClientRect) y manejo cuidadoso de scroll program�tico vs. scroll del usuario.

**Contexto:**
Se necesitaba un selector de fecha de nacimiento que fuera f�cil de usar en m�viles, evitando los problemas de navegaci�n del <input type="date"> nativo para a�os lejanos. Se probaron m�ltiples enfoques: calendario nativo, calendario desplegable tipo dropdown, tres inputs separados, tres ruedas con scroll infinito, y finalmente tres ruedas con medici�n real.

**Alternativas Consideradas:**
- Opci�n A: Calendario nativo (<input type="date">) ? descartado por dificultad para seleccionar a�os lejanos en m�viles.
- Opci�n B: Tres inputs separados (d�a, mes, a�o) ? funcional pero poco atractivo visualmente.
- Opci�n C: Tres ruedas con scroll infinito ? causaba movimientos err�ticos y problemas de rendimiento.
- Opci�n D (elegida): Tres ruedas con medici�n real usando ResizeObserver, getBoundingClientRect y event listeners (scrollend, touch). Ofrece control preciso y buen rendimiento.

**Impacto y Deuda:**
- Componente SelectorColumna reutilizable en el modal de fecha de nacimiento.
- Deuda t�cnica: no se aplic� trampa de foco en modales (B103).
- Deuda t�cnica: uscarProximaFechaDisponible carece de AbortController (B106).

**Para el Futuro:**
Encapsular el selector de fecha en un paquete independiente con pruebas unitarias. Considerar extraerlo a un m�dulo compartido para usar en otros formularios.

## [Arquitecto] � 20/06/2026 � Persistencia offline de Firestore

**Decisi�n/Lecci�n Clave:**
Habilitar enableIndexedDbPersistence garantiza que la configuraci�n financiera (tasas, precios) nunca se reinicie a los valores por defecto, incluso sin conexi�n.

**Contexto:**
La tasa EUR se reiniciaba a 39.10 al perder la conexi�n con Firestore o al recargar la aplicaci�n. Se prob� con sessionStorage, pero la soluci�n m�s robusta fue la persistencia offline nativa de Firestore, que guarda en IndexedDB el �ltimo valor le�do y lo sincroniza autom�ticamente.

**Alternativas Consideradas:**
- Opci�n A: sessionStorage ? fr�gil, se pierde al cerrar la pesta�a.
- Opci�n B (elegida): enableIndexedDbPersistence ? nativa, sobrevive a cierres de pesta�a, no requiere l�gica manual.

**Impacto y Deuda:**
- El motor financiero queda blindado contra reinicios inesperados de configuraci�n.
- Deuda t�cnica: no se implement� trampa de foco en modales (B103).

**Para el Futuro:**
Considerar localStorage o Firestore bundles para datos que deban persistir entre sesiones de usuario.


#### [ARQUITECTO] – 2026-06-23 – Auditoría Centinela V4.0 (Fases 1-4)

**Decisión/Lección Clave:**
> La auditoría Zero-Trust reveló que la seguridad no depende solo de las reglas de Firestore, sino de la sincronización entre reglas, servicios y estado local del cliente. La restricción del plan Spark obligó a soluciones creativas sin backend, priorizando privacidad sobre UX en tiempo real.

**Contexto:**
> El sistema migró de MVP a Proyecto Estándar. El Centinela ejecutó un escrutinio en 4 fases: reglas de seguridad (Bóveda), transacciones financieras (Motor), sesiones (Núcleo Operativo) y UI/Accesibilidad (Hardening). Cada fase tuvo hallazgos críticos que requirieron correcciones antes de aprobar.

**Alternativas Consideradas:**
> - Fase 1 (Lock Poisoning): límite de 15 minutos anclado a `request.time`. Descarta usar `serverTimestamp()` por complejidad.
> - Fase 2 (Fuga de PII en locks): restringir lectura solo al propietario. Degrada disponibilidad en tiempo real (falsos positivos), compensado por transacción atómica.
> - Fase 3 (Doble-clic en pausas): bloqueo optimista con limpieza de estado antes de la red y rollback. Alternativa de debounce descartada por latencia.
> - Fase 4 (Focus trap): aceptado como deuda técnica (B132) por no ser bloqueante para producción.

**Impacto y Deuda:**
> 8 archivos modificados. 4 fases aprobadas. 9 nuevas deudas técnicas registradas (B125-B130, B132-B134). El sistema está listo para producción con seguridad verificada bajo estándar Zero-Trust.

**Para el Futuro:**
> Evaluar migración al plan Blaze cuando el negocio lo justifique, para habilitar Cloud Functions y resolver deuda B125, B128, B129. Implementar focus trap (B132) y headers de seguridad (B134) en el siguiente sprint.


#### [ARQUITECTO] – 2026-06-23 – Solución definitiva de disponibilidad y cierre de sesión

**Decisión/Lección Clave:**
> La eliminación de la función `buscarProximaFechaDisponible` y la adopción de la Fuente Única de Verdad (SSOT) en el hook `useDisponibilidad` resolvió definitivamente la inconsistencia de fechas entre dispositivos. La lección es que duplicar lógica de negocio en capas separadas (servicio vs. hook) genera divergencia y bugs difíciles de rastrear. El Freno Táctico es innegociable.

**Contexto:**
> Tras múltiples iteraciones corrigiendo la búsqueda de la próxima fecha disponible, el problema persistía. El Centinela diagnosticó que `buscarProximaFechaDisponible` no validaba `isPastBlock`, retornando HOY aunque sus bloques ya vencieron. La solución fue eliminar la función duplicada y usar directamente `diasDisponibles` del hook.

**Alternativas Consideradas:**
> - Opción A: Eliminar el `useEffect` automático → Rechazada por degradar UX.
> - Opción B (elegida): Usar `diasDisponibles` como fuente única → Aprobada por el Centinela como "SRE Golden Path".
> - Opción C: Revisar índices de Firestore → Rechazada por no ser la causa raíz.

**Impacto y Deuda:**
> Se eliminó código duplicado. El sistema ahora asigna la primera fecha con disponibilidad real de forma determinista. La sesión cerró con certificación SRE Master del Centinela V4.0.

**Para el Futuro:**
> Mantener el principio SSOT. Respetar siempre el Freno Táctico del Manual del Arquitecto V2.1.

#### [ARQUITECTO] – 2026-06-23 – Arquitectura de Colección Espejo y cierre de sesión

**Decisión/Lección Clave:**
> La creación de una colección espejo anonimizada (`ocupacionConfirmada`) resolvió el problema de BOLA que impedía a los estudiantes ver la disponibilidad real. La lección es que en arquitecturas Zero-Trust sin backend, duplicar datos de forma anonimizada es la única forma de compartir el estado global sin violar la privacidad.

**Contexto:**
> Los estudiantes veían "TODO DISPONIBLE" porque las reglas de Firestore les impedían leer las reservas de otros. El Centinela Qwen diagnosticó un fallo BOLA y propuso la Colección Espejo. Gemini corrigió la regla de mutabilidad para evitar DDoS Financiero. Se implementó la solución completa en 8 archivos.

**Alternativas Consideradas:**
> - Opción A (Spinner): rechazada por no resolver la causa raíz.
> - Opción B (Forzar suscripción sin auth): rechazada por violar reglas de Firestore.
> - Colección Espejo (elegida): aprobada por ambos Centinelas.

**Impacto y Deuda:**
> Se modificaron 8 archivos. Se saldaron 7 deudas técnicas. El sistema ahora muestra disponibilidad real a todos los usuarios.

**Para el Futuro:**
> El patrón de Colección Espejo puede aplicarse a otros casos donde se necesite compartir estado sin exponer PII.


#### [ARQUITECTO] – 2026-07-22 – Corrección masiva de regresiones y cierre de bugs críticos

**Decisión/Lección Clave:**
> La reinscripción requería una combinación de cambios en Firestore (regla `get` pública), AuthService (guardado inicial del progreso) y InscripcionView (búsqueda del progreso + auto-login). La disponibilidad de horarios fallaba porque los filtros de ocupación solo consideraban la fecha, no el bloque horario. El panel de administración fallaba al aprobar pagos porque `batch.update` sobre `ocupacionConfirmada` exige que el documento exista; `batch.set` con `merge` es la solución robusta. Mantener el espejo con `estadoPago: 'Pendiente'` durante el rechazo con corrección evita la doble reserva.

**Contexto:**
> Sesión enfocada en corregir todos los bugs introducidos por la refactorización anterior. El más crítico era B154 (reinscripción), que impedía a los estudiantes retomar su progreso si perdían la sesión. Se detectó que las reglas de Firestore bloqueaban la lectura del progreso sin autenticación. Además, la lógica de disponibilidad bloqueaba sedes enteras al confirmar un pago, y el panel admin no podía aprobar pagos de reservas creadas antes de la colección espejo.

**Alternativas Consideradas:**
> - Para la reinscripción: usar `query` con `where` → rechazado por FIRE (las reglas bloquean `list`). Se optó por `getDoc` directo con ID de correo sanitizado y regla `allow get: if true`.
> - Para el panel admin: `batch.update` → falla si el espejo no existe. Se reemplazó por `batch.set` con `merge: true`.
> - Para el rechazo con corrección: mantener el espejo con `'Rechazado'` → la lógica de disponibilidad lo ignoraría y liberaría el horario. Se decidió mantenerlo como `'Pendiente'` hasta la cancelación definitiva.

**Impacto y Deuda:**
> Todos los bugs críticos y altos reportados en la sesión quedan cerrados. El flujo de inscripción ahora es robusto, con validaciones en cada paso y persistencia del progreso. La disponibilidad refleja correctamente la ocupación por bloque. El panel admin funciona incluso con reservas antiguas. No se genera nueva deuda técnica.

**Para el Futuro:**
> Ante cualquier cambio en la lógica de disponibilidad, verificar siempre los filtros de `isInstructorOcupado` e `isMotoOcupada` y los contadores `instructoresLibresSinLocks`/`motosLibresSinLocks`. Mantener la convención de `batch.set` con `merge` para operaciones sobre documentos que pueden no existir. Documentar inmediatamente en la bitácora para mantener trazabilidad.


#### [ARQUITECTO] – 2026-07-26 – Corrección definitiva de reinscripción (B154) y validación de cédula duplicada

**Decisión/Lección Clave:**
> El orden de las operaciones en el registro de usuarios determinó el éxito o fracaso de la funcionalidad. Al anteponer la validación de cédula a la creación del usuario, se bloqueaba el flujo de reinscripción para usuarios legítimos. La solución final (propuesta por FIRE) consistió en invertir ese orden: primero crear el usuario en Auth y solo después, si era un usuario nuevo, verificar la cédula duplicada. Si la cédula ya existía, se eliminaba el usuario recién creado como rollback. Además, se añadió un control de identidad en la reinscripción: si la cédula ingresada no coincide con la guardada en el progreso, el sistema bloquea el avance. Estos cambios resolvieron el conflicto sin introducir regresiones y sin depender de APIs no disponibles en el plan Spark.

**Contexto:**
> La sesión se centró en resolver el conflicto entre la validación de cédula duplicada (implementada en una sesión anterior) y la funcionalidad de reinscripción (B154). El problema era que, al volver a ingresar sus datos en el paso 1, un usuario que ya tenía cuenta y cuyo progreso estaba guardado en Firestore veía el mensaje "Esta cédula ya está registrada" y no podía continuar. Esto ocurría porque la verificación de cédula se ejecutaba antes de la llamada a `createUserWithEmailAndPassword`, impidiendo que el flujo llegara al manejo de `already-enrolled` que desencadena la reinscripción. Se probaron múltiples enfoques: usar `fetchSignInMethodsForEmail` (no disponible en Spark), intentar login con contraseña dummy (rechazado por el Operador), mover la verificación de cédula al frontend (seguía ejecutándose antes de conocer el estado del correo) y, finalmente, colocar la verificación dentro de `crearEstudiante` pero antes de `createUserWithEmailAndPassword`. Ninguno funcionó porque siempre se validaba la cédula antes de detectar el correo existente. La intervención de FIRE proporcionó la estrategia correcta: crear el usuario primero, verificar cédula después y, si el correo ya existe, saltar la verificación de cédula por completo.

**Alternativas Consideradas:**
> - **Opción A:** Verificar primero si el correo existe usando `fetchSignInMethodsForEmail`. → Rechazada por no estar disponible en el plan Spark.
> - **Opción B:** Verificar el correo mediante un intento de login con contraseña dummy y detectar el código de error. → Rechazada por el Operador.
> - **Opción C:** Mover la verificación de cédula al frontend, justo antes de llamar a `crearEstudiante`, pero solo si el correo no existe. → No se pudo implementar porque no había una forma confiable de saber si el correo existía sin llamar a la API de Auth.
> - **Opción D (FIRE):** Invertir el orden: crear el usuario en Auth primero. Si es exitoso, verificar cédula y hacer rollback eliminando el usuario si la cédula es duplicada. Si `createUserWithEmailAndPassword` falla con `already-enrolled`, retornar ese error sin verificar cédula, permitiendo al frontend ejecutar la reinscripción. → **Elegida y exitosa.**

**Impacto y Deuda:**
> - **B154** queda definitivamente cerrado. La reinscripción es ahora funcional y segura.
> - La **validación de cédula duplicada** para nuevos registros funciona correctamente y no interfiere con la reinscripción.
> - Se añadió un **control de identidad** que impide la reinscripción si la cédula ingresada no coincide con la original, previniendo suplantaciones básicas.
> - No se generó nueva deuda técnica. El código quedó más limpio y lógico, con el método `crearEstudiante` reflejando un flujo de negocio más natural.
> - Se eliminó la dependencia de APIs no disponibles en Spark, cumpliendo con las restricciones del plan.

**Para el Futuro:**
> Al diseñar flujos de registro que combinen creación de cuenta con validaciones de recursos secundarios (como cédula o cualquier otro dato único), la secuencia debe ser siempre: 1) crear el recurso principal (cuenta Auth), 2) validar los recursos secundarios, 3) hacer rollback del recurso principal si la validación secundaria falla, y 4) manejar el error de recurso duplicado (`email-already-in-use`) antes de cualquier validación secundaria. Esto evita bloqueos en flujos de retorno y mantiene la consistencia de datos.

### SESIÓN 27-28/08/2026 – Cierre de trabajo integral y protocolo de continuidad

**Importante para la siguiente instancia:**
Este bloque contiene el contexto resumido y las reglas de trabajo que se deben mantener.

#### Protocolo de trabajo usado
- Antes de tocar código, revisar archivos reales.
- No asumir reglas de negocio.
- Cuando exista lógica sensible, consultar a FIRE mediante caja XML.
- El Operador puede vetar cualquier consulta o decisión.
- Trabajar paso a paso.
- Prohibido usar `sed` para JSX.
- Siempre hacer backup previo con timestamp.
- Usar `code + ruta` para abrir archivos en VS Code.
- Verificar archivos después de cada cambio.
- No modificar `firestore.rules` sin aprobación explícita.

#### Comandos habituales
```bash
# Backup previo
mkdir -p backup/src/ruta/del/archivo
cp src/ruta/del/archivo.ext "backup/src/ruta/del/archivo.ext.backup-$(date +%Y%m%d-%H%M%S)"

# Abrir archivo
code src/ruta/del/archivo.ext

# Buscar referencias
grep -rn "texto" src/ --include="*.js" --include="*.jsx"
Reglas de negocio confirmadas
El PIN se genera silenciosamente en el Paso 1.

El PIN solo se muestra al final, en la pantalla de éxito.

Un estudiante sin reserva NO conoce su PIN.

NO se debe redirigir a login a un estudiante sin reserva por cédula no coincidente.

Recompra y reinscripción/progresoInscripcion son flujos distintos.

En recompra NO se muestra ni se genera un PIN nuevo.

duracionTotal <= 120 indica curso de un día; > 120, dos días.

Los cursos de 1 día no generan fecha2 ni bloquean el día siguiente.

crearLock solo crea locks nuevos.

renovarLock solo actualiza expiresAt.

Siempre usar margen de 10 segundos contra clock skew en expiresAt.

Principales archivos trabajados
src/modules/inscripcion/views/InscripcionView.jsx

src/modules/inscripcion/services/LockService.js

src/modules/inscripcion/services/ReservaService.js

src/modules/public/views/CursosPublicosView.jsx

src/modules/public/components/ModalCursoDetalle.jsx

src/modules/estudiante/views/EstudiantePanel.jsx

src/modules/instructor/views/InstructorPanel.jsx

src/modules/sesiones/hooks/useSessionTimer.js

src/modules/shared/utils/fechas.js

src/constants/tiposCurso.js

docs/MIGRACION_PRODUCCION.md

Deuda técnica/pendientes
Verificar reglas para actualizar solo expiresAt en ocupacionTemporal.

Evaluar limpieza de locks viejos con motoAsignadaId: null.

Extraer subcomponentes de EstudiantePanel si es necesario.

Consolidar validaciones de prerequisitos.

Posible mejora futura: bloques flexibles para combos/cursos de duración variable.

#### [ARQUITECTO] – 2026-08-28 – Mejora de vista de reservas administrativas

**Decisión/Lección Clave:**
> La implementación de filtros combinados y sección "Hoy" con badges (HOY, EN CURSO, PRÓXIMA) mejoró significativamente la usabilidad. La validación de FIRE con estructura XML estandarizada fue esencial para detectar la necesidad de usar zona horaria Venezuela explícita y complementar la detección de "en curso" con `estadoCurso !== 'Completado'`.

**Contexto:**
> El panel administrativo tenía una vista de reservas poco clara: no se identificaba la siguiente reserva, no se mostraban las que estaban ocurriendo y no se podía filtrar por fechas. Se abordó una mejora integral en `AdminReservasList` y `AdminReservasHome`, sin modificar reglas de Firestore.

**Alternativas Consideradas:**
> - Incluir filtros por tipo de moto/sabeBicicleta → Rechazado por YAGNI (recomendación de FIRE).
> - Mantener orden por defecto recientes → Se cambió a `curso_cercano` con selector visible para no afectar expectativa.

**Impacto y Deuda:**
> Se crearon utilidades `reservasHelpers.js` con funciones de fecha/hora Venezuela y detección de reservas en curso. Se añadieron filtros por rango de fechas, sede, curso e instructor. La home ahora muestra sección "Hoy" con badges. Sin nueva deuda técnica.

**Para el Futuro:**
> Si el admin solicita recordar filtros, implementar persistencia en localStorage. Verificar que los horarios tengan `horaInicio`/`horaFin` para detección precisa.

#### [ARQUITECTO] – 2026-08-28 – Corrección definitiva de locks corruptos y PIN faltante + mejoras admin

**Decisión/Lección Clave:**
> Los locks corruptos no solo estaban en `locks`; también existían documentos huérfanos en `ocupacionTemporal`. La purga debe consultar ambas colecciones. La purga automática en cliente falla por permisos de Firestore; debe ser manual desde panel admin con reglas que limiten el borrado a locks expirados/corruptos. El PIN debe guardarse en la reserva como respaldo permanente y capturarse antes de limpiar sesión/progreso.

**Contexto:**
> Persistían dos bugs críticos: horarios que aparecían disponibles pero al seleccionarlos decían “apartado por otro usuario”, especialmente en cursos de un día como Equilibrio; y a algunos estudiantes no se les mostraba el PIN final. Se implementaron correcciones en `LockService`, `InscripcionView`, `ReservaService`, `AdminReservaDetalle` y reglas de Firestore.

**Alternativas Consideradas:**
> - Purga automática en cliente → descartada por error de permisos (`Missing or insufficient permissions`) al no poder leer locks ajenos.
> - Borrado total de locks por admin → descartado por FIRE; se limitó a locks expirados/corruptos.
> - Mostrar PIN desde estado local únicamente → se añadió respaldo en Firestore y guardado en la reserva.

**Impacto y Deuda:**
> Se corrigieron disponibilidad fantasma y PIN faltante. Se añadió botón “Purgar locks corruptos (7 días)” en `AdminOcupacion`. Se modificaron reglas de Firestore para permitir al admin borrar locks corruptos/expirados sin afectar estudiantes. Sin nueva deuda técnica.

**Para el Futuro:**
> Validar siempre la estructura de locks en el filtro de disponibilidad y en `handleSelectHorario`. Mantener la purga manual en admin y no reintroducir purga automática en cliente. Considerar migrar a Cloud Functions para purgas programadas si el volumen crece.

#### [ARQUITECTO] – 2026-08-30 – Correo de bienvenida con PIN y limpieza de recuperación fallida

**Decisión/Lección Clave:**
> El envío de correo de bienvenida con PIN usando EmailJS y Gmail (sin dominio personalizado) es viable en plan Spark y funciona correctamente. El error 422 de EmailJS se debía a que el campo `correo` estaba vacío en algunos flujos; se solucionó validando los datos antes de enviar. La recuperación de contraseña mediante `sendPasswordResetEmail` no redirige a una página personalizada en Firebase Auth para web porque Firebase siempre usa la página intermedia `__/auth/action`; por ello se eliminó el código de recuperación y se dejó como deuda técnica.

**Contexto:**
> Se implementó un correo de bienvenida que incluye el PIN de acceso para respaldar la pantalla de éxito. Se creó `EmailService.js` con EmailJS y se integró en `InscripcionView.jsx`. Durante las pruebas, el primer intento falló con 422 por destinatario vacío; tras agregar validación, el envío fue exitoso. Posteriormente se limpió el código de recuperación de PIN personalizada que no funcionaba y se eliminaron los archivos residuales.

**Alternativas Consideradas:**
> - Usar dominio personalizado en EmailJS → descartado por requerir plan de pago.
> - Mantener la recuperación de PIN con `sendPasswordResetEmail` → descartado porque no se podía redirigir a la página propia.
> - Usar SendGrid u otro proveedor → viable pero se pospuso; EmailJS fue suficiente para el caso.

**Impacto y Deuda:**
> El estudiante ahora recibe su PIN por correo además de verlo en pantalla. La recuperación de PIN sigue pendiente. Se eliminó `ResetearPinView.jsx`, `action.html` y las referencias en `LoginView.jsx` y `App.jsx`. Sin nueva deuda técnica, pero se mantiene la deuda de recuperación de PIN.

**Para el Futuro:**
> Evaluar SendGrid o migrar a plan Blaze para mayor control y seguridad del envío. Mantener las credenciales de EmailJS en `.env` y nunca en el código. Si se implementa recuperación de PIN, considerar un flujo propio con código temporal en Firestore.

#### [ARQUITECTO] – 2026-08-31 – Análisis profundo de relojes en Aula Virtual (modo solo lectura)

**Decisión/Lección Clave:**
> El Aula Virtual tiene múltiples fuentes de tiempo (general, diario, módulo, pausa, reserva, efectivo) y la confusión actual nace de mezclarlas en la interfaz. Además, se confirmó que el reloj grande usa `generalSegundos` global en lugar de un cálculo basado en día, por lo que no se detiene en 120 min el primer día. La reserva se vuelve 0 al activarse por mala sincronización del restante inicial. El indicador D1/D2 no cambia automáticamente al entrar al segundo día.

**Contexto:**
> Se realizó una revisión integral del flujo del Aula Virtual: suscripción a Firestore, heartbeat del estudiante, tick local, cálculo en `useSessionTimer` y renderizado en `AulaVirtualView`. Se detectaron varios fallos que persistían desde iteraciones anteriores, algunos supuestamente corregidos pero no montados correctamente en producción.

**Alternativas Consideradas:**
> No se propusieron cambios; solo análisis en modo solo lectura. Se dejaron las correcciones pendientes para una nueva sesión.

**Impacto y Deuda:**
> Se registraron como pendientes:
> - El reloj grande no respeta el límite diario de 120 min.
> - La reserva no conserva su restante al usarse y no se refleja en la franja.
> - Al agotarse el reloj general no se pueden iniciar más módulos aunque exista reserva.
> - El indicador D1/D2 no se actualiza automáticamente al cambiar de día.
> - Falta alerta sonora al finalizar módulo.
> Además, se identificó que `ocupacionTemporal` no guardaba `userId`, causando el bloqueo EN_ESPERA_PAGO; se corrigió `crearLock` para incluirlo.

**Para el Futuro:**
> Al retomar, priorizar la corrección de `tiempoRestanteCurso` para que use día actual y `diarioSegundos`, corregir la reserva y la bandera `puedeIniciarModulo`, y añadir la actualización automática del indicador de día al montar el componente.

#### [ARQUITECTO] – 2026-09-01 – Corrección de relojes D1/D2 y alerta sonora

**Decisión/Lección Clave:**
> La solución híbrida aprobada por FIRE (cálculo en cliente + campos `tiempoAcumuladoHastaD1` y `pausasHastaD1`) corrigió definitivamente el problema de los relojes en cursos de dos días. El indicador D1/D2 ahora es automático y no requiere escrituras adicionales. La alerta sonora al completar módulo se implementó con Web Audio API y es configurable, cumpliendo las políticas de autoplay.

**Contexto:**
> Tras la sesión del 31/08/2026, quedaron pendientes: reloj grande no se detenía en 120 min el día 1, reserva se volvía 0 al activarse, indicador D1/D2 no cambiaba automáticamente y faltaba alerta sonora. Se preparó consulta formal a FIRE con formato XML. FIRE respondió **APROBADA CON CONDICIÓN**: era necesario agregar `tiempoAcumuladoHastaD1` y `pausasHastaD1` a la lista blanca del instructor en las reglas de Firestore. Se aplicó esa condición y se implementó la solución completa.

**Archivos modificados/creados:**
- `src/modules/shared/utils/audio.js` (nuevo)
- `src/modules/sesiones/hooks/useSessionTimer.js` (reestructuración de cálculo por día)
- `src/modules/aula/views/AulaVirtualView.jsx` (toggle de sonido y uso de nuevos campos)
- Reglas de Firestore actualizadas manualmente (campos `tiempoAcumuladoHastaD1`, `pausasHastaD1`)

**Bugs cerrados / Deuda atendida:**
- B119 (cambio automático D1→D2) queda resuelto.
- Reloj grande respeta límite diario de 120 min en D1 y total de 240 min en D2.
- Reloj diario se reinicia correctamente en D2.
- Reserva conserva su restante y se muestra en la interfaz.
- Alerta sonora al finalizar módulo implementada (configurable).

**Deuda técnica vigente:**
- B118 (flujo completo de reserva de tiempo) parcialmente atendido; se mantiene para refinamiento.
- B120 (registro de tiempo excedente) sigue pendiente.
- Recuperación de PIN sigue pendiente (deuda previa).

**Para el Futuro:**
> Probar en producción los cursos de dos días. Si se detecta que la escritura adicional al cambiar de día falla por reglas, revisar la consola de Firestore. Mantener el patrón de cálculo híbrido y no duplicar lógica en servicios.
EOF