# 09 — Aula virtual y sesiones

| Campo | Valor |
|---|---|
| ID | FLUJO-09 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente E2E |
| Archivos clave | `AulaVirtualView.jsx`, `useSessionTimer.js`, `RelojSesion`, `ModuloItem`, `ReservaPanel`, `ReservaActivaPanel`, `firestore.rules` |
| Deudas | `B-AULA-PRESENCIA-HEARTBEAT`, `B-AULA-TZ`, `B-REVERTIR-MODULO`, `B-PAUSA-60`, `B-AULA-TIMESTAMPS-CLIENTE` |

## 1. Objetivo y alcance
Ejecutar la sesión práctica: iniciar/pausar/reanudar, medir tiempos D1/D2, completar módulos, cerrar el curso y avanzar el pack.
No cubre pagos (FLUJO-07), agendamiento (FLUJO-03/06) ni reasignación (FLUJO-08).

## 2. Actores y rutas
- Ruta `/aula/:reservaId` con `ProtectedRoute allowedRoles={['instructor','estudiante']}` (`App.jsx:131-135`).
- **Instructor/admin:** controla módulos, pausas, reserva de tiempo y cierre.
- **Estudiante:** visualiza el aula y mantiene presencia; no puede escribir tiempos (el hook devuelve no-ops para sus acciones, `useSessionTimer.js:606-617`).

## 3. Guards de acceso (`AulaVirtualView.jsx`)
- **BOLA:** solo admin, dueño, instructor asignado o miembro de `implicadosIds` (`:83-100`); si no, pantalla “Acceso Restringido”.
- **Pago:** si `estadoPago !== 'Aprobado'`, estudiante vuelve al portal e instructor a `/instructor` (`:113-124`, `:184-195`).
- **Listener:** `permission-denied` bloquea el aula (`:102-111`).
- El header muestra curso, sede, tutor, badge de reposición y material de apoyo (`:217-346`).

## 4. Presencia del estudiante
- El estudiante escribe `estudiantePresente = Date.now()` al montar, al volver a la pestaña y al recuperar conexión; al desmontar lo pone en `null` (`useSessionTimer.js:76-109`).
- El instructor solo puede iniciar el **primer módulo** si `estudiantePresente` existe y tiene menos de 2 minutos (`:291-294`).
- No hay heartbeat periódico: la presencia depende de eventos de ciclo de vida.

## 5. Reloj y cálculos D1/D2 (`useSessionTimer.js:117-230`)
- Día actual: 1 si no hay `fecha2` o si hoy < `fecha2`; 2 si hoy >= `fecha2` (`:33-37`).
- Límite total = `sesionTotalLimite` o `curso.duracionTotal` (240 por defecto).
- Límite diario = mitad del curso si hay `fecha2`; si no, total.
- Pausas: `pausaTotalAcumulada` + pausa en curso (`:138-143`).
- D1: tiempo desde `sesionTotalInicio` menos pausas, tope diario (`:149-155`).
- D2: tiempo desde `sesionDiariaInicio` menos pausas de D2; detecta transición de día (`:160-170`).
- `tiempoEfectivo = limiteTotal*60 - pausaTotalAcumulada` (`:190`).
- `totalCompletado` y `diarioCompletado` se derivan de esos segundos (`:188-189`).
- El reloj se recalcula cada segundo con un `setInterval` (`:111-115`).

## 6. Inicio de módulo (`iniciarModulo`, `:280-365`)
Guards:
1. Curso/horario disponibles y pago aprobado (`:283-285`).
2. Si es el primer módulo del curso, exige estudiante presente (<2 min) (`:287-294`).
3. No iniciar antes de `reserva.fecha` (`:296-297`).
4. No iniciar después de `fecha2` (o `fecha` si no hay D2) (`:298-300`).
5. No iniciar antes de la hora de inicio del bloque (`:302-309`).
6. Calcula día, límite diario y si es el primer inicio del día (`:311-333`).
7. Si es D2, congela `tiempoAcumuladoHastaD1` y `pausasHastaD1` (`:346-354`).
8. Escribe `moduloEnProgreso`, `sesionDiariaInicio`, `sesionDiariaLimite`, `diaActual`, `sesionTotalInicio` y `sesionTotalLimite` (`:339-360`).

## 7. Persistencia y permisos
- `actualizar` usa `updateDoc` directo (`:255-278`).
- Si el instructor fue reasignado, Firestore devuelve `permission-denied`; el hook hace rollback local, avisa “La clase fue reasignada” y redirige a `/instructor` (`:260-275`).
- La regla permite al instructor escribir solo campos de sesión (`firestore.rules:138-159`); al dueño solo `estudiantePresente` (`:178-183`); admin cualquier campo (`:135-136`).
## 8. Ciclo de módulos
- `toggleModulo` decide iniciar o finalizar según el estado (`useSessionTimer.js:462-501`).
- **Finalizar:** guarda `fecha`, `horaInicio`, `horaFin`, `duracion` (máx. 60) y `duracionExtra`; limpia el módulo en progreso (`:367-391`).
- Si todos los módulos tienen fecha, marca `estadoCurso: 'Aprobado'` (`:387-391`).
- **Revertir un módulo completado:** pide confirmación, borra la fecha, conserva `duracionParcial`/`duracionExtraParcial` y reabre el módulo (`:465-484`). No recalcula `estadoCurso` si ya estaba `Aprobado`.
- **Cierre manual:** el instructor puede marcar todos los pendientes como completados con duración 0 (`:535-558`); la UI solo muestra el botón cuando el tiempo está agotado (`AulaVirtualView.jsx:135`, `:313`).
- Ambos cierres disparan `avanzarPackTrasCompletarCurso` si la reserva es `pack_sub` (`:401-409`, `:560-570`).

