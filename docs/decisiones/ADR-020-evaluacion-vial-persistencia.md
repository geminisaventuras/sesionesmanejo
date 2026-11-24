# ADR-020 — Evaluación Vial: persistencia por estudiante y acceso público

- **Fecha:** 2026-11-24
- **Estado:** aceptado
- **Flujo:** F-03.3 / F-04.3
- **Decisor:** Operador

## Contexto

Se integra una evaluación vial autónoma de 16 preguntas (Ley Venezolana y Manual MSF Ed. 17) como ruta `/evaluacion`. El Operador pidió que el módulo sea público para captar visitantes y que los estudiantes registrados persistan su resultado, de modo que el reto alimente el flujo del sistema.

Hoy el portal del estudiante muestra “Retos — Próximamente” y no existe colección para resultados de evaluación. Las reglas de Firestore solo cubren accesos y progreso de teóricos oficiales (`accesosTeoricos`, `progresoTeorico`), que son contenido pago y validado.

## Decisión

1. La evaluación vive en **`/evaluacion`** como ruta pública.
2. **Anónimos:** solo `localStorage` (`motoescuela_eval_ultimo`); cero escrituras en Firestore.
3. **Autenticados:** último resultado en `artifacts/motoescuela-pro-v1/public/data/evaluacionesViales/{uid}` con `userId`, `porcentaje`, `modo`, `modoLabel`, `rachaMaxima`, `tiempoSegundos`, `intentos` y `actualizadoEn`. Sin PII y sin respuestas.
4. **Acceso:** lectura solo del dueño o admin; create/update solo el dueño con allowlist y rangos; delete solo admin.
5. El resultado es **orientativo**: no certifica, no otorga acceso a teóricos pagos y no se mezcla con `progresoTeorico`.
6. **Presentación regulatoria (Operador, 24/11):** la vista no menciona la marca “Motoescuela” ni se presenta como escuela, instituto o servicio de transporte. Usa el isotipo de Motoapp, el título “Evaluación Vial”, “Recomendación personalizada” y el `LegalFooter` con el aviso de educación no formal / no INTT. “motoescuela-pro-v1” queda solo como identificador técnico del proyecto Firebase.

## Alternativas consideradas

- **Solo localStorage:** simple y sin reglas, pero no trae el flujo al sistema ni permite métricas.
- **Guardar en `progresoTeorico`:** reutiliza reglas existentes, pero contamina el progreso oficial y exige un curso oficial inexistente.
- **Historial completo de respuestas:** más valor analítico, pero implica más datos, más costo y revisión de PII; se pospone.

## Consecuencias

- Positivas: captación pública, retención en el portal y base para métricas de conocimiento sin tocar dinero ni datos históricos.
- Negativas/riesgos: el puntaje se calcula en el cliente y es manipulable; solo se guarda el último resultado; una escritura fallida deja el resultado local. El banco de 16 preguntas es estático y duplica normativa que también vive en el catálogo oficial de teóricos, por lo que requiere mantenimiento manual coordinado.
- Impacto en datos, dinero, seguridad o UX: colección nueva sin PII; no cambia precios, comisiones, permisos existentes ni accesos. La presentación evita cualquier apariencia de institución de transporte y muestra el aviso legal.
- Verificación requerida: build y smoke de UI; reglas compiladas y liberadas en DEV. La suite de reglas en emulador queda pendiente porque la máquina tiene Java 8 y `firebase-tools` exige Java 21.

## Enlaces

- Tarjeta: `tablero/tareas.json` → T-114
- Feature: `tablero/features.json` → FT-051
- Código: `src/modules/teorico/EvaluacionVialView.jsx`, `src/modules/teorico/evaluacionVialService.js`
- Reglas: `firestore.rules` → `match /evaluacionesViales/{uid}`
- Test: `tests/rules/evaluacion-vial-rules.test.mjs`
