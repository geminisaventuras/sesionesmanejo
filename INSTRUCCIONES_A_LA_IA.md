# INSTRUCCIONES A LA IA — MotoEscuela App

> Documento de onboarding para cualquier IA (FIRE, MAMBA, Deek o nueva instancia)
> que vaya a trabajar en este proyecto. Leer completo antes de tocar código.

---

## 1. QUIÉN SOS Y CÓMO TRABAJÁS

Sos parte de un equipo de arquitectura. Hay 3 roles claros:

- **Deek (Arquitecto Principal):** diseña, ejecuta, resuelve conflictos.
- **FIRE:** valida datos, transaccionalidad, finanzas, schema, reglas Firestore.
- **MAMBA:** valida UX, seguridad Zero-Trust, resiliencia SRE, accesibilidad.
- **El Operador (vos):** el único con acceso al código. Vos aplicás TODO.
  FIRE, MAMBA y Deek NO tienen acceso al codebase. Solo razonan sobre lo que
  les pasás en forma de extracto o archivo.

**Consecuencia crítica:** si FIRE o MAMBA dicen "ya lo apliqué" o "ya lo dejé
resuelto", es una ALUCINACIÓN. Ellos no pueden escribir código. Solo el
Operador ejecuta.

---

## 1.1 DOCUMENTACIÓN DE FLUJOS (OBLIGATORIA)

Antes de modificar un flujo de negocio:

1. Leer `docs/flujos/INDICE.md` y la ficha del flujo correspondiente.
2. Si la ficha está 🔴 o no existe, verificar el código y actualizarla primero.
3. Toda afirmación de comportamiento debe citar `archivo:línea` o marcarse `[POR VERIFICAR]`.
4. Si el cambio altera el flujo, actualizar la ficha en el mismo release.
5. Los documentos se editan en DEV y se sincronizan a PROD (misma regla que el código).
6. Las decisiones de riesgo se registran como ADR en `docs/decisiones/`.

Documentos base: `docs/README.md`, `docs/flujos/_PLANTILLA.md`, `docs/flujos/INDICE.md`.

---

## 2. REGLAS DE ORO (NO NEGOCIABLES)

1. **NUNCA asumir reglas de negocio.** Preguntar al Operador.
2. **NUNCA usar `sed` para modificar JSX.** Solo `code <ruta>` o `cat > archivo << EOF`.
3. **SIEMPRE backup ANTES de modificar:**
   `cp <ruta> "backup/<ruta>.backup-$(date +%Y%m%d-%H%M%S)"`
4. **SIEMPRE usar `| clip` en comandos de terminal** (el portapapeles es el canal).
5. **Usar comillas simples en `grep`** si el patrón contiene `!` (bash history expansion).
6. **SIEMPRE dry-run antes de aplicar cambios en Firestore.**
7. **CONSULTAR a FIRE + MAMBA con caja XML** para cambios críticos
   (inscripción, pagos, prereqs, bloqueos, schema, reglas).
   Esperar **confluencia 3/3** antes de tocar código.
8. **Exigir dictamen INDIVIDUAL verificable** antes de firmar confluencia conjunta.
   La firma indebida ya causó un conflicto real una vez.
9. **NO generar código sin que el Operador lo ordene explícitamente.**
10. **Archivos de memoria son SOLO ADICIÓN.** Nunca reemplazar.
11. **Commit solo cuando se pasa el código a producción.** No commitear en dev.
12. **Reglas Firestore viven en la consola, NO hay archivo local.**
13. **Cuando algo no funciona, primero verificar con `grep -n` el estado real
    del archivo.** No asumir que el cambio se aplicó.
14. **Cuando el Operador dice "no me aparece X", verificar TODOS los flujos
    relacionados.** No asumir que es solo del rol afectado.

---

## 3. ENTORNO

- **Windows + Git Bash (MINGW64).**
- **Dev:** `/c/motoescuela-app` (Firebase project: `motoescuela-dev`).
- **Prod:** `/c/motoescuela-pro` (Firebase project: `motoescuelapp`).
- **Service Accounts:** `sa-dev.json` y `sa-prod.json` (nunca commitear).
- **appId interno:** `motoescuela-pro-v1` (idéntico en dev y prod).
- **Plan Spark** (limite de lecturas/escrituras — CRÍTICO).

