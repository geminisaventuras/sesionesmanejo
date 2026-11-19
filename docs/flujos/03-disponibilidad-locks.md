# 03 — Disponibilidad y locks

| Campo | Valor |
|---|---|
| ID | FLUJO-03 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente prueba E2E y revisión FIRE/MAMBA |
| Archivos clave | `useOcupacionConfirmada.js`, `useDisponibilidad.js`, `useDisponibilidadPack.js`, `LockService.js`, `InscripcionView.jsx`, `AgendarPackView.jsx` |
| Deudas | `B-RATELIMIT-LOCKS`, `B-ALERTA-CUOTA-FIRESTORE`, `B-ESPACIO-LIMITE-100` |

## 1. Objetivo y alcance
Determinar qué bloques (fecha + hora + instructor + moto) están libres y **separar** el elegido con un lock temporal.
Cubre la disponibilidad individual y la de packs. No cubre la creación de la reserva (FLUJO-04).

## 2. Fuentes de verdad
| Fuente | Colección | Uso |
|---|---|---|
| Reservas confirmadas (espejo) | `ocupacionConfirmada` | Ocupación permanente (Pendiente/Aprobado) |
| Locks vivos | `ocupacionTemporal` | Ocupación temporal visible para todos los auth |
| Locks legacy | `locks` | Validación de propiedad en el servicio |
| Bloqueos admin | `bloqueosAdmin` | Cierres por administración |
| Bloqueos proveedor | `bloqueosGlobales` | Cierres por proveedor/moto |
| Bloqueos instructor | `bloqueosInstructores` | Cierres por instructor |
| Catálogos | `instructores`, `motos`, `horarios`, `cursos` | Recursos y reglas de elegibilidad |

## 3. Cálculo de disponibilidad
1. `useOcupacionConfirmada` abre **2 listeners** por fecha: `where('fecha','in',[f1,f2])` y `where('fecha2','in',[f1,f2])`, con `limit(100)` por query (`useOcupacionConfirmada.js:71-118`, `143-204`). Solo considera `Pendiente`/`Aprobado` (`:13`).
2. `useDisponibilidad` (individual) construye un cache O(1) por fecha+bloque+recurso (`useDisponibilidad.js:106-145`) y evalúa cada bloque (`:24-98`).
3. `useDisponibilidadPack` hace lo propio para packs, agregando bloqueos admin/proveedor e `instructoresPermitidos` (`useDisponibilidadPack.js:34-232`).
4. `InscripcionView.evaluarDisponibilidad` filtra instructores por `instructoresPermitidos` **fail-closed** (si el array está vacío, nadie es elegible) (`InscripcionView.jsx:105-109`).
5. Estados de bloque: `ALMUERZO`, `CERRADO`, `RESERVADO`, `NO_DISPONIBLE`, `EN_ESPERA_PAGO` (`useDisponibilidad.js:29-33`; `InscripcionView.jsx:237-268`).

## 4. Locks
- **ID determinístico:** `fecha_horaId_instructorId_motoId|sinmoto` (`InscripcionView.jsx:1339`; `AgendarPackView.jsx:413`).
- **Creación atómica:** escribe `locks` + `ocupacionTemporal` en un `writeBatch` (`LockService.js:9-41`).
- **Duración:** 10 min con margen de 10 s (`LockService.js:5-6`); renovación permitida una vez en la UI (`InscripcionView` `renovacionUsada`).
- **Liberación:** borra ambas colecciones (`LockService.js:64-78`).
- **Listener:** `escucharOcupacionTemporal(fecha)` filtra expirados en memoria (`:195-211`).
- **Validación:** estructura + expiración (`:85-110`).

## 5. Reglas y permisos
| Operación | Regla |
|---|---|
| `locks.read` | dueño o admin (`firestore.rules:35`) |
| `locks.create` | dueño; expiración ≤ 15 min; permite recrear si el anterior expiró (`:36-43`) |
| `locks.update` | dueño; solo `expiresAt` (`:44-46`) |
| `locks.delete` | dueño o admin (`:47-50`) |
| `ocupacionTemporal.read` | cualquier autenticado (`:54`) |
| `ocupacionTemporal.create` | requiere lock del mismo usuario (`:55-58`) |
| `bloqueosGlobales.read` | público (`allow read: if true`) |

## 6. Estados y motivos
| Estado | Significado |
|---|---|
| `ALMUERZO` | Bloque marcado `isLunch` |
| `CERRADO` | Fecha pasada o bloque ya iniciado hoy |
| `RESERVADO` | Sin instructor/moto libres por reservas |
| `NO_DISPONIBLE` | Todos los instructores permitidos están bloqueados |
| `EN_ESPERA_PAGO` | Hay lock de otro usuario (pago en curso) |

## 7. Invariantes
- Un lock pertenece a un solo usuario y se valida por ID determinístico.
- La UI no muestra como libre un bloque con lock ajeno vigente.
- La disponibilidad usa `getHoraIdOcupacion` para D2 (`horaIdReposicion`) y no lee `horaId` directo.
- El recurso (instructor/moto) solo se considera libre si no hay reserva ni lock de otro.
- El lock expira solo; no hay purga automática en cliente (la purga es manual/admin).

