# ADR-002 — Alcance de ADR-001: solo PIN/PII

| Campo | Valor |
|---|---|
| ID | ADR-002 |
| Fecha | 19/11/2026 |
| Estado | **Aceptado** (alcance) |
| Decisor | Operador del proyecto |
| Arquitecto | Deek |
| Supersede | — |
| Relacionado | ADR-001, Lote A, `CRITICO-PIN-PII-REGLAS-V1` |

## Contexto

ADR-001 decidió **aceptar temporalmente el riesgo PIN/PII** y no modificar el flujo de registro, el PIN, `progresoInscripcion` ni sus reglas.

Esa decisión se tomó después de un dictamen de MAMBA (`CRITICO-PIN-PII-REGLAS-V1`) que también incluía recomendaciones **no relacionadas con el PIN**:

- `movimientos.create` solo admin;
- lock validado en `reservas.create`;
- App Check;
- timezone SSOT;
- `slotsInstructor`;
- multi-admin;
- paridad de configuración.

El texto de ADR-001 usa la frase amplia “no modificar el flujo de registro”, lo que podría interpretarse erróneamente como un rechazo a todas esas recomendaciones.

## Decisión

**ADR-001 se limita exclusivamente a PIN/PII, registro, auto-login y `progresoInscripcion`.**

No bloquea ni rechaza:

- `ISS-11` / `ISS-12` (`movimientos`);
- `ISS-13` / `ISS-14` (perfil de instructor);
- `ISS-15` a `ISS-18` (teóricos);
- `ISS-19` a `ISS-21` (packs);
- `ISS-22` a `ISS-30` (lock, App Check, timezone, multi-admin, paridad);
- `ISS-36` (credenciales/PII de instructores), que es un hallazgo separado.

Esos issues quedan **pendientes de análisis y consulta**, no rechazados.

## Consecuencias

- `ISS-06` a `ISS-10` siguen congelados por ADR-001.
- Los demás issues pueden consultarse y diseñarse por separado.
- Cualquier cambio que toque PIN/PII requiere reabrir ADR-001 con un ADR que lo superseda.
- `ISS-36` no está cubierto por ADR-001 y debe tratarse como incidente de seguridad propio.

## Enlaces

- `docs/decisiones/ADR-001-riesgo-pin-pii-aceptado.md`
- `docs/analisis/AUDITORIA-FASE0-20261119.md`
- `docs/analisis/ISSUES-LOTE-A.md`