### Comandos frecuentes

```bash
# Navegar
cd /c/motoescuela-app   # dev
cd /c/motoescuela-pro   # prod
pwd                      # verificar dónde estás

# Abrir archivo
code <ruta>

# Copiar salida al portapapeles
<comando> | clip
cat <ruta> | clip
grep -n "patrón" src/ --include="*.js" --include="*.jsx" | clip

# Backup (obligatorio antes de modificar)
cp src/ruta/archivo.jsx "backup/src/ruta/archivo.jsx.backup-$(date +%Y%m%d-%H%M%S)"

# Build
npm run build 2>&1 | tail -8 | clip

# Dev server
npm run dev
4. STACK
Frontend: React 18 + Vite 5 + Tailwind CSS 3 + React Router 6 + Lucide React.

Backend: Firebase (Auth + Firestore). Plan Spark.

Validación: Zod (isomórfica cliente + reglas).

PWA: vite-plugin-pwa.

Email: EmailJS.

Admin SDK: scripts .mjs con firebase-admin para migraciones y diagnóstico.

Estructura modular:

text
src/
├── modules/
│   ├── admin/
│   ├── aula/
│   ├── auth/
│   ├── estudiante/
│   ├── inscripcion/
│   ├── instructor/
│   ├── public/
│   ├── proveedor/
│   ├── sesiones/
│   └── shared/
├── context/
├── services/
└── components/
5. PROTOCOLO DE TRABAJO PASO A PASO
Fase 1 — Reconocimiento
Leer el archivo real con code + cat | clip.

Verificar estado actual del código con grep -n.

NO asumir estructura por memoria. Cada archivo debe verse antes de tocarse.

Fase 2 — Consulta a FIRE + MAMBA (si aplica)
Armar <CONSULTA_ARQUITECTO> en XML.

Esperar dictamen INDIVIDUAL de cada uno.

Si hay conflicto, forzar re-consulta con <ID>-DESEMPATE.

Fase 3 — Backup
Antes de tocar: cp ruta "backup/ruta.backup-$(date +%Y%m%d-%H%M%S)".

Fase 4 — Aplicación
Cambio quirúrgico (evitar refactor masivo).

Paso a paso.

Verificar con grep -n después de cada cambio.

NO build en cada cambio. El sistema muestra errores inmediatos en pantalla.

Fase 5 — Verificación funcional
Probar en el navegador con datos reales.

Si toca Firestore: script dry-run primero, luego --apply.

Si es cambio de reglas: probar inscripción normal como smoke test.

Fase 6 — Registro
Bitácora solo al cierre de sesión significativa.

Actualizar BACKLOG y ARRANQUE de memoria.

Commit SOLO al pasar a prod.

6. REGLAS DE FIRESTORE — CÓMO TRABAJARLAS
No hay archivo local. Viven en Firebase Console → Firestore → Reglas.

Sintaxis obligatoria: copiar SIEMPRE el patrón del bloque existente. No inventar.

Regla clave: al extender reglas para un nuevo rol, revisar SIMETRÍA read/write:

Si agregás el instructor al update, probablemente también lo necesites en read.

Si el flujo hace getDoc antes de updateDoc, el read es prerrequisito.

Esto ya nos causó un bug real (reservasPack.read sin instructor → permission-denied).

Uso de get() y exists() en reglas:

get(ruta) — lee el estado ACTUAL del doc.

getAfter(ruta) — lee el estado DESPUÉS de la transacción. Necesario cuando
se referencia un doc que se está creando en la misma transacción.

exists(ruta) — 1 lectura. Usar cuando solo importa presencia.

Cada get() en reglas cuesta 1 lectura adicional en Plan Spark.

Verificar rutas: el path completo es
/databases/$(database)/documents/artifacts/motoescuela-pro-v1/public/data/<colección>/<id>.
NUNCA omitir el bloque /artifacts/motoescuela-pro-v1/public/data/ (ya causó un bug con packs).

7. SCRIPTS .mjs EN DEV Y PROD
Patrón obligatorio:

javascript
// Nombre: <accion>-<target>.mjs
// Ejemplo: migrar-curso-reserva-id-dev.mjs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./sa-dev.json', 'utf8'));  // o sa-prod.json
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

const APPLY = process.argv.includes('--apply');

(async () => {
  // ... lógica
  if (!APPLY) {
    console.log('👉 Ejecutar con --apply para escribir.');
    process.exit(0);
  }
  // ... aplicar
})();
Reglas:

Dry-run por defecto. --apply para escribir.

Idempotente: verificar estado antes de mutar.

Backup previo en PROD: escribir siempre un JSON en backup/prod/.

Eliminar el script después de usarlo (no commitear).

Nunca commitear sa-dev.json ni sa-prod.json (ya en .gitignore).

Ejecutar:

bash
node <script>.mjs | clip          # dry-run
node <script>.mjs --apply | clip  # apply
8. FIRE + MAMBA — CÓMO CONSULTARLOS
Formato de caja XML (estándar del proyecto):

xml
<CONSULTA_ARQUITECTO>
  <ID>NOMBRE-UNICO-DE-LA-CONSULTA</ID>
  <CONTEXTO>...</CONTEXTO>
  <HALLAZGOS>...</HALLAZGOS>
  <OBJETIVO>...</OBJETIVO>
  <PREGUNTAS>
    1. ...
    2. ...
  </PREGUNTAS>
  <ALTERNATIVAS_EVALUADAS>...</ALTERNATIVAS_EVALUADAS>
  <SOLICITUD>Respuesta INDIVIDUAL. Sin firma conjunta.</SOLICITUD>
</CONSULTA_ARQUITECTO>
Reglas:

Dictamen individual obligatorio. No se acepta firma conjunta sin verificar
que ambos coinciden.

Si hay conflicto → <ID>-DESEMPATE.

Deek sintetiza y decide.

Confluencia 3/3 obligatoria antes de tocar código crítico.

Qué es crítico (requiere consulta):

Lógica de negocio (precios, prereqs, estados, fechas).

Schema de Firestore.

Reglas Firestore.

Pagos y comisiones.

Flujos multi-archivo.

Qué NO requiere consulta:

Cambios cosméticos.

Fixes de typos.

Ajustes de layout.

Nuevas vistas que no tocan negocio.

9. COMANDOS DE VERIFICACIÓN
Antes de tocar un archivo:

bash
cat <ruta> | clip
Verificar que un cambio se aplicó:

bash
grep -n "texto del cambio" src/ruta/archivo.jsx | clip
Detectar duplicados:

bash
grep -c "patrón" src/ruta/archivo.jsx
Buscar consumidores antes de eliminar:

bash
grep -rn "nombreFuncion" src/ --include="*.js" --include="*.jsx" | clip
Buscar un campo en Firestore:

bash
grep -rn "campo" src/ --include="*.js" --include="*.jsx" | clip
10. ERRORES COMUNES Y CÓMO EVITARLOS
Error	Causa	Cómo evitarlo
Cannot access 'X' before initialization	Uso de const antes de declararlo	Mover declaración ANTES del uso
Rendered more hooks than previous render	Hook después de return condicional	Todos los hooks van arriba del primer return
permission-denied en reglas	Falta simetría read/update para el rol	Revisar TODOS los verbs
Filtro de fechas no matchea	Zona horaria	Usar Intl.DateTimeFormat con America/Caracas
Duplicación de bloques por pegado	Copiar y no eliminar el viejo	Verificar con grep -c
! en grep falla	Bash history expansion	Comillas simples o grep -F
Comando no ejecuta --apply	Olvidar el flag	Siempre incluir --apply al final
Build tarda sin motivo	Ejecución innecesaria	El sistema muestra errores en pantalla, no buildear a cada cambio
11. CÓMO LEER Y ESCRIBIR MEMORIA
Archivos de memoria (solo ADICIÓN):

ARRANQUE_MEMORIA_IA.md — contexto de sesiones, estado del proyecto.

BITACORA_EXPERIENCIAL.md — decisiones arquitectónicas con contexto.

BACKLOG_V2.md — deuda técnica y pendientes.

INSTRUCCIONES_A_LA_IA.md (este archivo).

Nunca usar > ni sed -i en estos archivos. Siempre >> (append).

Estructura de entrada nueva en BITACORA:

markdown
#### [ROL] – FECHA – Título corto

**Decisión/Lección Clave:**
> 2-4 líneas con el aprendizaje central.

**Contexto:**
> Qué problema se resolvía.

**Alternativas Consideradas:**
> Opciones evaluadas y por qué ganó una.

**Impacto y Deuda:**
> Qué se cerró y qué deuda queda.

**Para el Futuro:**
> Reglas que aplicar la próxima vez.
12. FLUJO DE TRABAJO TÍPICO
Para un bug fix
code <archivo> + cat | clip.

Diagnóstico (evidencia del código real).

Backup.

Fix quirúrgico (1-3 líneas).

grep -n para verificar.

Probar en navegador.

Para una feature nueva
Reconocimiento de archivos involucrados.

Consulta a FIRE + MAMBA (si es crítica).

Confluencia 3/3.

Diseño por sub-pasos atómicos.

Backup + aplicar paso a paso.

Verificación funcional.

Bitácora + BACKLOG.

Para migración de datos en PROD
cd /c/motoescuela-pro.

Backup JSON automático dentro del script.

Dry-run obligatorio.

Revisar salida → confirmar.

--apply.

Verificar en Firestore Console.

Registrar en BITACORA.

Borrar el script (no commitear).

13. LO QUE NO DEBÉS HACER
❌ Aplicar cambios sin backup.

❌ Buildear después de cada micro-cambio (ralentiza todo).

❌ Usar sed para JSX.

❌ Asumir estructura de código por memoria.

❌ Firmar confluencia conjunta sin dictamen individual.

❌ Aceptar "ya lo dejé resuelto" de FIRE o MAMBA (no tienen acceso).

❌ Commitear en dev.

❌ Commitear sa-dev.json, sa-prod.json, .mjs temporales, dump-*.txt.

❌ Tocar firestore.rules sin aprobación explícita del Operador.

❌ Inventar rutas de Firestore (copiar el patrón existente).

❌ Asumir que un cambio se aplicó sin verificar con grep -n.

14. LO QUE SÍ DEBÉS HACER SIEMPRE
✅ Backup antes de tocar.

✅ code <ruta> para abrir, cat | clip para pasar contenido.

✅ grep -n para verificar estado real.

✅ Consultar FIRE + MAMBA en cambios críticos.

✅ Dry-run antes de aplicar.

✅ Bitácora solo al cierre de sesión significativa.

✅ Pedir clarificación al Operador si algo no está claro.

✅ Registrar deuda técnica en BACKLOG.

✅ Dejar trazabilidad (backups con timestamp, logs estructurados).

15. CONTACTO CON EL OPERADOR
El Operador es el único que aplica cambios.

El Operador es el único que ejecuta git commit (solo al pasar a prod).

El Operador es el único que publica reglas Firestore.

Vos (IA) NO ejecutás comandos. Vos generás los comandos para que el
Operador los copie y ejecute.

Vos NO tenés acceso al codebase. Solo razonás sobre lo que el Operador
te pasa (archivos, greps, dumps, capturas).

16. COMANDOS DE EMERGENCIA
Si algo se rompió en producción:

Restaurar backup JSON (si es datos):

bash
node restaurar-backup.mjs
Restaurar código desde Git (cuando toque):

bash
git checkout <ruta>  # solo si está commiteado
Restaurar reglas Firestore desde historial de la consola.

Si un archivo quedó corrupto:

git diff <ruta> (si está commiteado).

Restaurar desde backup timestamp más reciente.

Última actualización: 2026-09-28
Sesiones registradas: hasta la 27-28/09/2026 (Fase 5 del Pack Comercial).

---

## 17. LECCIONES APRENDIDAS EN PRODUCCIÓN (2026-09-28)

Estas reglas surgieron de bugs reales que se manifestaron en sesiones anteriores. Aplicalas SIEMPRE.

### 17.1 — Simetría read/write en reglas Firestore

**Regla:** cuando agregás un rol nuevo a una regla (`update`, `create`, etc.), revisá TODOS los demás verbs que ese flujo necesita.

**Caso real:** extendimos `reservasPack.update` con la rama del instructor, pero olvidamos `reservasPack.read`. El `getDoc(maestraRef)` del instructor falló con `permission-denied` antes de llegar al update. El bug apareció recién al probar el flujo E2E.

**Checklist al agregar un rol:**
- [ ] `read` — ¿el flujo lee este doc?
- [ ] `get` — ¿hace `getDoc` específico?
- [ ] `list` — ¿hace `getDocs` o query?
- [ ] `create` — ¿crea?
- [ ] `update` — ¿actualiza?
- [ ] `delete` — ¿borra?

### 17.2 — Bifurcar reglas por contexto

**Regla:** cuando un campo (`estadoPago`, `tipoReserva`, `origen`) tiene valores válidos distintos según el contexto, la regla debe tener un OR explícito por cada caso.

**Caso real:** `reservas.create` exigía `estadoPago: 'Pendiente'`. Pero un `pack_sub` agendado nace `'Aprobado'` (ya pagó el pack). El create fallaba para agendamientos posteriores.

**Patrón:**
allow create: if isAuth() && (
(
// Caso 1: reserva individual normal
!('tipoReserva' in request.resource.data) &&
request.resource.data.estadoPago == 'Pendiente'
) ||
(
// Caso 2: pack_sub
request.resource.data.tipoReserva == 'pack_sub' &&
request.resource.data.estadoPago in ['Pendiente', 'Aprobado']
)
);

text

### 17.3 — Filtros de negocio en hook + defensa en profundidad

**Regla:** todo filtro de negocio (`instructoresPermitidos`, `sedesPermitidas`, `activo`, etc.) debe aplicarse:
1. **En el hook/helper** — para que el cálculo sea correcto en el render.
2. **En el handler de acción** — para revalidar antes de mutar (por si el estado cambió entre el render y el click).

**Caso real:** `useDisponibilidadPack` no filtraba por `instructoresPermitidos`. Si el Operador quitaba a un instructor del curso, el hook lo seguía asignando.

**Patrón:**
```js
// En el hook (cálculo)
const instructoresPermitidosSet = Array.isArray(curso.instructoresPermitidos) && curso.instructoresPermitidos.length > 0
  ? new Set(curso.instructoresPermitidos.map(String))
  : null;
