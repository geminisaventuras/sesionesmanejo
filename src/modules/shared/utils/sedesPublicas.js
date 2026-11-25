// @build: 2026-11-25 | id: SEDES-PUBLICAS-PROYECCION | desc: Proyección pública mínima de sedes para la vitrina (sin PII).
//
// FT-062: la vitrina necesita el recargo por sede para mostrar el precio real
// desde el inicio. `sedes` es auth-only, así que se publica una copia mínima en
// `informacionPublica/sedes` (lectura anónima) con los mismos IDs y el recargo
// vigente. No incluye coordenadas, comisiones ni datos internos.

const numeroNoNegativo = (valor) => {
  if (valor == null || valor === '' || typeof valor === 'boolean') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
};

export function recargoSedeNumerico(sede) {
  return numeroNoNegativo(sede?.recargo) ?? 0;
}

export function etiquetaHorarioSede(sede, horarios = []) {
  const ids = Array.isArray(sede?.horariosHabilitados)
    ? sede.horariosHabilitados.map((id) => String(id))
    : [];
  if (ids.length === 0) return '';

  const porId = new Map(
    (Array.isArray(horarios) ? horarios : []).map((horario) => [String(horario?.id ?? ''), horario])
  );

  const labels = ids
    .map((id) => porId.get(id))
    .filter((horario) => horario && horario.activo !== false)
    .map((horario) => String(horario.label ?? '').trim())
    .filter(Boolean);

  return [...new Set(labels)].join(' · ');
}

export function construirSedesPublicas(sedes = [], horarios = []) {
  const publicas = {};

  (Array.isArray(sedes) ? sedes : []).forEach((sede) => {
    if (!sede || typeof sede !== 'object') return;
    if (sede.activo === false) return;
    if (sede.id == null || String(sede.id).trim() === '') return;

    const id = String(sede.id);
    publicas[id] = {
      id,
      nombre: typeof sede.nombre === 'string' ? sede.nombre.trim() : '',
      direccion: typeof sede.direccion === 'string' ? sede.direccion.trim() : '',
      puntoReferencia:
        typeof sede.puntoReferencia === 'string' && sede.puntoReferencia.trim()
          ? sede.puntoReferencia.trim()
          : typeof sede.zona === 'string'
            ? sede.zona.trim()
            : '',
      horario: etiquetaHorarioSede(sede, horarios),
      recargo: recargoSedeNumerico(sede),
      ciudadId: sede.ciudadId == null ? '' : String(sede.ciudadId),
      municipioId: sede.municipioId == null ? '' : String(sede.municipioId),
      estadoId: sede.estadoId == null ? '' : String(sede.estadoId),
    };
  });

  return publicas;
}
