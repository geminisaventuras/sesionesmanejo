# ADR-001 — Aceptación temporal del riesgo de PIN/PII en el progreso de inscripción

| Campo | Valor |
|---|---|
| ID | ADR-001 |
| Fecha | 19/11/2026 |
| Estado | **Aceptado** (vigente) |
| Decisor | Operador del proyecto |
| Arquitecto | Deek |
| Supersede | — |
| Relacionado | FLUJO-01, FLUJO-02, BACKLOG `B123`, `B-REGISTRO-REDESIGN` |

## Contexto

Durante la auditoría completa del 19/11/2026 se verificó que:

- El PIN que usa el estudiante para iniciar sesión **es la contraseña de Firebase Auth** (`AuthService.loginEstudiante` → `signInWithEmailAndPassword(correo, pin)`).
- El PIN se genera al crear la cuenta (final del Paso 1) y **solo se muestra al usuario en la pantalla de éxito, después de emitir el pago** (`InscripcionView.jsx:1183`, render en `1699-1710`). El componente `ModalPIN` existe pero no se renderiza en el flujo actual.
- Para permitir que un usuario que abandona la inscripción pueda retomarla sin conocer el PIN, el sistema:
  - guarda el PIN en `progresoInscripcion/{correoSanitizado}`;
  - permite `get` sin autenticación (`firestore.rules:202-215`);
  - lee el progreso por correo y hace **auto-login** con el PIN guardado (`InscripcionView.jsx:1477-1480` y `1540`).
- El documento de progreso contiene PII completa (nombre, cédula, teléfono, dirección, condición médica, datos de pago) y el PIN.
- El ID del documento es adivinable: `correo.replace(/[@.]/g,'_')` (`ReservaService.js:126-127`).

El diseño no es un descuido: `BITACORA_EXPERIENCIAL.md:334` documenta que FIRE rechazó usar `query` porque las reglas bloquean `list`, y `fetchSignInMethodsForEmail` no resultó viable en Plan Spark. La solución elegida fue `getDoc` directo con ID de correo sanitizado + regla `allow get: if true`, para sostener la reinscripción (B154).

## Decisión

**Aceptar temporalmente el riesgo** y **no modificar** el flujo de registro, el PIN, `progresoInscripcion` ni sus reglas.

Motivos explicitados por el Operador:
- Cambios anteriores en este flujo generaron regresiones y “dolores de cabeza” operativos.
- El rediseño del registro se hará más adelante, de forma planificada.
- El riesgo se considera asumible por ahora.

## Consecuencias

### Positivas
- No se rompe la continuidad de la inscripción abandonada.
- Se evita una regresión en el flujo que genera las ventas.
- La decisión queda registrada y trazable (este ADR + fichas FLUJO-01/02).

### Negativas (riesgo aceptado)
- Quien conozca el correo de un estudiante en proceso puede leer su progreso (incluida PII y el PIN) y potencialmente tomar su cuenta.
- Instructores pueden leer el PIN desde la reserva (`reservas.pin`), aunque hoy es un campo muerto (no se lee en el código).
- No hay mitigación técnica mientras se mantenga el diseño.

### Factores que limitan el riesgo
- `list: false`: no se puede enumerar la colección; hace falta conocer el correo.
- Base de usuarios pequeña y sin exposición pública de correos.
- La explotación requiere un ataque dirigido, no un scraping masivo.

## Alternativas evaluadas (no ejecutadas)

1. **Hotfix de reglas** (`get` con `isAuth` + dueño): cierra la lectura anónima, pero rompe el auto-login de abandono porque el usuario no conoce el PIN.
2. **Reset por correo + login manual**: viable, pero requiere rediseñar UX y flujo; se difiere.
3. **Email-link (passwordless)**: la opción más segura, pero requiere configuración y pruebas; se difiere.
4. **Mostrar el PIN al final del Paso 1**: reduce el abandono bloqueado, pero cambia la UX actual; se difiere.

## Revisión

- **Disparador:** al iniciar el rediseño del registro (`B-REGISTRO-REDESIGN`).
- **Fecha sugerida de revisión:** 90 días o antes si se detecta incidente.
- Si se revisa, este ADR no se edita: se crea `ADR-00X` que lo supersede.

## Enlaces
- `docs/flujos/01-inscripcion-individual.md`
- `docs/flujos/02-reinscripcion-recuperacion.md`
- `BITACORA_EXPERIENCIAL.md:334` (justificación histórica de `get: true`)
- `BACKLOG_V2.md` (`B123`, `B-REGISTRO-REDESIGN`)
