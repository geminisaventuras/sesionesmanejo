# [NN] — Nombre del flujo

| Campo | Valor |
|---|---|
| ID | FLUJO-NN |
| Estado | ⚪ / 🟡 / 🟢 / 🔴 |
| Última verificación | DD/MM/AAAA — método (lectura de código / prueba DEV / auditoría PROD) |
| Verificado por | Nombre / rol |
| Archivos clave | `ruta/archivo.js:línea`, ... |
| Deudas relacionadas | IDs de BACKLOG |

## 1. Objetivo y alcance
Qué resuelve el flujo y qué queda fuera.

## 2. Actores y disparadores
Quién lo inicia, desde qué ruta o evento.

## 3. Precondiciones y datos de entrada
Catálogos/configuración necesaria; campos requeridos.

## 4. Secuencia paso a paso
Numerada, con evidencia `archivo:línea`.
1. ...
2. ...

## 5. Colecciones y campos
| Colección | Campos relevantes | Escritura |
|---|---|---|
| ... | ... | create/update/delete |

## 6. Estados y transiciones
| Estado | Quién lo setea | Pasa a |
|---|---|---|

## 7. Invariantes y reglas de negocio
- ...

## 8. Por qué está diseñado así
Historia, restricciones (Plan Spark, reglas, cuotas), enlaces a BITACORA/ADR.

## 9. Dependencias críticas
Qué otros flujos/módulos dependen y en qué dirección.

## 10. Qué se rompe si se cambia
- Lista explícita de “NO CAMBIAR sin rediseño”.
- Impacto por cada cambio posible.

## 11. Seguridad y permisos
Reglas de Firestore, roles, PII, superficies de abuso.

## 12. Costos y cuotas (Plan Spark)
Lecturas/escrituras/listeners por operación. Riesgos de cuota.

## 13. Errores, recuperación e idempotencia
Errores conocidos, mensajes, reintentos, doble submit.

## 14. Pruebas
- Positivas:
- Negativas / seguridad:
- Regresión:

## 15. Riesgos aceptados y deudas
Enlaces a ADR y BACKLOG.

## 16. Preguntas abiertas y supuestos NO verificados
- [POR VERIFICAR] ...
- [SUPUESTO] ...

## 17. Contradicciones detectadas
Afirmaciones de otros documentos que el código desmiente.

## 18. Enlaces
Código, memoria, ADRs, runbooks.

## 19. Changelog del documento
| Fecha | Cambio | Verificado por |
|---|---|---|
| DD/MM/AAAA | Creación | ... |
