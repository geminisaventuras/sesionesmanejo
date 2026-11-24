# 12 — Teóricos (módulos formativos)

| Campo | Valor |
|---|---|
| ID | FLUJO-12 |
| Estado | 🟡 Verificado por código (19/11/2026); pendiente E2E |
| Archivos clave | `TeoricoPublicoView.jsx`, `TeoricoCursoView.jsx`, `TeoricoModuloView.jsx`, `InscripcionTeoricoView.jsx`, `AccesoTeoricoService.js`, `ProgresoTeoricoService.js`, `AdminAccesoTeoricoDetalle.jsx`, `firestore.rules` |
| Deudas | `B-TEORICO-MODULO-BYPASS` (CRÍTICO), `B-TEORICO-PRECIO-CLIENTE` (CRÍTICO), `B-TEORICO-DOBLE-COMPRA`, `B-TEORICO-QUIZ-CLIENTE` |

## 1. Objetivo y alcance
Comprar y consumir módulos formativos: catálogo público, pago manual, aprobación admin, acceso al curso, progreso y quizzes.
No cubre el aula práctica (FLUJO-09) ni los accesos incluidos en packs (FLUJO-05/07), salvo su creación.

## 2. Actores y rutas
| Ruta | Componente | Acceso |
|---|---|---|
| `/teorico` | `TeoricoPublicoView` | Público |
| `/teorico/:cursoId` | `TeoricoCursoView` | Público con gate de acceso |
| `/teorico/:cursoId/modulo/:moduloId` | `TeoricoModuloView` | Público; módulos requieren auth para leer |
| `/teorico/:cursoId/comprar` | `InscripcionTeoricoView` | Público |
| `/admin/acceso-teorico/:accesoId` | `AdminAccesoTeoricoDetalle` | Admin |
| `/corregir-pago/teorico/:id` | `CorregirPagoView` | Estudiante |

## 3. Compra (`InscripcionTeoricoView.jsx`)
1. Carga el curso desde el contexto o `getDoc` de `cursosTeoricos` (`:43-64`).
2. Si no hay sesión, crea cuenta con `AuthService.crearEstudiante` y guarda perfil SSOT (`:110-139`).
3. Precio = `cursoTeorico.precio`; VES = precio × tasa de cobro (`:106-108`).
4. Paso 4 valida pago, términos y captcha (`:148-156`).
5. Llama `AccesoTeoricoService.crearAcceso` con `precio`, moneda, método y datos de pago (`:158-173`).
6. Si es usuario nuevo, muestra PIN y pantalla de éxito; si ya estaba logueado, va al portal (`:176-207`, `:237-274`).
7. El acceso nace `Pendiente`; el contenido se habilita al aprobar.

## 4. Creación del acceso (`AccesoTeoricoService.crearAcceso`, `:49-109`)
- Valida `userId`, `cursoTeoricoId` y `precio > 0` (`:54-55`).
- Pre-check de doble compra:
  - Aprobado → “ya tienes acceso”.
  - Pendiente → “ya tienes una compra pendiente”.
  - Rechazado → debe corregir, no recomprar (`:58-71`).
- Payload (`:74-101`): `id`, `userId`, `cursoTeoricoId`, `estadoPago: 'Pendiente'`, `precio`, moneda, `origen: 'standalone'`, `packReservaId: null`, datos de pago, comisiones 0, `esAccesoVitalicio`, `fechaCompra`, `aprobadoEn/rechazadoEn/motivoRechazo`, `intentosCorreccion: 0`, `historialRechazos: []`, `vencimiento`, timestamps.
- Escribe con `setDoc`; no hay transacción ni restricción de unicidad.

## 5. Aprobación y rechazo (`AccesoTeoricoService`)
### 5.1 Aprobar (`aprobarAcceso`, `:112-161`)
- Batch atómico: acceso `Aprobado` + `aprobadoEn` + `vencimiento` (si no es vitalicio) (`:125-130`).
- Si el usuario existe, activa `capacidades.modulosTeoricos: true` (`:132-141`).
- Crea notificación `acceso_teorico_aprobado` (`:143-153`).
- El admin además registra un movimiento de ingreso con ID determinístico `mov_acc_{accesoId}` (`AdminAccesoTeoricoDetalle.jsx:70-105`).
### 5.2 Rechazar / cancelar (`rechazarAcceso`, `:167-239`)
- **Cancelar:** `estadoPago: 'Cancelado'`, motivo e historial; no incrementa intentos (`:178-194`).
- **Rechazar:** `estadoPago: 'Rechazado'`, `rechazadoEn`, `motivoRechazo`, `intentosCorreccion + 1`, historial (`:196-211`).
- Actualiza `usuarios/{uid}.updatedAt` y crea notificación (`:214-231`).
- La UI del admin muestra intentos y bloquea “Rechazar” al llegar a 3 (`AdminAccesoTeoricoDetalle.jsx:249-310`).
### 5.3 Corrección (`corregirReferenciaPago`, `:245-287`)
- Solo desde `Rechazado`.
- Bloquea si `intentosCorreccion >= 3` (`:260-264`).
- Actualiza `pagoRef`, `estadoPago: 'Pendiente'`, `updatedAt`; no toca motivo/intentos/historial (`:266-279`).
- La regla exige la misma transición y el mismo límite (`firestore.rules:319-334`).