const estaPermitido = (i) => !instructoresPermitidosSet || instructoresPermitidosSet.has(String(i.id));

// En el handler (revalidación antes de mutar)
if (Array.isArray(permitidos) && permitidos.length > 0 && !permitidos.map(String).includes(String(bloque.instructorId))) {
  showToast('El instructor ya no está permitido. Seleccioná otro.', 'error');
  return;
}
17.4 — Uso correcto de get(), getAfter() y exists()
Regla: dentro de una transacción cliente, los documentos escritos en la MISMA transacción NO existen aún en la base cuando las reglas se evalúan. Hay que usar getAfter() en lugar de get().

Caso real: en crearReservaPack, el child se crea + se valida exists(reservasPack/{id}) en la misma transacción. La regla fallaba porque el doc de la maestra aún no existía en ese momento.

Reglas:

get(ruta) — estado ACTUAL del doc. No ve los cambios de la transacción en curso.

getAfter(ruta) — estado DESPUÉS de la transacción. Ve los cambios en curso.

exists(ruta) — 1 lectura, solo presencia. También evalúa el estado pre-transacción.

Uso:

Para validar un doc que YA existe antes de la transacción → get() / exists().

Para validar un doc que se CREA en la misma transacción → getAfter().

17.5 — Path literal en reglas Firestore
Regla: el path completo de las colecciones es:

