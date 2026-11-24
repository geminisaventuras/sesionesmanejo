// ERR-059: la bandeja de Reservas cuenta solo sesiones en su badge; los packs
// comerciales y los teóricos viven en sus propias secciones y no inflan el total.
// Una misma reserva puede aparecer en "Hoy" y "Pendientes"/"Próximas": se cuenta
// una sola vez por `key`. Con tipo 'todo' se cuentan los tres tipos (clave
// prefijada por tipo para no colisionar).
export const contarItemsBandeja = (secciones = [], tipo = 'reserva') => {
  const vistos = new Set();
  let total = 0;
  for (const seccion of secciones || []) {
    const items = Array.isArray(seccion?.items) ? seccion.items : [];
    for (const item of items) {
      const tipoItem = item?.tipo;
      if (tipo !== 'todo' && tipoItem !== tipo) continue;
      const clave = `${tipoItem ?? 'otro'}:${item.key ?? item.id ?? ''}`;
      if (item?.key != null || item?.id != null) {
        if (vistos.has(clave)) continue;
        vistos.add(clave);
      }
      total += 1;
    }
  }
  return total;
};
