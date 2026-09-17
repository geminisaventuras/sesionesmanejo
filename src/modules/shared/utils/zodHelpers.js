// @build: 2026-09-06 | id: FIX-013A | desc: Extracción segura de errores Zod
export function validarConZod(schema, data) {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errores = {};

    if (result.error && Array.isArray(result.error.issues)) {
      result.error.issues.forEach((issue, index) => {
        if (!issue) return;

        const pathKey = Array.isArray(issue.path) && issue.path.length > 0
          ? String(issue.path[0])
          : `_error_${index}`;

        errores[pathKey] = issue.message || 'Error de validación';
      });
    } else {
      errores._general = 'Error de validación desconocido';
    }

    return { success: false, errores };
  } catch (error) {
    console.error('[Zod] Error inesperado:', error);
    return {
      success: false,
      errores: { _general: error.message || 'Error de validación' }
    };
  }
}

export function obtenerPrimerError(resultado, fallback = 'Datos inválidos') {
  if (!resultado || !resultado.errores) return fallback;
  const valores = Object.values(resultado.errores);
  return valores.length > 0 ? valores[0] : fallback;
}