## 8. Por qué está diseñado así
- **Plan Spark:** se usan listeners solo donde hace falta; `useBloqueosAdmin` usa `getDocs` (colección pequeña) para evitar listeners permanentes.
- **ALT-4 (huevo-gallina):** `fechaConsultada` se setea cuando ambos listeners emitieron, para que el auto-jump no confíe en datos stale (`useOcupacionConfirmada.js:20-22`, `135-141`).
- **ALT-A:** `bloqueos === null` significa “no cargado”; evita que el auto-jump corra con datos vacíos.
- **`useStableArray`:** estabiliza arrays por ID para evitar re-renders y loops.
- **Fail-closed de `instructoresPermitidos`:** si el curso no tiene config, nadie puede asignarse (detección de config faltante).
- **INC-2026-11-17:** un loop de auto-jump agotó la cuota Spark; por eso el auto-jump está desactivado en ambos entornos (hotfix).

## 9. Dependencias críticas
- Consumido por FLUJO-01 (inscripción individual), FLUJO-05/06 (packs) y FLUJO-04 (locks de la transacción).
- El cross-check BUG-2 consulta `ocupacionTemporal` (D1) además del espejo.
- Los bloqueos admin/proveedor/instructor alimentan los motivos de no disponibilidad.

## 10. Qué se rompe si se cambia
- **Cambiar el formato del `lockId`:** se rompen creación, validación y borrado (y las reglas de `ocupacionTemporal`).
- **Cambiar nombres de colecciones:** se rompe disponibilidad, locks y cross-check.
- **Quitar el listener de locks:** se muestran como libres bloques en espera de pago.
- **Subir/bajar `limit(100)`:** subir cuesta cuota; bajarlo puede ocultar ocupación (falso libre).
- **Quitar `useStableArray` o `fechaConsultada`:** reappear los loops/re-renders.
- **Cambiar la duración del lock:** afecta reintentos, expiración y UX.
- **Cambiar la semántica de bloqueos:** puede liberar u ocultar horarios reales.

## 11. Costos y cuotas (Plan Spark)
- Por fecha seleccionada: 2 listeners del espejo (hasta 100 docs cada uno) + 1 listener de `ocupacionTemporal`.
- `useBloqueosProveedor` abre 1 listener por fecha; `useBloqueosInstructor` 1 listener global; `useBloqueosAdmin` 1 `getDocs` global.
- Cada cambio de fecha/sede re-suscribe. Los listeners de reservas del admin usan `limit(100)`.
- Riesgo: bucles de re-suscripción (precedente 17/11) y fechas con >100 reservas.

## 12. Errores y recuperación
- Error de listener → el hook deja la lista vacía (fail-open en UI) y loguea; el Paso 3 puede mostrar falso libre.
- `permission-denied` al crear lock → “Este horario acaba de ser separado por otro usuario”.
- Lock expirado → modal de expiración; el servicio lo ignora si está expirado/corrupto y lo borra al confirmar.
- `LockService.escucharOcupacionTemporal` loguea cada snapshot (`console.log` en producción) → ruido.

## 13. Pruebas
- Individual: un día y dos días; con y sin moto; D2 con `horaIdReposicion`.
- Packs: misma matriz con `useDisponibilidadPack`.
- Locks: crear, renovar una vez, expirar, liberar, lock de otro usuario.
- Bloqueos: admin, proveedor e instructor; solapamiento con reservas.
- Regresión: cambio de fecha/sede no debe dejar listeners huérfanos.
- Cuota: medir lecturas por cambio de fecha.

## 14. Riesgos y deudas
`B-RATELIMIT-LOCKS`, `B-ALERTA-CUOTA-FIRESTORE`, `B-ESPACIO-LIMITE-100` (nuevo: evaluar límite 100), `B-AUTOJUMP-REDISENO`.
Riesgo de inconsistencia: `useDisponibilidadPack` permite todos si `instructoresPermitidos` está vacío (fail-open), mientras `InscripcionView` bloquea a todos (fail-closed). Ver contradicción 16.

## 15. Supuestos / por verificar
- [SUPUESTO] Cada fecha tiene menos de 100 reservas activas.
- [SUPUESTO] Las colecciones de bloqueos son pequeñas (< 50 docs).
- [POR VERIFICAR] Lecturas reales por cambio de fecha en producción.

## 16. Contradicciones detectadas
- `BITACORA_EXPERIENCIAL.md` afirma que el filtro de `instructoresPermitidos` quedó homologado fail-closed entre flujo individual y packs. El código actual de `useDisponibilidadPack.js:43-50` devuelve `null` (todos permitidos) si el array está vacío, mientras `InscripcionView.jsx:105-109` devuelve `false` (nadie). **No están homologados.** Requiere decisión FIRE/MAMBA antes de tocar.
- El hotfix del auto-jump está activo en ambos entornos; el rediseño sigue pendiente.

## 17. Enlaces
`docs/flujos/01-inscripcion-individual.md`, `docs/flujos/04-reserva-y-espejo.md`, `docs/flujos/INDICE.md`, `ARRANQUE_MEMORIA_IA.md` (INC-2026-11-17).

## 18. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 19/11/2026 | Creación (lectura de código) | Deek |