## 6. Acceso y consumo
- `TeoricoCursoView` carga accesos aprobados del usuario y calcula `tieneAcceso = esGratis || accesosAprobados.has(cursoId)` (`TeoricoCursoView.jsx:35`, `:59-84`, `:132-135`).
- Si no tiene acceso, muestra “Contenido exclusivo” y CTA de compra (`:135-175`).
- `TeoricoModuloView` carga el módulo, el curso, los módulos y el quiz (`:35-76`), marca “último visto” (`:81-84`) y permite completar (`:105-124`).
- **No hay gate de acceso en `TeoricoModuloView`:** cualquier usuario autenticado que conozca la URL puede leer el módulo y marcarlo completado.
- El progreso se guarda en `logrosUsuario/{uid}` (`ProgresoTeoricoService.js:32-71`); el quiz envía el puntaje desde el cliente (`TeoricoModuloView.jsx:227-233`).

## 7. Datos y estados
| Documento | Campos clave |
|---|---|
| `accesosTeoricos` | `userId`, `cursoTeoricoId`, `estadoPago`, `precio`, `origen`, `packReservaId`, `pagoRef`, `intentosCorreccion`, `historialRechazos`, `esAccesoVitalicio`, `aprobadoEn`, `rechazadoEn`, `vencimiento` |
| `evaluacionesViales/{uid}` | último resultado del Reto Vial: `userId`, `porcentaje`, `modo`, `tipoIntento` (`practica`\|`diagnostico`), `mejorDiagnostico`, `rachaMaxima`, `tiempoSegundos`, `intentos`, `actualizadoEn` |
| `evaluacionesViales/{uid}/intentos/{n}` | historial append-only: `userId`, `intento`, `porcentaje`, `modo`, `tipoIntento`, `rachaMaxima`, `tiempoSegundos`, `aciertos`, `total`, `fecha` |
| `cursosTeoricos` | `precio`, `duracionAcceso`, `modulos`, `activo` |
| `modulosTeoricos` | `cursoId`, `tipo` (`leccion`/`video`/`quiz`), `contenido`, `videoUrl`, `quizId`, `orden` |
| `quizzesTeoricos` | `preguntas` |
| `logrosUsuario` | `stats.{cursoId}.modulosCompletados`, `puntajeQuizzes`, `ultimoModuloVisto` |

| Estado | Significado |
|---|---|
| `Pendiente` | Compra registrada, esperando admin |
| `Aprobado` | Acceso habilitado (vitalicio o con vencimiento) |
| `Rechazado` | El usuario puede corregir la referencia (máx. 3) |
## 8. Reglas de Firestore
| Operación | Regla |
|---|---|
| `cursosTeoricos` | lectura pública; escritura admin (`firestore.rules:255-258`) |
| `modulosTeoricos` | lectura auth; escritura admin (`:260-263`) |
| `quizzesTeoricos` | lectura auth; escritura admin (`:265-268`) |
| `packsTeoricos` | lectura pública; escritura admin (`:270-273`) |
| `accesosTeoricos.read` | admin o dueño (`:279-282`) |
| `accesosTeoricos.create` | dueño, `Pendiente`, `precio > 0`, sin progreso; o admin con `origen pack`, `Aprobado`, `precio 0` y pack del mismo dueño (`:283-302`) |
| `accesosTeoricos.update` | admin; dueño solo `progreso/logrosCurso/streak`; o corrección `Rechazado → Pendiente` con `intentos < 3` y solo campos de pago/`updatedAt` (`:303-335`) |
| `accesosTeoricos.delete` | denegado (`:336`) |
| `evaluacionesViales.write` | dueño con allowlist y rangos; `tipoIntento` y `mejorDiagnostico` validados; `modoLabel` **rechazado** desde FT-053; anónimos no escriben |
| `evaluacionesViales/{uid}/intentos` | lectura dueño/admin; `create` solo dueño (allowlist, rangos, `fecha == request.time`, `tipoIntento` válido); `update`/`delete` solo admin — append-only (FT-052/FT-053) |
| `logrosUsuario` | dueño create/update; admin read (`:368-380`) |

