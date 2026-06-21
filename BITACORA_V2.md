
#### [ARQUITECTO] – 2026-06-21 – Correcciones finales de inscripción y panel

**Decisión/Lección Clave:**
> La disponibilidad debía considerar por separado instructores y motos según si el estudiante trae o no su propia moto. Centralizar la lógica en una función pura (calcularDisponibilidadBloque) y separar el cálculo de días (sin locks) del de bloques (con locks) resolvió múltiples bugs.

**Contexto:**
> La sesión fue extremadamente difícil. Se reintrodujo el bug del campo ctivo/ctiva, se rompió la cinta de fechas al cambiar de día, y el panel del estudiante falló por un error en el orden de los hooks. Se corrigió cada bug con verificación en vivo.

**Alternativas Consideradas:**
> - Modificar el formulario de motos para usar el campo ctiva ? Rechazado por impacto en datos existentes.
> - Usar disabled en los botones de fecha ? Rechazado porque bloquea el evento onClick.
> - Minuto de gracia automático ? Rechazado por el Operador; se implementó modal con límite de 3 intentos.

**Impacto y Deuda:**
> Se cerraron 8 bugs. Se documentó el campo ctivo con un comentario en el código. La deuda técnica B66, B106 y B109 sigue pendiente.

#### [ARQUITECTO] – 2026-06-21 – Correcciones finales de inscripción y panel

**Decisión/Lección Clave:**
> La disponibilidad debía considerar por separado instructores y motos según si el estudiante trae o no su propia moto. Centralizar la lógica en una función pura (calcularDisponibilidadBloque) y separar el cálculo de días (sin locks) del de bloques (con locks) resolvió múltiples bugs.

**Contexto:**
> La sesión fue extremadamente difícil. Se reintrodujo el bug del campo ctivo/ctiva, se rompió la cinta de fechas al cambiar de día, y el panel del estudiante falló por un error en el orden de los hooks. Se corrigió cada bug con verificación en vivo.

**Alternativas Consideradas:**
> - Modificar el formulario de motos para usar el campo ctiva ? Rechazado por impacto en datos existentes.
> - Usar disabled en los botones de fecha ? Rechazado porque bloquea el evento onClick.
> - Minuto de gracia automático ? Rechazado por el Operador; se implementó modal con límite de 3 intentos.

**Impacto y Deuda:**
> Se cerraron 8 bugs. Se documentó el campo ctivo con un comentario en el código. La deuda técnica B66, B106 y B109 sigue pendiente.

#### [ARQUITECTO] – 2026-06-21 – Correcciones finales de inscripción y panel

**Decisión/Lección Clave:**
> La disponibilidad debía considerar por separado instructores y motos según si el estudiante trae o no su propia moto. Centralizar la lógica en una función pura (calcularDisponibilidadBloque) y separar el cálculo de días (sin locks) del de bloques (con locks) resolvió múltiples bugs.

**Contexto:**
> La sesión fue extremadamente difícil. Se reintrodujo el bug del campo ctivo/ctiva, se rompió la cinta de fechas al cambiar de día, y el panel del estudiante falló por un error en el orden de los hooks. Se corrigió cada bug con verificación en vivo.

**Alternativas Consideradas:**
> - Modificar el formulario de motos para usar el campo ctiva ? Rechazado por impacto en datos existentes.
> - Usar disabled en los botones de fecha ? Rechazado porque bloquea el evento onClick.
> - Minuto de gracia automático ? Rechazado por el Operador; se implementó modal con límite de 3 intentos.

**Impacto y Deuda:**
> Se cerraron 8 bugs. Se documentó el campo ctivo con un comentario en el código. La deuda técnica B66, B106 y B109 sigue pendiente.