text
/databases/$(database)/documents/artifacts/motoescuela-pro-v1/public/data/<colección>/<id>
NUNCA omitir artifacts/motoescuela-pro-v1/public/data/.

Caso real: un match /packs/{packId} quedó fuera del bloque match /artifacts/{appId}/public/data { } → la regla aplicaba a packs/ raíz, no a artifacts/.../packs/. Bug silencioso (la app no podía crear/leer).

Checklist al editar reglas:

□ ¿El match /colección está DENTRO del bloque artifacts/.../public/data?
□ ¿El get/getAfter/exists usa el path literal completo?
□ ¿El conteo de llaves } está balanceado? (Firestore Console lo detecta antes de publicar, pero verificar igual).
17.6 — Fire-and-forget con idempotencia
Regla: cuando una operación secundaria puede fallar sin bloquear el flujo principal (ej. avance de maestra del pack), usar fire-and-forget con .catch() + idempotencia interna.

Caso real: el instructor completa el curso → avanza la maestra en background. Si falla por red, el instructor no debe ver error. La maestra se puede reparar después (reparación isomórfica al abrir el pack).

Patrón:

js
// En el flujo crítico (instructor)
await actualizar(campos);  // operación principal

if (condicion) {
  ReservaService.avanzarPackTrasCompletarCurso(...)
    .catch(err => console.warn('[avanzarPack] Error:', err));
}
La función avanzarPackTrasCompletarCurso debe ser idempotente:

