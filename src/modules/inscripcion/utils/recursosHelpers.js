// @build: 2026-11-23 | id: PROVEEDOR-INACTIVO | desc: Validación pura de instructor/moto asignados antes de crear una reserva (fail-closed) + proveedor inactivo no vende.

const normalizarTexto = (valor) => String(valor ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const normalizarId = (valor) => (valor === null || valor === undefined ? '' : String(valor).trim());

const error = (code, message) => ({ ok: false, code, message });

/**
 * D11: el servicio no debe confiar en que el tutor del lock exista, siga
 * activo y cubra la sede elegida. El curso no se valida aquí: la política de
 * `instructoresPermitidos` no cambia en este alcance.
 */
export function validarInstructorAsignado({ instructor, sedeId } = {}) {
  if (!instructor) {
    return error('instructor-not-found', 'El tutor seleccionado ya no existe. Elige otro horario.');
  }
  if (instructor.activo === false) {
    return error('instructor-inactivo', 'El tutor asignado ya no está activo. Elige otro horario.');
  }
  const sedes = Array.isArray(instructor.sedes) ? instructor.sedes.map(normalizarId) : [];
  const sede = normalizarId(sedeId);
  if (sedes.length > 0 && sede && !sedes.includes(sede)) {
    return error('instructor-sede-invalida', 'El tutor no está disponible en la sede seleccionada. Elige otro horario.');
  }
  return { ok: true };
}

/**
 * D11: valida la moto escolar efectiva de la reserva. Si no hay moto (trae su
 * propia moto o el curso no incluye moto) no aplica. La compatibilidad de tipo
 * usa `curso.tiposMotoEscuela` como SSOT, igual que la UI.
 */
export function validarMotoAsignada({ moto, motoId, sedeId, curso } = {}) {
  if (!normalizarId(motoId)) return { ok: true };
  if (!moto) {
    return error('moto-not-found', 'La moto asignada ya no existe. Elige otro horario.');
  }
  if (moto.activo === false) {
    return error('moto-inactiva', 'La moto asignada ya no está activa. Elige otro horario.');
  }
  const sedes = Array.isArray(moto.sedes) ? moto.sedes.map(normalizarId) : [];
  const sede = normalizarId(sedeId);
  if (sedes.length > 0 && sede && !sedes.includes(sede)) {
    return error('moto-sede-invalida', 'La moto asignada no está disponible en la sede seleccionada. Elige otro horario.');
  }
  const tipos = Array.isArray(curso?.tiposMotoEscuela)
    ? curso.tiposMotoEscuela.map(normalizarTexto).filter(Boolean)
    : [];
  const tipoMoto = normalizarTexto(moto.tipo);
  if (tipos.length > 0 && tipoMoto && !tipos.includes(tipoMoto)) {
    return error('moto-tipo-incompatible', 'La moto asignada no es compatible con este curso. Elige otro horario.');
  }
  return { ok: true };
}

/**
 * Decisión del Operador (2026-11-23): un proveedor con `activo === false` no
 * puede vender. `activo === true` o el campo ausente se consideran permitidos
 * (compatibilidad con datos legacy). Sin documento de proveedor no hay dato:
 * esta función recibe el doc ya resuelto y, si es `null`/`undefined`, lo deja
 * pasar. La ausencia de doc ≠ inactivo.
 */
export function proveedorBloqueado(proveedor) {
  return proveedor?.activo === false;
}

/**
 * Excluye de la disponibilidad las motos cuyo proveedor está inactivo.
 * - Solo aplica cuando la moto declara `proveedorId`.
 * - Si no se conoce el proveedor (id sin doc en la lista entregada), la moto
 *   se conserva: en DEV/legacy la ausencia de doc no equivale a inactivo y la
 *   regla de Firestore sigue siendo la autoridad al escribir la reserva.
 * - Moto sin `proveedorId` (moto propia/escuela sin proveedor) se conserva.
 * No muta el arreglo recibido.
 */
export function filtrarMotosProveedorActivo(motos, proveedores) {
  if (!Array.isArray(motos) || motos.length === 0) return [];
  const porId = new Map(
    (Array.isArray(proveedores) ? proveedores : [])
      .map(proveedor => [normalizarId(proveedor?.id), proveedor])
      .filter(([id]) => Boolean(id))
  );
  return motos.filter(moto => {
    const proveedorId = normalizarId(moto?.proveedorId);
    if (!proveedorId) return true;
    const proveedor = porId.get(proveedorId);
    if (!proveedor) return true;
    return !proveedorBloqueado(proveedor);
  });
}
