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