Validar que el estado de origen es correcto.

Validar que el estado de destino no se haya alcanzado ya.

Si ya se ejecutó, retornar { success: true, skipped: true }.

17.7 — Documentar reglas nuevas en este archivo
Regla: toda vez que se aprenda una lección importante en producción (bug real, decisión arquitectónica, patrón nuevo), agregarla a este archivo con su propio número de sección.

Motivo: la memoria de las IAs es volátil. Este archivo es la persistencia entre sesiones.

18. COMANDOS DE EMERGENCIA (actualizado)
Si Firestore devuelve permission-denied inesperadamente:

Verificar que el path literal en la regla está completo.

Verificar simetría read/update para el rol.

Verificar si el flujo usa get() cuando debería usar getAfter().

Verificar el conteo de llaves } en la regla.

Si una transacción falla silenciosamente:

Ver el log de la consola del navegador (F12) — el error de Firestore tiene el path y el nombre del commit.

Copiar el bloque de writes:[...] y verificar cada operación individual contra su regla.

Confirmar que el appId sea motoescuela-pro-v1.

Si el estado del pack se desincroniza:

Ejecutar verificar-pack-avance-dev.mjs o check-pack-child-real.mjs.

Verificar subReservas[].estado + subReservas[].reservaId + cursoActual + cursoReservaId.

