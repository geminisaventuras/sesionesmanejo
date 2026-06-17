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
