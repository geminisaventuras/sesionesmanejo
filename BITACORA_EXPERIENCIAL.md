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