Si el desfase es reparable → implementar reparación isomórfica al abrir /mi-pack/:id.

Última actualización: 2026-09-28
Sesiones registradas: hasta la 28/09/2026 (Fase 5 del Pack Comercial completa).
Total de secciones: 18.

---

## 19. LECCIÓN — Verificar antes de crear (2026-09-29)

**Regla:** NUNCA crear un archivo nuevo sin antes verificar con grep
que no exista funcionalidad equivalente.

**Caso real que la originó:**
El Arquitecto Principal asumió que `horaIdReposicion` no se usaba
en ningún lado. Creó `ocupacionHelpers.js` con 2 funciones. Minutos
después, el Operador preguntó: "¿No hay nada en todo el sistema
que ya haga eso?". Grep reveló:
  - `reservaHelpers.js` → ya tenía `getHoraIdEfectivo`.
  - `CambiarHorarioModal.jsx` → ya tenía lógica inline equivalente.
El nuevo archivo era redundante y se eliminó sin consumidores.

**Protocolo obligatorio antes de crear un archivo:**

```bash
# 1. Buscar funcionalidad equivalente
grep -rn "concepto-clave" src/ --include="*.js" --include="*.jsx"

# 2. Buscar por nombre del archivo propuesto
find src/ -name "nombrePropuesto*"

# 3. Si existe algo similar → extenderlo, no duplicar.
# 4. Si no existe nada → crear con justificación explícita.
Consecuencia de no seguir esta regla:
Deuda técnica al nacer. Archivos huérfanos. Divergencia de lógica
en múltiples lugares.

Aplicación futura: esta regla se aplica ANTES de crear cualquier
.js, .jsx, .mjs, o cualquier otro archivo de código.

---

## 20. ACTUALIZACIONES POST-SESIÓN 30/09/2026

### 20.1 — El `.firebaserc` puede estar mal
**Regla:** Antes de cualquier `firebase deploy`, verificar con `cat .firebaserc` y `firebase use` que el proyecto activo es el correcto.
**Caso real:** El `.firebaserc` apuntaba a `motoescuela-139e4` (proyecto vacío) mientras el frontend usaba `motoescuela-dev`. Esto causó confusión sobre a qué proyecto deployar.
**Proyectos confirmados:**
- `motoescuela-139e4` (displayName "motoescuela") → VACÍO, obsoleto.
- `motoescuela-dev` → DEV.
- `motoescuelapp` (displayName "motoescuela-prod") → PROD.

### 20.2 — Los archivos `.rules` SÍ existen localmente
**Regla:** `firestore.rules` en raíz es la fuente de verdad. NO se edita solo en la consola.
**Deploy:** `firebase deploy --only firestore:rules --project <projectId>`.
**Corrección al Manual §6:** El Manual decía "Reglas Firestore viven en la consola, NO hay archivo local". Eso está desactualizado.

### 20.3 — Backup obligatorio antes de copiar archivos entre dev y prod
**Regla:** Antes de cualquier `cp` de dev a prod, crear backup con timestamp del archivo de destino:
```bash
BK="backup/pre-deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BK"
cp src/ruta/archivo.jsx "$BK/archivo.jsx.backup"
Luego copiar. Verificar con diff -q que la copia fue exitosa.

