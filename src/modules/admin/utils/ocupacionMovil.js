// T-104 — Helpers puros de la vista móvil de Ocupación.
// Solo presentación: derivan de la `matriz` ya calculada (sin consultas ni estados nuevos).

/**
 * Agrega la ocupación de UN día por sede a partir de `matriz[fecha][bloqueId].porSede`.
 * Ignora sedes sin id, descarta sedes sin total/retenidos/bloqueados y ordena por catálogo.
 */
export const agregarSedesDia = ({ fecha, bloques, matriz, sedes }) => {
  const porSede = new Map();

  for (const bloque of bloques) {
    const info = matriz?.[fecha]?.[bloque.id];
    const lista = Array.isArray(info?.porSede) ? info.porSede : [];
    for (const sedeInfo of lista) {
      const clave = String(sedeInfo?.sedeId ?? '');
      if (!clave) continue;
      const previo = porSede.get(clave) || {
        sedeId: clave,
        total: 0,
        disponibles: 0,
        retenidos: 0,
        bloqueados: 0,
        celdas: 0,
      };
      porSede.set(clave, {
        sedeId: clave,
        total: previo.total + (Number(sedeInfo.total) || 0),
        disponibles: previo.disponibles + (Number(sedeInfo.disponibles) || 0),
        retenidos: previo.retenidos + (Array.isArray(sedeInfo.locks) ? sedeInfo.locks.length : 0),
        bloqueados: previo.bloqueados + (sedeInfo.estado === 'bloqueado' ? 1 : 0),
        celdas: previo.celdas + 1,
      });
    }
  }

  const ordenCatalogo = new Map((sedes || []).map((sede, indice) => [String(sede.id), indice]));
  const ordenarPorCatalogo = (a, b) => {
    const ia = ordenCatalogo.has(a) ? ordenCatalogo.get(a) : Number.MAX_SAFE_INTEGER;
    const ib = ordenCatalogo.has(b) ? ordenCatalogo.get(b) : Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return String(a).localeCompare(String(b));
  };

  return Array.from(porSede.values())
    .filter((s) => s.celdas > 0 && (s.total > 0 || s.retenidos > 0 || s.bloqueados > 0))
    .sort((a, b) => ordenarPorCatalogo(a.sedeId, b.sedeId));
};

/**
 * Día por defecto de la ventana: el primero con sedes con datos; si no hay, el día 0.
 */
export const indiceDiaConSedes = (vistasPorDia) => {
  if (!Array.isArray(vistasPorDia) || vistasPorDia.length === 0) return 0;
  const indice = vistasPorDia.findIndex((lista) => Array.isArray(lista) && lista.length > 0);
  return indice >= 0 ? indice : 0;
};

/**
 * Siguiente día con sedes después de `desde`; si no hay más adelante,
 * devuelve el primero con sedes. -1 si ningún día tiene sedes.
 */
export const siguienteDiaConSedes = (vistasPorDia, desde) => {
  if (!Array.isArray(vistasPorDia) || vistasPorDia.length === 0) return -1;
  const inicio = (Number(desde) || 0) + 1;
  for (let indice = inicio; indice < vistasPorDia.length; indice += 1) {
    if (vistasPorDia[indice]?.length > 0) return indice;
  }
  return vistasPorDia.findIndex((lista) => lista?.length > 0);
};
