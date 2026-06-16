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