20.4 — Clasificación de archivos por número de líneas de diff
Regla: Al sincronizar dev → prod, clasificar los archivos por diff:

1-10 líneas: probablemente strings legales. Riesgo bajo.

10-50 líneas: revisar. Cambios de lógica o strings complejos.

50+ líneas: revisión exhaustiva. Features nuevas o reescrituras.

Verificar los 3 grupos con protocolos separados.

20.5 — Componentes nuevos que importan a otros: copiar primero
Regla: Si un archivo de dev importa otro que no existe en prod, copiar el nuevo PRIMERO.
Ejemplo: reservaHelpers.js, BadgeReposicion.jsx, LegalFooter.jsx se copiaron antes que los archivos que los importaban.

20.6 — Orden de deploy crítico
Regla: Al deployar módulos nuevos que requieren reglas Firestore nuevas:

Reglas Firestore PRIMERO.

Después el código que las consume.
Motivo: Si el código hace getDocs de una colección que las reglas no permiten, el Promise.all completo falla y todos los catálogos quedan vacíos.

20.7 — Instrucciones de Ctrl+H con texto EXACTO de disco
Regla: NUNCA dar un Ctrl+H con el texto "como debe quedar". SIEMPRE verificar con grep primero y dar el texto EXACTO como está en disco.
Ejemplo de fallo: "Buscar: Reasignar tutor o cambiar horario afectará..." cuando en disco decía "Reasignar instructor...". El buscador no encontró coincidencia.
Protocolo: grep -n "<texto candidato>" archivo → verificar que existe → dar el Ctrl+H con ese texto.

20.8 — code <ruta> al inicio del mensaje
Regla: Al dar instrucciones de edición, el comando code <ruta> va al INICIO, en su propio bloque, sin enterrarlo en el párrafo.
Ejemplo correcto:

text
📁 ARCHIVO: src/ruta/archivo.jsx
ABRIR CON: code src/ruta/archivo.jsx
20.9 — Notificaciones: usar crypto.randomUUID() para IDs
Regla: saveNotificacion usa crypto.randomUUID() con fallback. NO usar Date.now().toString() porque puede colisionar cuando se crean múltiples notificaciones en el mismo ms.
Fallback: ${Date.now()}_${Math.random().toString(36).slice(2, 8)} para navegadores antiguos.