## 9. Invariantes
- El acceso nace `Pendiente` y se habilita solo al aprobar.
- El precio se congela al comprar (aunque hoy lo envía el cliente).
- El límite de 3 intentos es duro: servicio + regla (`:260-264`, `:322`).
- La corrección no borra motivo, historial ni intentos.
- Un pack aprobado crea accesos `origen: pack`, `precio: 0`, `Aprobado`.
- El progreso pertenece al usuario y no puede tocar `estadoPago`.

## 10. Por qué está diseñado así
- **Pago manual:** el acceso queda pendiente hasta que el admin valida.
- **Contenido pago:** el curso se bloquea sin acceso aprobado.
- **Corrección acotada:** el estudiante solo puede cambiar la referencia, no el estado ni el precio.
- **Progreso separado:** `logrosUsuario` evita mezclar avance con estado de pago.
- **Pack:** los módulos incluidos no se cobran de nuevo y se crean al aprobar.

## 11. Dependencias críticas
- FLUJO-07 (`CorreccionPagoService`) para la corrección de teóricos.
- FLUJO-05/07 para accesos incluidos en packs.
- FLUJO-11 para el movimiento de ingreso.
- Auth/PIN para compradores nuevos.
- `cursosTeoricos.precio`, `duracionAcceso`, módulos y quizzes.

## 12. Qué se rompe si se cambia
- **Quitar el gate del curso:** se libera todo el contenido.
- **Quitar el límite de intentos:** correcciones infinitas.
- **Permitir al estudiante cambiar precio/estado:** fraude.
- **No crear accesos de pack:** el alumno no ve los módulos incluidos.
- **No registrar movimiento:** ingreso faltante (no atómico).

## 13. Costos y cuotas
- Compra: pre-check (`getDocs`) + 1 `setDoc`.
- Aprobación: batch acceso + usuario + notificación; +1 movimiento.
- Rechazo/corrección: 1 `getDoc` + batch acceso/usuario (+ notificación al rechazar).
## 14. Errores e idempotencia
- Doble compra: el pre-check bloquea Aprobado/Pendiente/Rechazado; no hay transacción, dos pestañas podrían crear duplicados.
- Aprobar dos veces: el batch no valida estado previo; puede duplicar notificación (el movimiento usa ID determinístico).
- Rechazar/corregir: read-then-write; la regla impide salir de `Rechazado` sin cumplir condiciones.
- Movimiento de ingreso: se crea después del batch; si falla, el acceso queda aprobado sin ingreso.
- Sin conexión: no hay cola de reintentos.

## 15. Pruebas
- Compra como usuario nuevo y logueado; verificar PIN y estado `Pendiente`.
- Aprobar; verificar `Aprobado`, capacidad, notificación y movimiento.
- Rechazar 3 veces; verificar bloqueo de corrección (servicio y regla).
- Corregir referencia; verificar `Pendiente` y `pagoRef`.
- Cancelar; verificar `Cancelado` y que no se corrige.
- Curso gratuito vs pago; curso con acceso aprobado.
- **Abrir `/teorico/:cursoId/modulo/:moduloId` sin acceso aprobado** (hoy permite).
- Acceso con `vencimiento` pasado (hoy no se valida).
- Progreso y quiz; verificar puntaje.