## 9. Pausas y tiempo reservado
- **Pausar sesión:** guarda `pausaActiva { motivo, inicio }` (`:412-427`).
- **Reanudar:** si la pausa duró más de 60 min, limpia `pausaActiva` y `moduloEnProgreso` y avisa “Sesión finalizada” (`:429-445`); si no, agrega la pausa a `pausas`, actualiza `pausaTotalAcumulada` y `tiempoEfectivo` (`:447-452`).
- **Reserva de tiempo:** al completar el tiempo total y tener pausas acumuladas, el instructor puede “activar reserva” y descontar ese tiempo después (`:503-533`); `detenerReserva` devuelve el restante a `pausaTotalAcumulada` (`:579-591`).
- La UI expone pausa, reanudación, reserva y cierre manual (`AulaVirtualView.jsx:270-313`, `:346`).

## 10. Datos y estados
| Campo | Uso |
|---|---|
| `estadoPago` | Debe ser `Aprobado` para entrar y operar |
| `estadoCurso` | `Pendiente` → `Aprobado` al completar todos los módulos |
| `sesionTotalInicio/Limite` | Inicio y límite total del curso |
| `sesionDiariaInicio/Limite`, `diaActual` | Control diario D1/D2 |
| `tiempoAcumuladoHastaD1`, `pausasHastaD1` | Congelado al pasar a D2 |
| `pausaActiva`, `pausas`, `pausaTotalAcumulada`, `tiempoEfectivo` | Pausas y tiempo efectivo |
| `moduloEnProgreso`, `modulosEstado` | Módulo actual e histórico |
| `reservaActiva`, `reservaInicio`, `reservaRestante*` | Tiempo reservado |
| `estudiantePresente` | Heartbeat del estudiante (epoch ms) |
| `emergencia` | Reporte de emergencia (`AulaVirtualView.jsx:157`) |

## 11. Reglas de Firestore
| Operación | Regla |
|---|---|
| `reservas.read` | admin, dueño, instructor o `implicadosIds` (`:100-105`) |
| `reservas.update` instructor | solo campos de sesión listados (`:138-159`), incluido `emergencia` |
| `reservas.update` dueño | solo `estudiantePresente` (`:178-183`) |
| `reservas.update` admin | cualquier campo (`:135-136`) |
| `reservas.delete` | denegado (`:186`) |

## 12. Invariantes
- Sin pago aprobado no se entra ni se inicia sesión.
- El primer módulo exige estudiante presente (<2 min).
- No se inicia antes de la fecha ni después de `fecha2`/`fecha`.
- El módulo se limita a 60 min + excedente.
- Al completar todos los módulos, `estadoCurso` pasa a `Aprobado`.
- El cierre manual solo lo puede hacer instructor/admin.
## 13. Por qué está diseñado así
- **Presencia:** evita que el instructor inicie sin el alumno.
- **D1/D2:** reparte el curso en dos días y congela lo consumido en D1.
- **Pausas:** descuentan tiempo real y alimentan `tiempoEfectivo`.
- **Reserva de tiempo:** permite recuperar pausas sin alargar el curso.
- **Cierre manual:** resuelve sesiones donde el cronómetro no alcanzó pero el alumno sí completó.
- **Permisos por campo:** el estudiante solo puede reportar presencia; el instructor controla la sesión.

## 14. Dependencias críticas
- FLUJO-04 (espejo) y FLUJO-08 (reasignación): si cambia el instructor, el aula se cierra.
- FLUJO-06 (pack): el cierre del curso dispara el avance.
- FLUJO-11 (finanzas): `tiempoEfectivo`, pausas y cierre manual afectan pagos.
- `AulaVirtualView` depende de `cursos`, `horarios`, `instructores` y `sedes` del contexto.

## 15. Qué se rompe si se cambia
- **Quitar el guard de pago:** se puede iniciar sin pagar.
- **Quitar la presencia:** el instructor inicia solo.
- **No congelar D1:** se duplican tiempos al pasar a D2.
- **No limpiar `moduloEnProgreso`:** el reloj sigue corriendo tras finalizar.
- **No disparar el avance del pack:** el alumno queda bloqueado.
- **Cambiar los campos permitidos por regla:** el instructor pierde el aula o el estudiante puede escribir tiempos.

