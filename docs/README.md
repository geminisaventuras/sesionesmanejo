# Documentación técnica — MotoEscuela App

Este directorio contiene la documentación **viva** de los flujos del sistema.
No reemplaza a la memoria del proyecto (`ARRANQUE_MEMORIA_IA.md`, `BITACORA_EXPERIENCIAL.md`, `BACKLOG_V2.md`):
la memoria registra historia y decisiones; los flujos describen **cómo funciona el sistema hoy**.

## Para qué sirve
- Reducir asunciones: cada flujo se documenta una vez, con evidencia.
- Conocer dependencias ocultas y qué se rompe si se cambia algo.
- Dejar explícitos los riesgos aceptados y las deudas.
- Dar a cualquier IA o persona un punto de entrada antes de tocar código.

## Estructura
```
docs/
├── README.md                      ← este archivo
├── flujos/
│   ├── _PLANTILLA.md              ← plantilla obligatoria
│   ├── INDICE.md                  ← mapa de flujos, estado y deudas
│   ├── 01-inscripcion-individual.md
│   ├── ...
│   └── 13-operacion-deploy-backups.md
├── analisis/
│   ├── AUDITORIA-FASE0-20261119.md
│   └── ISSUES-LOTE-A.md
├── decisiones/
│   ├── ADR-001-riesgo-pin-pii-aceptado.md
│   └── ADR-002-alcance-adr-001.md
└── MIGRACION_PRODUCCION.md        ← runbook existente (se mantiene aquí)
```

**Estado:** 13/13 flujos documentados (01-13), todos en 🟡 (verificados por código; pendiente prueba DEV/PROD y revisión FIRE/MAMBA de los críticos). **Fase 0 de auditoría completada:** reglas vivas = repo, sin packs legacy, accesos teóricos no determinísticos y hallazgo crítico en `instructores` (`ISS-36`). **ISS-36A aplicado:** `password` eliminado de Firestore en DEV/PROD. **ISS-36B aplicado:** `instructoresPublicos` sin PII y perfiles privados solo admin/dueño; queda `ISS-36C` (rotación). **Finanzas 19/11:** comisión congelada como SSOT, deuda de proveedor por `proveedorId`, portal del proveedor alineado, backfill del espejo, tab Resumen y módulo enterprise con menú, ledger, gastos, ingresos extra, impuestos en modo preparación y reportes. `movimientos` ya es admin-only.

## Reglas de evidencia
1. Toda afirmación de comportamiento cita `archivo:línea` o el símbolo exacto. Si no se verificó, se marca `[POR VERIFICAR]` o `[SUPUESTO]`.
2. Cada ficha indica **estado** y **fecha de última verificación** (lectura de código, prueba en DEV o auditoría en PROD).
3. Las contradicciones se documentan en la sección “Contradicciones detectadas”; no se ocultan.
4. Los flujos críticos pasan a 🟢 solo con revisión FIRE + MAMBA.

## Estados
| Icono | Significado |
|---|---|
| 🟢 | Verificado (código + DEV) y revisado por FIRE/MAMBA si es crítico |
| 🟡 | Verificado por código; pendiente prueba en DEV o revisión |
| 🔴 | Desactualizado: el código cambió y la ficha no |
| ⚪ | Pendiente de documentar |

## Mantenimiento
- Los documentos se editan en **DEV** y se sincronizan a **PROD** (misma regla que el código).
- Si un cambio de código altera un flujo, la ficha se actualiza **en el mismo release**.
- Las fichas son **vivas**: se actualizan. La memoria es **solo adición**.
- Las decisiones de arquitectura o riesgo se registran como **ADR** en `docs/decisiones/` y no se editan: se superseden con un ADR nuevo.
- Antes de tocar un flujo: leer `docs/flujos/INDICE.md` y su ficha.

## Cómo agregar un flujo
1. Copiar `_PLANTILLA.md` a `NN-nombre-del-flujo.md`.
2. Completar con evidencia (no con supuestos).
3. Agregarlo a `INDICE.md`.
4. Si hay una decisión de riesgo, crear un ADR.
5. Sincronizar a PROD y commitear.

## Documentos relacionados
- `MANUAL_ARQUITECTO.md` — estándar de ingeniería.
- `INSTRUCCIONES_A_LA_IA.md` — onboarding y reglas de trabajo.
- `ARRANQUE_MEMORIA_IA.md` — historia de sesiones.
- `BITACORA_EXPERIENCIAL.md` — lecciones aprendidas.
- `BACKLOG_V2.md` — deuda técnica.
