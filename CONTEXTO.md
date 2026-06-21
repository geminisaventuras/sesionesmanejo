
## Decisiones recientes (20/06/2026)
- Compactación de márgenes en paso 1 (gap-2, mb-0.5) para ganar espacio vertical.
- Selector de fecha de nacimiento con tres ruedas (día/mes/año) usando ResizeObserver y medición real de posiciones de elementos.
- Formulario de salud obligatorio como modal, con pregunta de condición médica y detalle condicional.
- Stepper con círculos navegables hacia pasos ya completados.
- Paso 3 unificado con diseño azul, cinta de fechas dinámica centrada en la fecha seleccionada.
- Paso 4 con desglose de precios en factura, iconos en acordeón de pago móvil, captcha junto a referencia, reloj de cuenta regresiva dentro de la tarjeta.
- Correo electrónico y contacto de emergencia añadidos al paso 1.

## Modo de ejecución
MVP Simplificado (según Super Marco de Trabajo V6.3).

## Decisiones del 20/06/2026 (segunda sesión)
- Login unificado con pestañas Estudiante (correo+PIN) y Staff (email+clave+Google).
- Registro de estudiantes con correo real en lugar de correo sintético.
- Reconocimiento del rol de administrador desde la colección dmins en Firestore.
- Persistencia offline de Firestore (enableIndexedDbPersistence) para evitar reinicio de tasas.
- Reglas de seguridad de Firestore actualizadas: acceso restringido por rol (admin/instructor/estudiante).
- Copia de datos de pago móvil al portapapeles con código del banco.
- Ajustes visuales en el paso 3 (botón "Ver calendario completo" con iconos) y paso 4 (reloj dentro de la tarjeta de pago).
