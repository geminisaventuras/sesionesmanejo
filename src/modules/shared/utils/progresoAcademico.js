// @build: 2026-11-27 | id: PROGRESO-ACADEMICO-HELPERS | desc: Lógica pura de completado de módulos (T-079)

// Helpers puros para marcar módulos de una reserva. No tocan Firestore: la vista
// arma el batch con estos resultados y las reglas siguen siendo la autoridad.

function nombreDe(modulo) {
  return typeof modulo === 'string' ? modulo : modulo?.nombre;
}

function duracionDe(modulo) {
  return Number(typeof modulo === 'string' ? 0 : modulo?.duracion) || 0;
}

// Normaliza el catálogo del curso: admite módulos como texto u objeto.
export function normalizarModulos(curso) {
  return (curso?.modulos || []).map((mod) => (typeof mod === 'string' ? { nombre: mod } : mod));
}

// Agrega o reemplaza un módulo por su nombre sin mutar el mapa original.
export function marcarModulo(estados, modulo, fechaISO) {
  const nombre = nombreDe(modulo);
  if (!nombre) return { ...(estados || {}) };
  return {
    ...(estados || {}),
    [nombre]: { fecha: fechaISO, duracion: duracionDe(modulo) },
  };
}

// Marca todos los módulos que aún no tienen fecha, conservando los ya completados.
export function marcarTodosLosModulos(estados, modulos, fechaISO) {
  const nuevos = { ...(estados || {}) };
  for (const modulo of modulos || []) {
    const nombre = nombreDe(modulo);
    if (!nombre || nuevos[nombre]?.fecha) continue;
    nuevos[nombre] = { fecha: fechaISO, duracion: duracionDe(modulo) };
  }
  return nuevos;
}

// El curso solo está completo cuando todos sus módulos tienen fecha.
export function cursoEstaCompletado(modulos, estados) {
  const lista = (modulos || []).filter(Boolean);
  if (lista.length === 0) return false;
  return lista.every((modulo) => {
    const nombre = nombreDe(modulo);
    return Boolean(nombre && estados?.[nombre]?.fecha);
  });
}
