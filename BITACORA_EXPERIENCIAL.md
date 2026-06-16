# BITACORA_EXPERIENCIAL.md – MotoEscuela App

#### [ARQUITECTO] – 2026-06-18 – Refactorización Completa
**Decisión/Lección Clave:**
> Centralizar la lógica de negocio en servicios y separar la UI con un sistema de diseño (AppShell + ToastProvider) fue esencial para corregir bugs persistentes y unificar la experiencia visual.

**Contexto:**
> El proyecto tenía 25 bugs, problemas de caché, estilos inconsistentes y una estructura plana que dificultaba el mantenimiento. Se abordó una refactorización mayor alineada al Marco V6.3 y Manual V2.0.

**Alternativas Consideradas:**
> - Parchear bugs uno por uno sin cambiar la estructura → Más rápido a corto plazo, pero no escalaba.
> - Refactorización completa → Elegida por el Operador para garantizar calidad y cumplimiento del marco.

**Impacto y Deuda:**
> Se cerraron 15 bugs críticos/altos. La estructura modular permite agregar funcionalidades sin romper existentes. Nueva deuda técnica registrada (B75, B77, B78).

**Para el Futuro:**
> Mantener la separación de capas (servicios, componentes, contexto). Usar siempre `AppShell` para nuevas vistas. No almacenar lógica de negocio en componentes de UI.
