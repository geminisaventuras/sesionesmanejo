// @build: 2026-11-23 | id: T-066 | desc: Derivación pura de alertas admin compartida por Home y /admin/alertas.
//
// No escribe datos ni cambia reglas de negocio: solo agrupa el mismo estado que ya
// consume el Home (reservas, cursos sin instructor y motos inactivas) para que el
// conteo del acceso compacto y la pantalla de alertas coincidan.

export const UMBRAL_PENDIENTE_MS = 24 * 60 * 60 * 1000;

export const SEVERIDAD_ORDEN = { alta: 0, media: 1, baja: 2 };

const TEXTO_SIN_DATO = 'Sin dato';

/** Normaliza Timestamp de Firestore, Date, número o ISO a milisegundos. */
export const msDeFecha = (valor) => {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor.toMillis === 'function') {
    const ms = valor.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof valor.toDate === 'function') {
    const fecha = valor.toDate();
    return fecha instanceof Date && !Number.isNaN(fecha.getTime()) ? fecha.getTime() : null;
  }
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor.getTime();
  }
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.getTime();
};

const nombreDeReserva = (reserva) => {
  const nombre = `${reserva?.nombre || ''} ${reserva?.apellido || ''}`.trim();
  return nombre || `Reserva ${reserva?.id || TEXTO_SIN_DATO}`;
};

const contextoReserva = (reserva) => {
  const partes = [];
  if (reserva?.fecha) partes.push(`Fecha ${reserva.fecha}`);
  if (reserva?.horario) partes.push(String(reserva.horario));
  return partes.join(' · ') || 'Sin fecha registrada';
};

const descripcionMoto = (moto) => {
  const modelo = `${moto?.marca || ''} ${moto?.modelo || ''}`.trim();
  const placa = moto?.placa ? `Placa ${moto.placa}` : 'Sin placa';
  return [modelo, placa].filter(Boolean).join(' · ') || `Moto ${moto?.id || TEXTO_SIN_DATO}`;
};

/**
 * Rechazo legacy: el pago quedó en 'Pendiente' pero ya tiene motivo y fecha de
 * rechazo. Se exige que no haya intentos de corrección: al corregir una reserva
 * rechazada vuelve a 'Pendiente' conservando el motivo, y en ese caso sí debe
 * alertar (solo el flujo antiguo, previo a intentosCorreccion, queda excluido).
 */
export const esRechazoLegacy = (reserva) =>
  Boolean(reserva?.motivoRechazo)
  && Boolean(reserva?.rechazadoEn)
  && !(Number(reserva?.intentosCorreccion) > 0);

/** Cancelación operativa: el curso se anuló aunque el pago siga en un estado previo. */
export const esCancelada = (reserva) => reserva?.estadoCurso === 'Cancelado';

/** Reserva que todavía espera una decisión real del admin (ERR-058). */
export const esPendienteAccionable = (reserva) =>
  reserva?.estadoPago === 'Pendiente' && !esRechazoLegacy(reserva) && !esCancelada(reserva);

const estaActiva = (reserva) =>
  (reserva?.estadoPago === 'Aprobado' || reserva?.estadoPago === 'Pendiente')
  && !esRechazoLegacy(reserva)
  && !esCancelada(reserva);

/**
 * Construye la lista de alertas actuales del admin.
 * @param {{ reservas?: Array, motos?: Array, ahora?: number }} estado
 * @returns {Array<{id:string,tipo:string,severidad:string,titulo:string,mensaje:string,contexto:string,fechaMs:number|null,ruta:string}>}
 */
export function construirAlertas({ reservas = [], motos = [], ahora = Date.now() } = {}) {
  const lista = [];

  // Los listeners de reservas y de pendientes pueden traer el mismo documento.
  const vistas = new Set();
  const unicas = [];
  (reservas || []).forEach((reserva) => {
    if (!reserva?.id || vistas.has(reserva.id)) return;
    vistas.add(reserva.id);
    unicas.push(reserva);
  });

  unicas.forEach((reserva) => {
    if (!esPendienteAccionable(reserva)) return;
    const creadaMs = msDeFecha(reserva.createdAt);
    const pendienteVieja = creadaMs !== null && ahora - creadaMs > UMBRAL_PENDIENTE_MS;

    lista.push({
      id: `reserva-pendiente-${reserva.id}`,
      tipo: 'reserva',
      severidad: pendienteVieja ? 'alta' : 'media',
      titulo: 'Reserva pendiente de aprobación',
      mensaje: pendienteVieja
        ? `${nombreDeReserva(reserva)} espera aprobación hace más de 24 h.`
        : `${nombreDeReserva(reserva)} espera aprobación del pago.`,
      contexto: contextoReserva(reserva),
      fechaMs: creadaMs,
      ruta: `/admin/reserva/${reserva.id}`,
    });
  });

  unicas.forEach((reserva) => {
    if (!estaActiva(reserva) || reserva.instructorId) return;
    lista.push({
      id: `curso-sin-instructor-${reserva.id}`,
      tipo: 'curso',
      severidad: 'media',
      titulo: 'Curso sin instructor',
      mensaje: `${nombreDeReserva(reserva)} todavía no tiene instructor asignado.`,
      contexto: contextoReserva(reserva),
      fechaMs: msDeFecha(reserva.fecha) ?? msDeFecha(reserva.createdAt),
      ruta: `/admin/reserva/${reserva.id}`,
    });
  });

  (motos || []).forEach((moto) => {
    if (!moto?.id) return;
    if (!moto.activo) {
      lista.push({
        id: `moto-inactiva-${moto.id}`,
        tipo: 'moto',
        severidad: 'baja',
        titulo: 'Moto inactiva',
        mensaje: `${descripcionMoto(moto)} no está disponible para asignación.`,
        contexto: 'Configuración de motos',
        fechaMs: null,
        ruta: '/admin/config',
      });
    }
  });

  return lista.sort((a, b) => {
    const porSeveridad = (SEVERIDAD_ORDEN[a.severidad] ?? 9) - (SEVERIDAD_ORDEN[b.severidad] ?? 9);
    if (porSeveridad !== 0) return porSeveridad;
    return (a.fechaMs || 0) - (b.fechaMs || 0);
  });
}