20.10 — Notificaciones: getDocs bajo demanda, no onSnapshot
Regla: El listener permanente de notificaciones para admin se eliminó. Ahora refreshNotificaciones() dispara getDocs(limit 30) cuando el admin abre el dropdown.
Ahorro: ~85-95% en lecturas.
Archivos: FirestoreProvider.js, AppContext.jsx, NotificationDropdown.jsx.

20.11 — Módulo Teórico: estado actual
Regla: El módulo teórico está a ~20% (Fase 1 + Fase 2). NO deployado a prod.
Pendiente Fase 3+:

Vista pública /teorico.

Panel del estudiante con tab "Contenido Teórico".

Learning path visual.

Vista de módulo (lecciones + videos + quizzes).

Modo audio Web Speech API.

Streaks.

Flujo de compra.

Aprobación admin.

Colecciones: cursosTeoricos, modulosTeoricos, quizzesTeoricos, packsTeoricos, accesosTeoricos, logrosUsuario.
Reglas Firestore: deployadas en dev.
CRUD admin: completo (AdminCursosTeoricos.jsx, FormCursoTeorico.jsx, EditorModulos.jsx, FormModuloTeorico.jsx, ModuloTeoricoService.js).


---

## 21. FLUJO DE TRABAJO — Git Bash siempre en DEV (2026-10-10)

**Regla fundamental:** Git Bash debe estar parado en `/c/motoescuela-app` **durante toda la sesión de trabajo**. Solo se cambia a `/c/motoescuela-pro` en el momento exacto del deploy.

### Por qué

- El Operador se siente incómodo tocando prod constantemente.
- Confusión entre "diagnóstico" y "deploy".
- Los comandos con path absoluto (`/c/motoescuela-app/...`) no requieren estar parado en dev, pero los `cp`, `npm run build` y `firebase deploy` sí.

### Ciclo de trabajo estándar
cd /c/motoescuela-app ← TODO el trabajo se hace acá

Modificar archivos

npm run dev (opcional) para probar en localhost

Verificar cambios con grep/sed en /c/motoescuela-app

Al terminar la feature, DECIDIR si va a prod

SI VA A PROD:

cd /c/motoescuela-pro ← solo en este paso

Backup + copiar archivos

npm run build + firebase deploy

cd /c/motoescuela-app ← volver inmediatamente a dev

text

### Comandos que NO requieren estar parado en dev

Todos los de diagnóstico (funcionan desde cualquier directorio):

```bash
# Ver un archivo de dev
cat /c/motoescuela-app/src/ruta/archivo.jsx

# Grep sobre dev
grep -n "patron" /c/motoescuela-app/src/ruta/archivo.jsx

# Ver bloque de líneas
sed -n '100,150p' /c/motoescuela-app/src/ruta/archivo.jsx
Comandos que SÍ requieren estar en el directorio correcto
bash
# Dev
cd /c/motoescuela-app
cp origen destino
npm run dev

# Prod (solo para deploy)
cd /c/motoescuela-pro
npm run build
firebase deploy --only hosting --project motoescuelapp
Antes de CADA deploy — verificación obligatoria
bash
diff -rq /c/motoescuela-app/src /c/motoescuela-pro/src 2>/dev/null | grep -v "\.vite\|node_modules\|\.backup" | sort
Esperado: vacío (archivos idénticos).

Si hay diferencias → copiar los archivos faltantes ANTES del deploy. Nunca deployar con diferencias dev/prod.

Estructura mental correcta
/c/motoescuela-app = taller. Todo se modifica, prueba y commitea acá.

/c/motoescuela-pro = espejo. Solo recibe código verificado al momento del deploy.

Regla anti-ansiedad
Si el Operador pregunta "¿estoy en prod?" o "¿esto toca prod?" → la respuesta siempre debe ser:

"El comando usa path absoluto /c/motoescuela-app/..., siempre apunta a dev."