## 16. Costos y cuotas
- 1 `onSnapshot` por sesión + 1 `updateDoc` por acción.
- Heartbeat del estudiante: escrituras al montar/visibility/online/unmount (no periódicas).
- Cada segundo se recalcula en memoria; no hay escritura por segundo.
- El cierre manual escribe un solo documento.

## 17. Errores e idempotencia
- `permission-denied` por reasignación: rollback local + redirect (`:260-275`).
- `iniciarModulo` es idempotente en la práctica: si ya hay `moduloEnProgreso`, el toggle finaliza en vez de reiniciar.
- `finalizarModulo` repetido: si el módulo ya tiene fecha, el toggle ofrece revertir, no volver a finalizar.
- Cierre manual repetido: si no quedan pendientes, devuelve `modulosCompletados: 0`.
- Sin conexión: `updateDoc` falla y no hay cola de reintentos; el estado local puede quedar desincronizado.
- El reloj usa `Date.now()` del cliente; un cambio de hora del dispositivo altera los cálculos.

## 18. Pruebas
- Acceso: dueño, instructor, implicados, admin y usuario ajeno (BOLA).
- Pago pendiente: estudiante e instructor no pueden operar.
- Iniciar antes de la hora, después de `fecha2` y en fecha correcta.
- Primer módulo sin estudiante presente; con presencia fresca y con presencia >2 min.
- Pausar/reanudar; pausa >60 min.
- Completar todos los módulos y verificar `estadoCurso: Aprobado` + avance de pack.
- Revertir un módulo después de `Aprobado` y verificar estado/paquete.
- Cierre manual y verificar duraciones 0, `completadoManualmente` y avance.
- Reasignar instructor con el aula abierta y verificar redirect.

## 19. Riesgos, hallazgos y deudas
- **`B-AULA-PRESENCIA-HEARTBEAT`:** no hay heartbeat periódico; si el estudiante abre el aula y espera >2 min, el instructor no puede iniciar el primer módulo (`:291-294`). Varias pestañas pueden borrar la presencia al cerrar una (`:107`).
- **`B-AULA-TZ`:** las fechas se calculan en Caracas (`:23-31`), pero la hora de inicio se compara con `new Date().getHours()` local (`:302-309`); en otra zona horaria puede bloquear o permitir mal. `finalizarModulo` usa fecha local ISO (`:377`).
- **`B-REVERTIR-MODULO`:** revertir un módulo no baja `estadoCurso` de `Aprobado` ni revierte el avance del pack (`:465-484`); puede quedar un curso “aprobado” con módulos pendientes.
- **`B-PAUSA-60`:** una pausa >60 min limpia `pausaActiva` y `moduloEnProgreso` pero no registra la pausa ni finaliza el curso (`:440-445`); el tiempo queda inconsistente.
- **`B-AULA-MANUAL-COMPLETE`:** el cierre manual marca módulos con duración 0 y `completadoManualmente` (`:546-558`); la UI lo restringe a tiempo agotado, pero el hook no valida esa condición.
- **`B-AULA-TIMESTAMPS-CLIENTE`:** los tiempos se escriben con `Date.now()` del navegador; un instructor podría alterar `sesionTotalInicio`/pausas desde el cliente. Impacta finanzas.
- **`B-AULA-D1-LATE` [POR VERIFICAR]:** si hay `fecha2`, se puede iniciar D1 después de `fecha` y antes de `fecha2` (`:296-300`); no hay guard de “día correcto”.
- **`B-AULA-OFFLINE`:** sin cola de reintentos; una caída de red puede perder la acción.
- **`B-AULA-ADMIN-ROUTE`:** `esInstructor` incluye admin (`AulaVirtualView.jsx:49`), pero la ruta solo permite instructor/estudiante (`App.jsx:132`); el admin no puede abrir el aula.
- **`B-AULA-EMERGENCIA`:** guarda `emergencia` en la reserva, pero no crea notificación ni alerta al admin (`AulaVirtualView.jsx:157`).

## 20. Supuestos / por verificar
- [SUPUESTO] El instructor inicia en la fecha/hora correctas.
- [SUPUESTO] El alumno mantiene la pestaña abierta.
- [SUPUESTO] `curso.modulos` coincide con los módulos usados en `modulosEstado`.
- [POR VERIFICAR] Zona horaria de los instructores fuera de Venezuela.
- [POR VERIFICAR] Uso real del cierre manual y su impacto en finanzas.

## 21. Contradicciones detectadas
- “Sesión finalizada” por pausa >60 min no cambia `estadoCurso` ni registra el cierre.
- El modal de cierre manual dice “irreversible”, pero `toggleModulo` permite revertir módulos completados.
- La presencia se presenta como heartbeat, pero solo se actualiza en eventos de ciclo de vida.
- El código soporta admin en el aula, pero la ruta no lo permite.

## 22. Enlaces
`docs/flujos/04-reserva-y-espejo.md`, `docs/flujos/06-agendamiento-pack.md`, `docs/flujos/07-aprobacion-rechazo-pagos.md`, `docs/flujos/08-reasignacion-horarios-d2.md`, `firestore.rules`.

## 23. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |


