// @build: 2026-11-23 | id: T-072-OCUPACION-FUENTE-VERDAD | desc: Fuente de verdad espejo+locks, capacidad por sede y moto condicionada (ADR-011).
//
// Reglas implementadas (ADR-011 / T-072 / ERR-035):
// 1. Disponibilidad = `ocupacionConfirmada` + `ocupacionTemporal` (locks).
//    `reservas` solo enriquece nombre/estado/detalle; no decide sola el cupo.
// 2. Un pago `Rechazado` conserva el espejo `Pendiente` y sigue ocupando.
//    Solo la cancelación definitiva (espejo eliminado) libera.
// 3. Capacidad por sede: en "Todas" no se suman tutores/motos de sedes distintas.
// 4. Tutor primero; las motos son inventario condicionado (motoIncluida/traeMoto/
//    tiposMotoEscuela). D2 usa `getMotoIdOcupacion` (motoReposicionId).
// 5. Un lock activo se muestra como `retenido`, nunca como libre.
// 6. Fechas VET y campo vacío seguro (sin `toISOString` que lance).
import { afectaFechaAdmin, afectaHorarioAdmin, afectaInstructor, afectaProveedor } from '../../shared/utils/bloqueosHelpers.js';
import { bloqueYaInicio, getHoraIdOcupacion, getMotoIdOcupacion } from '../../shared/utils/reservaHelpers.js';
import { calcularNecesitaMoto } from '../../shared/utils/motoHelpers.js';
import { lockVigente } from '../../inscripcion/utils/locksHelpers.js';

const ESTADOS_OCUPAN = ['Pendiente', 'Aprobado'];
const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

const idIgual = (a, b) => String(a ?? '') === String(b ?? '');

const perteneceASede = (recurso, sedeId) =>
  (recurso?.sedes || []).some(s => idIgual(s, sedeId));

const motoIdValido = (motoId) => {
  if (motoId === null || motoId === undefined) return false;
  const texto = String(motoId).trim();
  if (!texto) return false;
  return texto.toLowerCase() !== 'sinmoto';
};

// `traeMoto` se guarda como 'Sí'; se normaliza para tolerar 'Si' legacy.
const esMotoPropia = (traeMoto) => String(traeMoto ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase() === 'si';

// ─── Fechas VET seguras ──────────────────────────────────────────
// Un string `YYYY-MM-DD` se trata como día calendario VET; nunca se reinterpreta
// con `toISOString` ni se convierte desde UTC. Un campo vacío es inválido, no
// una excepción.

export function esFechaValida(fecha) {
  if (typeof fecha !== 'string') return false;
  const coincidencia = RE_FECHA.exec(fecha);
  if (!coincidencia) return false;
  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const calendario = new Date(Date.UTC(anio, mes - 1, dia, 12));
  return calendario.getUTCFullYear() === anio
    && calendario.getUTCMonth() === mes - 1
    && calendario.getUTCDate() === dia;
}

export function sumarDiasFecha(fecha, dias = 0) {
  if (!esFechaValida(fecha)) return null;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + Number(dias || 0), 12));
  const yy = resultado.getUTCFullYear();
  const mm = String(resultado.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(resultado.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Construye una ventana de `cantidad` días VET a partir de `fechaInicio`.
 * Si la fecha está vacía o es inválida devuelve `valido: false` y `dias: []`
 * para que la vista muestre un estado vacío en vez de lanzar RangeError.
 */
export function construirRangoFechas(fechaInicio, cantidad = 7) {
  if (!esFechaValida(fechaInicio) || !Number.isInteger(cantidad) || cantidad <= 0) {
    return { valido: false, fechaInicio: null, fechaFin: null, dias: [] };
  }
  const dias = [];
  for (let i = 0; i < cantidad; i += 1) {
    dias.push(sumarDiasFecha(fechaInicio, i));
  }
  return {
    valido: true,
    fechaInicio,
    fechaFin: dias[dias.length - 1],
    dias
  };
}

// ─── Internos ────────────────────────────────────────────────────

// Resuelve la sede de un documento de ocupación. Los documentos nuevos traen
// `sedeId`; para datos legacy se infiere del tutor/moto del catálogo para no
// ocultar ocupación real por un campo faltante.
function sedeDeOcupacion(doc, instructores, motos) {
  if (doc?.sedeId !== null && doc?.sedeId !== undefined && String(doc.sedeId).trim() !== '') {
    return String(doc.sedeId);
  }
  const instructor = (instructores || []).find(i => idIgual(i.id, doc?.instructorId));
  if (instructor?.sedes?.length) return String(instructor.sedes[0]);
  const moto = (motos || []).find(m => idIgual(m.id, doc?.motoAsignadaId));
  if (moto?.sedes?.length) return String(moto.sedes[0]);
  return null;
}

function construirDetalle({
  fuenteOcupacion,
  reservasPorId,
  fecha,
  sedeId,
  cursoId,
  instructores,
  motos
}) {
  const detalle = [];
  for (const docOcupacion of fuenteOcupacion) {
    if (!ESTADOS_OCUPAN.includes(docOcupacion?.estadoPago)) continue;
    if (docOcupacion?.estadoCurso === 'Cancelado') continue;
    if (!idIgual(sedeDeOcupacion(docOcupacion, instructores, motos), sedeId)) continue;
    // getHoraIdOcupacion devuelve null cuando la fecha no aplica al documento.
    const bloqueDoc = getHoraIdOcupacion(docOcupacion, fecha);
    if (!bloqueDoc) continue;
    if (cursoId && !idIgual(docOcupacion.cursoId, cursoId)) continue;

    const reserva = reservasPorId.get(String(docOcupacion.id));
    detalle.push({
      id: docOcupacion.id,
      nombre: reserva?.nombre || docOcupacion.nombre || '',
      cursoId: reserva?.cursoId ?? docOcupacion.cursoId ?? null,
      horaId: bloqueDoc,
      estadoPago: reserva?.estadoPago || docOcupacion.estadoPago || null,
      estadoCurso: reserva?.estadoCurso || docOcupacion.estadoCurso || null,
      instructorId: docOcupacion.instructorId || null,
      motoId: getMotoIdOcupacion(docOcupacion, fecha),
      traeMoto: docOcupacion.traeMoto || 'No',
      tipoReserva: reserva?.tipoReserva || docOcupacion.tipoReserva || null,
      origen: 'espejo'
    });
  }
  return detalle;
}

function calcularParaSede({
  sedeId,
  fecha,
  bloque,
  instructores,
  motos,
  cursoObj,
  fuenteOcupacion,
  reservasPorId,
  locksBloque,
  bloqueosAdmin,
  bloqueosInstructores,
  bloqueosProveedor,
  filtros,
  ahora
}) {
  // ERR-047: un bloque que ya inició no se ofrece aunque quede cupo. Se cierra
  // por sede y el agregado lo refleja (ver `calcularEstadoBloque`).
  if (bloqueYaInicio(fecha, bloque?.label, new Date(ahora))) {
    return { ...resultadoVacio(), estado: 'cerrado', motivo: 'Horario vencido', sedeId };
  }

  const locksSede = locksBloque.filter(lock => {
    const instructor = (instructores || []).find(i => idIgual(i.id, lock.instructorId));
    if (instructor) return perteneceASede(instructor, sedeId);
    const moto = (motos || []).find(m => idIgual(m.id, lock.motoAsignadaId));
    if (moto) return perteneceASede(moto, sedeId);
    return false;
  });

  const detalle = construirDetalle({
    fuenteOcupacion,
    reservasPorId,
    fecha,
    sedeId,
    cursoId: filtros.cursoId,
    instructores,
    motos
  });

  const detalleLocks = locksSede.map(lock => ({
    id: lock.id,
    lock: true,
    nombre: 'Retenido',
    horaId: lock.horaId || null,
    instructorId: lock.instructorId || null,
    motoId: motoIdValido(lock.motoAsignadaId) ? lock.motoAsignadaId : null,
    userId: lock.userId || null,
    origen: 'lock'
  }));

  const baseBloqueada = {
    estado: 'bloqueado',
    total: 0,
    disponibles: 0,
    motivo: null,
    sedeId,
    reservas: detalle,
    locks: detalleLocks,
    instructores: { total: 0, disponibles: 0 },
    motos: { requerida: false, total: 0, disponibles: 0 }
  };

  // 1. Bloqueo de admin (global o de esta sede).
  const hayBloqueoAdmin = (bloqueosAdmin || []).some(b =>
    afectaFechaAdmin(b, fecha, sedeId) && afectaHorarioAdmin(b, bloque.id)
  );
  if (hayBloqueoAdmin) {
    return { ...baseBloqueada, motivo: 'Admin' };
  }

  // 2. Tutores válidos para la sede (y para el curso si hay filtro).
  let permitidosCurso = null;
  if (filtros.cursoId) {
    // Fail-closed: un curso sin `instructoresPermitidos` no tiene tutores.
    const lista = Array.isArray(cursoObj?.instructoresPermitidos)
      ? cursoObj.instructoresPermitidos.map(String)
      : [];
    permitidosCurso = new Set(lista);
  }

  const estaBloqueado = (instructor) => (bloqueosInstructores || []).some(b =>
    afectaInstructor(b, instructor.id, fecha, bloque.id, sedeId)
  );

  // Si el admin filtra un tutor bloqueado, el bloque se reporta como bloqueado.
  if (filtros.instructorId) {
    const filtrado = (instructores || []).find(i => idIgual(i.id, filtros.instructorId));
    if (filtrado && estaBloqueado(filtrado)) {
      return { ...baseBloqueada, total: 1, motivo: 'Instructor' };
    }
  }

  const instructoresValidos = (instructores || []).filter(i => {
    if (!i?.activo) return false;
    if (!perteneceASede(i, sedeId)) return false;
    if (filtros.instructorId && !idIgual(i.id, filtros.instructorId)) return false;
    if (permitidosCurso && !permitidosCurso.has(String(i.id))) return false;
    if (estaBloqueado(i)) return false;
    return true;
  });

  // 3. Inventario de motos: condicionado al curso/alumno.
  const requiereMoto = cursoObj
    ? calcularNecesitaMoto(cursoObj, undefined).necesitaMoto
    : true;

  const motosValidasBase = (motos || []).filter(m => {
    if (!m?.activo) return false;
    if (!perteneceASede(m, sedeId)) return false;
    if (filtros.motoId && !idIgual(m.id, filtros.motoId)) return false;
    return true;
  });

  const tiposCurso = Array.isArray(cursoObj?.tiposMotoEscuela)
    ? cursoObj.tiposMotoEscuela.map(String).filter(Boolean)
    : [];

  const motosValidas = requiereMoto
    ? motosValidasBase.filter(m => tiposCurso.length === 0 || tiposCurso.includes(String(m.tipo)))
    : [];

  const motosBloqueadasProveedor = requiereMoto
    ? motosValidas.filter(m => (bloqueosProveedor || []).some(b =>
        afectaProveedor(b, m.id, fecha, bloque.label, m.proveedorId)
      ))
    : [];

  const motosInventario = motosValidas.filter(m =>
    !motosBloqueadasProveedor.some(b => idIgual(b.id, m.id))
  );

  if (requiereMoto && motosValidas.length > 0 && motosInventario.length === 0) {
    return { ...baseBloqueada, motivo: 'Proveedor' };
  }

  // 4. Recursos ocupados: espejo (todos los cursos) + locks.
  const ocupadosInstructores = new Set();
  const ocupadasMotos = new Set();

  const docsBloque = fuenteOcupacion.filter(doc =>
    ESTADOS_OCUPAN.includes(doc?.estadoPago)
    && doc?.estadoCurso !== 'Cancelado'
    && idIgual(sedeDeOcupacion(doc, instructores, motos), sedeId)
    && idIgual(getHoraIdOcupacion(doc, fecha), bloque.id)
  );

  for (const doc of docsBloque) {
    if (doc.instructorId !== null && doc.instructorId !== undefined && String(doc.instructorId).trim() !== '') {
      ocupadosInstructores.add(String(doc.instructorId));
    }
    // Moto propia o curso sin moto: no consume inventario de motos.
    if (esMotoPropia(doc.traeMoto)) continue;
    const motoId = getMotoIdOcupacion(doc, fecha);
    if (motoIdValido(motoId)) ocupadasMotos.add(String(motoId));
  }

  for (const lock of locksSede) {
    if (lock.instructorId !== null && lock.instructorId !== undefined && String(lock.instructorId).trim() !== '') {
      ocupadosInstructores.add(String(lock.instructorId));
    }
    if (motoIdValido(lock.motoAsignadaId)) ocupadasMotos.add(String(lock.motoAsignadaId));
  }

  const totalInstructores = instructoresValidos.length;
  const instructoresOcupados = instructoresValidos.filter(i =>
    ocupadosInstructores.has(String(i.id))
  ).length;
  const instructoresLibres = Math.max(0, totalInstructores - instructoresOcupados);

  // 5. Capacidad: tutor primero; motos solo si el curso las requiere.
  let totalMotos = 0;
  let motosLibres = 0;
  let usaMotos = false;
  let total;
  let disponibles;
  let motivo = null;

  if (requiereMoto && motosValidasBase.length > 0 && motosValidas.length === 0) {
    // Hay motos en la sede, pero ninguna del tipo que ofrece el curso.
    total = 0;
    disponibles = 0;
    motivo = 'Sin motos del tipo';
  } else if (requiereMoto && motosValidas.length > 0) {
    usaMotos = true;
    totalMotos = motosInventario.length;
    const motosOcupadas = motosInventario.filter(m => ocupadasMotos.has(String(m.id))).length;
    motosLibres = Math.max(0, totalMotos - motosOcupadas);
    total = Math.min(totalInstructores, totalMotos);
    disponibles = Math.max(0, Math.min(instructoresLibres, motosLibres));
  } else if (requiereMoto && (cursoObj || filtros.motoId)) {
    // El curso (o el filtro de moto) requiere una moto y la sede no tiene ninguna.
    total = 0;
    disponibles = 0;
    motivo = 'Sin motos en la sede';
  } else {
    // Curso sin moto, o vista sin curso y sin inventario de motos (legacy):
    // el tutor sigue siendo el límite principal.
    total = totalInstructores;
    disponibles = instructoresLibres;
  }

  // Estado visible: solo los locks que retienen recursos de este contexto
  // (tutor válido o moto del inventario requerido) marcan "Retenido".
  const idsInstructoresValidos = new Set(instructoresValidos.map(i => String(i.id)));
  const idsMotosInventario = new Set(motosInventario.map(m => String(m.id)));
  const locksRelevantes = locksSede.filter(lock =>
    idsInstructoresValidos.has(String(lock.instructorId))
    || (requiereMoto && motoIdValido(lock.motoAsignadaId)
      && idsMotosInventario.has(String(lock.motoAsignadaId)))
  );

  let estado;
  if (disponibles <= 0) estado = 'lleno';
  else if (disponibles < total) estado = 'parcial';
  else estado = 'libre';

  if (motosBloqueadasProveedor.length > 0 && total > 0) estado = 'parcial_bloqueado';
  // Un lock activo manda sobre "parcial/lleno": es una retención viva.
  // Salvo que el bloque esté cerrado por falta de recurso (motivo), donde "lleno" es la causa real.
  if (locksRelevantes.length > 0 && !motivo) estado = 'retenido';

  return {
    estado,
    total,
    disponibles,
    motivo,
    sedeId,
    reservas: detalle,
    locks: detalleLocks,
    instructores: { total: totalInstructores, disponibles: instructoresLibres },
    motos: { requerida: requiereMoto, total: usaMotos ? totalMotos : 0, disponibles: usaMotos ? motosLibres : 0 }
  };
}

const resultadoVacio = (extra = {}) => ({
  estado: 'lleno',
  total: 0,
  disponibles: 0,
  motivo: null,
  reservas: [],
  locks: [],
  instructores: { total: 0, disponibles: 0 },
  motos: { requerida: false, total: 0, disponibles: 0 },
  porSede: [],
  ...extra
});

// ─── API principal ───────────────────────────────────────────────

export function calcularEstadoBloque({
  fecha,
  bloque,
  instructores = [],
  motos = [],
  cursos = [],
  reservas = [],
  ocupacion, // opcional: espejo ocupacionConfirmada. Si falta, `reservas` es la fuente legacy.
  locks = [],
  bloqueosAdmin = [],
  bloqueosInstructores = [],
  bloqueosProveedor = [],
  filtros = {}, // { sedeId, cursoId, instructorId, motoId }
  ahora = Date.now()
}) {
  if (!fecha || !bloque?.id) {
    return resultadoVacio({ motivo: 'Sin fecha o bloque' });
  }

  const sedeFiltro = filtros.sedeId || null;
  const cursoObj = filtros.cursoId
    ? (cursos || []).find(c => idIgual(c.id, filtros.cursoId))
    : null;

  if (filtros.cursoId && !cursoObj) {
    return resultadoVacio({ motivo: 'Curso no encontrado', sedeId: sedeFiltro });
  }

  const usarEspejo = ocupacion !== undefined;
  const fuenteOcupacion = usarEspejo ? (ocupacion || []) : (reservas || []);
  const reservasPorId = new Map(
    (reservas || []).map(r => [String(r.id), r])
  );

  const locksBloque = (locks || []).filter(lock =>
    lockVigente(lock, ahora)
    && idIgual(lock.fecha, fecha)
    && idIgual(lock.horaId, bloque.id)
  );

  let sedesObjetivo;
  if (sedeFiltro) {
    sedesObjetivo = [String(sedeFiltro)];
  } else {
    const sedes = new Set();
    (instructores || []).forEach(i => {
      if (!i?.activo) return;
      (i.sedes || []).forEach(s => sedes.add(String(s)));
    });
    (motos || []).forEach(m => {
      if (!m?.activo) return;
      (m.sedes || []).forEach(s => sedes.add(String(s)));
    });
    sedesObjetivo = Array.from(sedes);
  }

  if (sedesObjetivo.length === 0) {
    const bloqueoGlobal = (bloqueosAdmin || []).some(b =>
      (!b.sedeId || b.sedeId === null)
      && afectaFechaAdmin(b, fecha, null)
      && afectaHorarioAdmin(b, bloque.id)
    );
    if (bloqueoGlobal) return resultadoVacio({ estado: 'bloqueado', motivo: 'Admin' });
    return resultadoVacio({ motivo: 'Sin recursos' });
  }

  const porSede = sedesObjetivo.map(sedeId => calcularParaSede({
    sedeId,
    fecha,
    bloque,
    instructores,
    motos,
    cursoObj,
    fuenteOcupacion,
    reservasPorId,
    locksBloque,
    bloqueosAdmin,
    bloqueosInstructores,
    bloqueosProveedor,
    filtros,
    ahora
  }));

  if (porSede.length === 1) {
    return { ...porSede[0], porSede };
  }

  // Vista "Todas": no se suman recursos de sedes distintas. Se reporta la
  // mejor sede (mayor cupo) y el desglose por sede; el agregado nunca suma.
  const ordenadas = [...porSede].sort((a, b) =>
    (b.disponibles - a.disponibles) || (b.total - a.total)
  );
  const mejor = ordenadas[0];

  const todosCerrados = porSede.every(r => r.estado === 'cerrado');
  const todosBloqueados = porSede.every(r => r.estado === 'bloqueado');
  const algunBloqueado = porSede.some(r => r.estado === 'bloqueado');
  const todosSinCupo = porSede.every(r => r.estado === 'lleno' || r.estado === 'bloqueado');

  let estado = mejor.estado;
  if (todosCerrados) estado = 'cerrado';
  else if (todosBloqueados) estado = 'bloqueado';
  else if (algunBloqueado) estado = mejor.disponibles > 0 ? 'parcial_bloqueado' : 'lleno';
  else if (todosSinCupo) estado = 'lleno';

  return {
    estado,
    total: mejor.total,
    disponibles: mejor.disponibles,
    motivo: mejor.motivo,
    sedeId: null,
    reservas: porSede.flatMap(r => r.reservas),
    locks: porSede.flatMap(r => r.locks),
    instructores: mejor.instructores,
    motos: mejor.motos,
    porSede
  };
}
