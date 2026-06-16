# ARRANQUE MEMORIA_IA.md – MotoEscuela App v1.7.3
## Contexto de Emergencia para el Arquitecto IA

**Instrucción:** Asimila este contenido como tu memoria. Eres el Arquitecto del proyecto "MotoEscuela App". Aplica el Marco de Trabajo V6.3 y el Manual del Arquitecto V2.1.

### 1. Proyecto y Stack
- **Nombre:** MotoEscuela App v1.7.3
- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3 + React Router 6 + Lucide React.
- **Backend:** Firebase (Auth, Firestore). Plan Spark.
- **Entorno:** Desarrollo en Termux (móvil). Comandos `cat << 'EOF'`.

### 2. Estructura del Proyecto (Refactorizada)
```
src/modules/
├── auth/services/       # AuthService.js
├── inscripcion/
┄│   ├── services/        # ReservaService.js, LockService.jss
│   └── components/      # ModalPIN.jsx
├── admin/services/      # StaffService.js
├── shared/
│   ├── components/      # UI.jsx, AppShell.jsx, ToastProvider.jsx
│   ├── context/         # AppContext.jsx, AppContextValue.jsx
│   └── firebase/        # firebase.js
└── views/             #VIstas principales
```

### 3. Decisiones Arquitectónicas Clave
1.  **Creación temprana:** Cuenta creada al final del PASO 1.
2.  **Auth anónima ELIMINADA.**
3.  **appId:** `motoescuela-pro-v1`.
4.  **Campo de fecha:** `fecha` (no `fecha1`).
5.  **Sistema de Diseño:** `AppShell` + `ToastProvider`.
6.  **Persistencia:** `sessionStorage` para paso, datos y PIN.
7.  **Locks:** 10 min, contador SVG, renovación única, expira autom.
8.  **Disponibilidad:** Cálculo en tiempo real con `useMemo`.
9.  **StaffService:** REST API para crear staff (sin cerrar sesión admin).
10. **Reglas Firestore:** Lectura restringida a `isAuth()`.

### 4. Bugs Corregidos (Última Sesión)
B15, B17, B51, B62, B14/B46/B60, B27, B42a, B76, C1, C2, B55, B71-B74.
Ajustes visuales: Paso 4 factura, reloj SVG, moto en barra, límite 15 días, sugerencia de fecha.

### 5. Archivos Clave Modificados
- `InscripcionView.jsx` (múltiples mejoras)
- `DashboardView.jsx` (AppShell + rol en CRUDView)
- `LoginView.jsx`, `PortalEstudiante.jsx`, `EstudiantePanel.jsx` (AppShell + useToast)
- `AppContext.jsx` (restauración sesión, StaffService, saveMoviriento con userId)
- `StaffService.js` (NUEVO)
- `AppShell.jsx` (NUEVO)
- `ToastProvider.jsx` (NUEVO)
- `vite.config.js` (NUEVO, anti-caché)

### 6. Protocolo para Transferencia de Archivos (Base64)
**Problema:** Las rutas largas, árboles de directorios o bloques de código con caracteres especiales pueden desbordar la caja de texto del chat y corromper el archivo al copiarlo.
**Solución:** Usar codificación Base64 para transferir contenido de forma segura.

**Para generar el bloque (Arquitecto):**
```bash
Base64 -w 0 archivo_a_transferir.md
```
Esto produce una cadena de texto sin saltos de línea que se puede pegar en el chat sin riesgo.

**Para decodificar y restaurar el archivo (Operador):**
```bash
Base64 -d << 'ENDOFFILE' > archivo_destino.md
[CADENA_BASE64]
ENDOFFILE
```
**Nota:** La cadena Base64 debe pegarse tal cual, sin modificaciones. El comando `Base64 -d` la decodifica y restaura el archivo exacto.