## 16. Riesgos, hallazgos y deudas
- **`B-TEORICO-MODULO-BYPASS` (CRÍTICO):** `TeoricoModuloView` no valida acceso; cualquier usuario autenticado puede abrir el módulo por URL y marcarlo completado (`TeoricoModuloView.jsx:35-124`, `:199-284`). El gate solo existe en `TeoricoCursoView` (`:132-135`).
- **`B-TEORICO-PRECIO-CLIENTE` (CRÍTICO):** `crearAcceso` confía en el `precio` enviado por el cliente (`InscripcionTeoricoView.jsx:162-173`); la regla solo exige `precio > 0` (`firestore.rules:288`). Se puede comprar por menos.
- **`B-TEORICO-VENCIMIENTO`:** `obtenerAccesosAprobados` y `TeoricoCursoView` no revisan `vencimiento`; un acceso temporal vencido sigue dando contenido (`AccesoTeoricoService.js:35-46`, `TeoricoCursoView.jsx:132-135`).
- **`B-TEORICO-DOBLE-COMPRA`:** el pre-check no es transaccional; dos compras concurrentes pueden crear dos accesos (`:58-73`).
- **`B-TEORICO-QUIZ-CLIENTE`:** el puntaje del quiz se calcula/envía desde el cliente (`TeoricoModuloView.jsx:105-124`, `:227-233`) y `ProgresoTeoricoService` lo guarda sin validación (`:32-71`).
- **`B-TEORICO-MOV-ATOMICO`:** el movimiento de ingreso se registra después de aprobar; si falla, el acceso queda aprobado sin ingreso (`AdminAccesoTeoricoDetalle.jsx:84-99`).
- **`B-TEORICO-APROBACION-DOBLE`:** aprobar dos veces puede duplicar la notificación; el movimiento determinístico evita el duplicado contable.
- **`B-TEORICO-CAPACIDAD`:** `capacidades.modulosTeoricos` se activa globalmente con un solo acceso (`:132-141`); el gate por curso sigue dependiendo de `accesosTeoricos`.
- **FT-053 / T-116 (24/11/2026, DEV):** el historial distingue `diagnostico` (examen integral sin ayudas) de `practica`; el “Mejor diagnóstico” solo considera los primeros y el cliente ya no puede escribir la etiqueta del modo. Sigue sin haber validación server-side: alguien puede enviar un porcentaje o un `tipoIntento` falsos (las reglas solo restringen formato y rangos).
- **FT-052 / T-115 (24/11/2026, DEV):** cada intento del **Reto Vial** (nombre visible; la ruta sigue siendo `/evaluacion`) se guarda en `evaluacionesViales/{uid}/intentos` (append-only, sin PII ni respuestas) junto al resumen, en una sola transacción. Da trazabilidad y mejores puntajes, pero **no** valida respuestas en servidor: un cliente manipulado puede inflar el porcentaje. Una calificación oficial requeriría quiz server-side (Cloud Functions o colección de respuestas validada), fuera de alcance.
- **FT-051 / T-114 (24/11/2026, DEV):** Evaluación Vial independiente en `/evaluacion` con 16 preguntas propias, **no** es el quiz oficial del curso. El último resultado se guarda en `evaluacionesViales/{uid}` (solo dueño/admin; sin PII ni respuestas) y los anónimos usan `localStorage`. El puntaje se calcula en el cliente y es orientativo; no otorga acceso ni se mezcla con `progresoTeorico`. Entradas: Inicio del portal, Servicios → Retos y `/teorico`. El nombre del reporte es editable y se **precarga desde el perfil** (`usuarios/{uid}`) sin persistirse (ERR-064). ADR-020.

## 17. Supuestos / por verificar
- [SUPUESTO] El contenido pago debe protegerse; si es intencionalmente público, el gate del curso sobra.
- [SUPUESTO] El precio del curso es el SSOT; el cliente no debería poder cambiarlo.
- [POR VERIFICAR] Uso real de accesos temporales (`duracionAcceso`).
- [POR VERIFICAR] Si los quizzes otorgan certificados o solo progreso.

## 18. Contradicciones detectadas
- El curso se presenta como “contenido exclusivo”, pero el módulo se abre directo.
- Se guarda `vencimiento`, pero el acceso lo ignora.
- El precio se documenta como congelado, pero lo envía el cliente.
- El puntaje del quiz se presenta como evaluación, pero se calcula en el navegador.

## 19. Enlaces
`docs/flujos/05-compra-pack.md`, `docs/flujos/07-aprobacion-rechazo-pagos.md`, `docs/flujos/11-finanzas-movimientos.md`, `firestore.rules`.

## 20. Changelog
| Fecha | Cambio | Verificado por |
|---|---|---|
| 24/11/2026 | FT-054/T-117: menú **Emulado** en el Reto con 4 simuladores (carril 1-2-3, T-CLOCS 360, SLPR y cabina) en overlay con carga diferida; ERR-066: preguntas compactas y acción sticky en móvil | Deek |
| 24/11/2026 | FT-053/T-116: `tipoIntento` diagnóstico/práctica, `mejorDiagnostico` transaccional, `modoLabel` fuera del cliente, historial local anónimo (5), orden barajado en ley/técnica y alias `/reto-vial` | Deek |
| 24/11/2026 | FT-052/T-115: historial append-only de intentos en `evaluacionesViales/{uid}/intentos` (transacción resumen+intento, reglas dueño/admin, UI de últimos 5 y mejor puntaje). El puntaje sigue siendo del cliente: trazable, no antifraude | Deek |
| 24/11/2026 | FT-051/T-114: Evaluación Vial en `/evaluacion`; persistencia `evaluacionesViales/{uid}` para autenticados, localStorage para anónimos; entrada en **Inicio del portal**, Servicios → Retos y `/teorico`. ADR-020 | Deek |
| 19/11/2026 | Creación (lectura de código) | Deek |


