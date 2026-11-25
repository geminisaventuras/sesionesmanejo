// Núcleo puro del sistema de alertas y notificaciones.
// Sin Firebase, sin PII y sin efectos: se usa en la app y en el dispatcher.
//
// Reglas de oro:
// - Los textos NUNCA incluyen nombre, cédula, teléfono ni dirección.
// - La ruta es interna y se valida contra una allowlist por rol.
// - Un evento se deduplica por tipo + entidad + token de estado.

export const ROLES_NOTIFICACION = ['admin', 'instructor', 'proveedor', 'estudiante', 'movilidad'];

export const CATEGORIAS = {
  reservas: 'Reservas',
  pagos: 'Pagos',
  aula: 'Aula',
  finanzas: 'Finanzas',
  movilidad: 'Movilidad',
  sistema: 'Sistema',
};

export const PRIORIDADES = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
};

export const TIPOS_EVENTO = [
  'reserva_creada',
  'pago_aprobado',
  'pago_rechazado',
  'sesion_iniciada',
  'sesion_pausada',
  'sesion_finalizada',
  'reserva_reprogramada',
  'reserva_cancelada',
  'instructor_asignado',
  'emergencia_aula',
  'pago_staff',
  'deuda_proveedor',
  'movilidad_solicitud',
  'movilidad_asignada',
  'sistema_prueba',
];

export const PREFERENCIAS_DEFAULT = {
  push: true,
  sonido: true,
  vibracion: true,
  categorias: {
    reservas: true,
    pagos: true,
    aula: true,
    finanzas: true,
    movilidad: true,
    sistema: true,
  },
  silencio: {
    activo: true,
    inicio: '22:00',
    fin: '07:00',
  },
  zonaHoraria: 'America/Caracas',
};

const PREFIJOS_RUTA = [
  '/dashboard',
  '/admin/',
  '/instructor',
  '/portal-reservas',
  '/proveedor',
  '/movilidad',
  '/notificaciones',
  '/reservas/',
  '/mi-pack/',
  '/aula/',
  '/corregir-pago/',
];

export function hashClave(texto = '') {
  // FNV-1a 32 bits: estable, corto y suficiente para ids de deduplicación.
  let hash = 0x811c9dc5;
  const str = String(texto);
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function construirClaveEvento(tipo, entidadId, token = '') {
  const entidad = String(entidadId || 'sin-entidad').trim();
  const estado = hashClave(token || 'base');
  return `${tipo}__${entidad}__${estado}`;
}

export function construirClaveNotificacion(claveEvento, uid) {
  return `${claveEvento}__${String(uid || 'sin-uid')}`;
}

export function rutaPermitida(ruta) {
  if (typeof ruta !== 'string' || !ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('..')) {
    return false;
  }
  return PREFIJOS_RUTA.some((prefijo) => ruta === prefijo || ruta.startsWith(prefijo));
}

export function msDeFecha(valor) {
  if (!valor) return 0;
  if (typeof valor.toMillis === 'function') return valor.toMillis();
  if (typeof valor.toDate === 'function') return valor.toDate().getTime();
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor.seconds === 'number') return valor.seconds * 1000;
  const ms = Date.parse(valor);
  return Number.isFinite(ms) ? ms : 0;
}

export function normalizarPreferencias(prefs = {}) {
  const base = PREFERENCIAS_DEFAULT;
  const categorias = { ...base.categorias };
  for (const clave of Object.keys(categorias)) {
    if (prefs?.categorias && typeof prefs.categorias[clave] === 'boolean') {
      categorias[clave] = prefs.categorias[clave];
    }
  }
  return {
    ...base,
    ...prefs,
    push: prefs?.push !== false,
    sonido: prefs?.sonido !== false,
    vibracion: prefs?.vibracion !== false,
    categorias,
    silencio: { ...base.silencio, ...(prefs?.silencio || {}) },
    zonaHoraria: prefs?.zonaHoraria || base.zonaHoraria,
  };
}

function minutosDeHora(texto) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(texto || ''));
  if (!match) return null;
  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null;
  return hora * 60 + minuto;
}

export function minutosEnZona(fecha, zonaHoraria = 'America/Caracas') {
  try {
    const partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: zonaHoraria,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(fecha);
    const hora = Number(partes.find((p) => p.type === 'hour')?.value || 0);
    const minuto = Number(partes.find((p) => p.type === 'minute')?.value || 0);
    return hora * 60 + minuto;
  } catch {
    return fecha.getHours() * 60 + fecha.getMinutes();
  }
}

export function dentroDeSilencio(prefs = {}, fecha = new Date()) {
  const p = normalizarPreferencias(prefs);
  if (!p.silencio?.activo) return false;
  const inicio = minutosDeHora(p.silencio.inicio);
  const fin = minutosDeHora(p.silencio.fin);
  if (inicio === null || fin === null || inicio === fin) return false;
  const ahora = minutosEnZona(fecha, p.zonaHoraria);
  if (inicio < fin) return ahora >= inicio && ahora < fin;
  return ahora >= inicio || ahora < fin;
}

export function debeEnviarPush(prefs = {}, categoria, prioridad, fecha = new Date()) {
  const p = normalizarPreferencias(prefs);
  if (!p.push) return false;
  if (p.categorias?.[categoria] === false) return false;
  // Alta y crítica despiertan aunque sea horario silencioso; media y baja no.
  if (prioridad === 'critica' || prioridad === 'alta') return true;
  return !dentroDeSilencio(p, fecha);
}

export function debeSonar(prefs = {}, { categoria, prioridad, sonido = true } = {}, fecha = new Date()) {
  const p = normalizarPreferencias(prefs);
  if (!p.sonido || sonido === false) return false;
  if (categoria && p.categorias?.[categoria] === false) return false;
  if (prioridad === 'critica' || prioridad === 'alta') return true;
  return !dentroDeSilencio(p, fecha);
}

const CATEGORIA_POR_TIPO = {
  reserva_creada: 'reservas',
  nueva_reserva: 'reservas',
  pago_aprobado: 'pagos',
  pago_rechazado: 'pagos',
  sesion_iniciada: 'aula',
  sesion_pausada: 'aula',
  sesion_finalizada: 'aula',
  instructor_asignado: 'reservas',
  reserva_reprogramada: 'reservas',
  reserva_cancelada: 'reservas',
  pack_cancelado: 'reservas',
  emergencia_aula: 'aula',
  pago_staff: 'finanzas',
  deuda_proveedor: 'finanzas',
  movilidad_solicitud: 'movilidad',
  movilidad_asignada: 'movilidad',
  sistema_prueba: 'sistema',
};

const TITULO_POR_TIPO = {
  reserva_creada: 'Nueva reserva',
  nueva_reserva: 'Nueva reserva',
  pago_aprobado: 'Pago aprobado',
  pago_rechazado: 'Pago rechazado',
  sesion_iniciada: 'Sesión iniciada',
  sesion_pausada: 'Sesión pausada',
  sesion_finalizada: 'Sesión finalizada',
  instructor_asignado: 'Instructor asignado',
  reserva_reprogramada: 'Reserva reprogramada',
  reserva_cancelada: 'Reserva cancelada',
  pack_cancelado: 'Pack cancelado',
  pack_teoricos_desbloqueados: 'Módulos desbloqueados',
  emergencia_aula: 'Emergencia en Aula',
  pago_staff: 'Pago registrado',
  deuda_proveedor: 'Deuda actualizada',
  movilidad_solicitud: 'Solicitud de movilidad',
  movilidad_asignada: 'Movilidad asignada',
  sistema_prueba: 'Prueba de alertas',
};

export function categoriaDeTipo(tipo) {
  return CATEGORIA_POR_TIPO[tipo] || 'sistema';
}

export function tituloDeTipo(tipo) {
  return TITULO_POR_TIPO[tipo] || 'Novedad';
}

const PLANTILLAS = {
  reserva_creada: {
    admin: {
      categoria: 'reservas', prioridad: 'alta', titulo: 'Nueva reserva',
      cuerpo: 'Hay una reserva nueva pendiente de revisión.', ruta: '/admin/reservas', sonido: true,
    },
    estudiante: {
      categoria: 'reservas', prioridad: 'media', titulo: 'Reserva registrada',
      cuerpo: 'Tu reserva quedó registrada. El pago está en revisión.', ruta: '/portal-reservas', sonido: false,
    },
    instructor: {
      categoria: 'reservas', prioridad: 'alta', titulo: 'Nueva sesión asignada',
      cuerpo: 'Tienes una reserva nueva en tu agenda.', ruta: '/instructor', sonido: true,
    },
    proveedor: {
      categoria: 'reservas', prioridad: 'alta', titulo: 'Nueva reserva asignada',
      cuerpo: 'Tienes una reserva nueva en tu agenda.', ruta: '/proveedor', sonido: true,
    },
  },
  pago_aprobado: {
    estudiante: {
      categoria: 'pagos', prioridad: 'alta', titulo: 'Pago aprobado',
      cuerpo: 'Tu pago fue aprobado. Ya puedes entrar al Aula Virtual.', ruta: '/portal-reservas', sonido: true,
    },
    admin: {
      categoria: 'pagos', prioridad: 'media', titulo: 'Pago aprobado',
      cuerpo: 'Se aprobó un pago y la reserva quedó habilitada.', ruta: '/admin/reservas', sonido: false,
    },
  },
  pago_rechazado: {
    estudiante: {
      categoria: 'pagos', prioridad: 'alta', titulo: 'Pago rechazado',
      cuerpo: 'Revisa la referencia y corrige tu pago para continuar.', ruta: '/portal-reservas', sonido: true,
    },
    admin: {
      categoria: 'pagos', prioridad: 'media', titulo: 'Pago rechazado',
      cuerpo: 'Se rechazó un pago y se habilitó la corrección.', ruta: '/admin/reservas', sonido: false,
    },
  },
  sesion_iniciada: {
    instructor: {
      categoria: 'aula', prioridad: 'media', titulo: 'Sesión iniciada',
      cuerpo: 'La sesión de Aula Virtual está en curso.', ruta: '/instructor', sonido: false,
    },
    estudiante: {
      categoria: 'aula', prioridad: 'media', titulo: 'Sesión iniciada',
      cuerpo: 'Tu instructor inició la sesión. Puedes entrar al Aula Virtual.', ruta: '/portal-reservas', sonido: true,
    },
    admin: {
      categoria: 'aula', prioridad: 'baja', titulo: 'Sesión iniciada',
      cuerpo: 'Un instructor inició una sesión de Aula Virtual.', ruta: '/admin/reservas', sonido: false,
    },
  },
  sesion_pausada: {
    instructor: {
      categoria: 'aula', prioridad: 'media', titulo: 'Sesión pausada',
      cuerpo: 'La sesión quedó pausada. Reanúdala cuando corresponda.', ruta: '/instructor', sonido: false,
    },
    estudiante: {
      categoria: 'aula', prioridad: 'alta', titulo: 'Sesión pausada',
      cuerpo: 'La sesión se pausó. Espera la reanudación del instructor.', ruta: '/portal-reservas', sonido: true,
    },
    admin: {
      categoria: 'aula', prioridad: 'media', titulo: 'Sesión pausada',
      cuerpo: 'Se pausó una sesión de Aula Virtual.', ruta: '/admin/alertas', sonido: false,
    },
  },
  sesion_finalizada: {
    instructor: {
      categoria: 'aula', prioridad: 'media', titulo: 'Sesión finalizada',
      cuerpo: 'La sesión quedó finalizada correctamente.', ruta: '/instructor', sonido: false,
    },
    estudiante: {
      categoria: 'aula', prioridad: 'alta', titulo: 'Sesión finalizada',
      cuerpo: 'Tu sesión terminó. Revisa tu progreso en el portal.', ruta: '/portal-reservas', sonido: true,
    },
    admin: {
      categoria: 'aula', prioridad: 'media', titulo: 'Sesión finalizada',
      cuerpo: 'Se finalizó una sesión de Aula Virtual.', ruta: '/admin/reservas', sonido: false,
    },
  },
  reserva_reprogramada: {
    estudiante: {
      categoria: 'reservas', prioridad: 'alta', titulo: 'Reserva reprogramada',
      cuerpo: 'Tu reserva cambió de fecha u horario. Revisa los detalles.', ruta: '/portal-reservas', sonido: true,
    },
    instructor: {
      categoria: 'reservas', prioridad: 'alta', titulo: 'Nueva programación',
      cuerpo: 'Se reprogramó una sesión en tu agenda.', ruta: '/instructor', sonido: true,
    },
    proveedor: {
      categoria: 'reservas', prioridad: 'media', titulo: 'Reserva reprogramada',
      cuerpo: 'Una reserva de tu moto cambió de fecha u horario.', ruta: '/proveedor', sonido: false,
    },
    admin: {
      categoria: 'reservas', prioridad: 'media', titulo: 'Reserva reprogramada',
      cuerpo: 'Se reprogramó una reserva.', ruta: '/admin/reservas', sonido: false,
    },
  },
  reserva_cancelada: {
    estudiante: {
      categoria: 'reservas', prioridad: 'alta', titulo: 'Reserva cancelada',
      cuerpo: 'Tu reserva fue cancelada. Revisa el detalle en el portal.', ruta: '/portal-reservas', sonido: true,
    },
    instructor: {
      categoria: 'reservas', prioridad: 'alta', titulo: 'Reserva cancelada',
      cuerpo: 'Se canceló una sesión de tu agenda.', ruta: '/instructor', sonido: true,
    },
    proveedor: {
      categoria: 'reservas', prioridad: 'media', titulo: 'Reserva cancelada',
      cuerpo: 'Se canceló una reserva de tu moto.', ruta: '/proveedor', sonido: false,
    },
    admin: {
      categoria: 'reservas', prioridad: 'media', titulo: 'Reserva cancelada',
      cuerpo: 'Se canceló una reserva.', ruta: '/admin/reservas', sonido: false,
    },
  },
  instructor_asignado: {
    instructor: {
      categoria: 'reservas', prioridad: 'alta', titulo: 'Sesión asignada',
      cuerpo: 'Tienes una nueva sesión en tu agenda.', ruta: '/instructor', sonido: true,
    },
    estudiante: {
      categoria: 'reservas', prioridad: 'media', titulo: 'Instructor asignado',
      cuerpo: 'Tu reserva ya tiene instructor asignado.', ruta: '/portal-reservas', sonido: false,
    },
    admin: {
      categoria: 'reservas', prioridad: 'baja', titulo: 'Instructor asignado',
      cuerpo: 'Se asignó un instructor a una reserva.', ruta: '/admin/reservas', sonido: false,
    },
  },
  emergencia_aula: {
    admin: {
      categoria: 'aula', prioridad: 'critica', titulo: 'Emergencia en Aula',
      cuerpo: 'Se reportó una emergencia durante una sesión. Atiéndela ahora.', ruta: '/admin/alertas', sonido: true,
    },
    estudiante: {
      categoria: 'aula', prioridad: 'critica', titulo: 'Emergencia reportada',
      cuerpo: 'La emergencia de la sesión fue registrada. El equipo dará seguimiento.', ruta: '/portal-reservas', sonido: true,
    },
  },
  pago_staff: {
    instructor: {
      categoria: 'finanzas', prioridad: 'alta', titulo: 'Pago registrado',
      cuerpo: 'Se registró un pago a tu favor. Revisa tus finanzas.', ruta: '/instructor', sonido: true,
    },
    proveedor: {
      categoria: 'finanzas', prioridad: 'alta', titulo: 'Pago registrado',
      cuerpo: 'Se registró un pago a tu favor. Revisa tus finanzas.', ruta: '/proveedor', sonido: true,
    },
    admin: {
      categoria: 'finanzas', prioridad: 'media', titulo: 'Pago de staff',
      cuerpo: 'Se registró un pago de staff.', ruta: '/admin/finanzas', sonido: false,
    },
  },
  deuda_proveedor: {
    proveedor: {
      categoria: 'finanzas', prioridad: 'alta', titulo: 'Deuda actualizada',
      cuerpo: 'Tu cuenta de proveedor tiene una deuda o abono nuevo.', ruta: '/proveedor', sonido: true,
    },
    admin: {
      categoria: 'finanzas', prioridad: 'media', titulo: 'Deuda de proveedor',
      cuerpo: 'Se actualizó una deuda de proveedor.', ruta: '/admin/finanzas', sonido: false,
    },
  },
  movilidad_solicitud: {
    admin: {
      categoria: 'movilidad', prioridad: 'alta', titulo: 'Solicitud de movilidad',
      cuerpo: 'Hay una solicitud nueva de movilidad por revisar.', ruta: '/admin/config/movilidad', sonido: true,
    },
    movilidad: {
      categoria: 'movilidad', prioridad: 'alta', titulo: 'Solicitud de movilidad',
      cuerpo: 'Tienes una solicitud nueva de movilidad.', ruta: '/movilidad', sonido: true,
    },
  },
  movilidad_asignada: {
    movilidad: {
      categoria: 'movilidad', prioridad: 'alta', titulo: 'Servicio asignado',
      cuerpo: 'Se te asignó un servicio de movilidad.', ruta: '/movilidad', sonido: true,
    },
    estudiante: {
      categoria: 'movilidad', prioridad: 'media', titulo: 'Movilidad confirmada',
      cuerpo: 'Tu solicitud de movilidad fue asignada.', ruta: '/portal-reservas', sonido: true,
    },
    admin: {
      categoria: 'movilidad', prioridad: 'media', titulo: 'Movilidad asignada',
      cuerpo: 'Se asignó una solicitud de movilidad.', ruta: '/admin/config/movilidad', sonido: false,
    },
  },
  sistema_prueba: {
    default: {
      categoria: 'sistema', prioridad: 'baja', titulo: 'Prueba de alertas',
      cuerpo: 'Si ves esta notificación, el canal está funcionando.', ruta: '/notificaciones/ajustes', sonido: true,
    },
  },
};

function rutaConEntidad(base, ctx = {}) {
  const id = ctx.entidadId || ctx.reservaId;
  if (!id) return base;
  if (base === '/admin/reservas') return `/admin/reserva/${id}`;
  if (base === '/aula/') return `/aula/${id}`;
  return base;
}

export function plantillaNotificacion(tipo, rol, ctx = {}) {
  const porRol = PLANTILLAS[tipo];
  if (!porRol) return null;
  const base = porRol[rol] || porRol.default || porRol.admin;
  if (!base) return null;
  const ruta = ctx.ruta && rutaPermitida(ctx.ruta) ? ctx.ruta : rutaConEntidad(base.ruta, ctx);
  return {
    ...base,
    ruta: rutaPermitida(ruta) ? ruta : '/notificaciones',
    categoria: base.categoria,
    prioridad: base.prioridad,
    sonido: base.sonido !== false,
  };
}

export function detectarEventosReserva(anterior, actual) {
  if (!actual || !actual.id) return [];
  if (!anterior) {
    return [{ tipo: 'reserva_creada', token: 'nueva', entidadId: actual.id }];
  }

  const eventos = [];
  const push = (tipo, token) => eventos.push({ tipo, token: String(token ?? 'estado'), entidadId: actual.id });

  if (anterior.estadoPago !== 'Aprobado' && actual.estadoPago === 'Aprobado') {
    push('pago_aprobado', actual.aprobadoEn || actual.updatedAt || 'aprobado');
  }
  if (anterior.estadoPago !== 'Rechazado' && actual.estadoPago === 'Rechazado') {
    push('pago_rechazado', actual.rechazadoEn || 'rechazado');
  }
  if (anterior.estadoPago !== 'Cancelado' && actual.estadoPago === 'Cancelado') {
    push('reserva_cancelada', actual.canceladoEn || 'cancelado');
  }
  if (!anterior.moduloEnProgreso && actual.moduloEnProgreso) {
    push('sesion_iniciada', actual.moduloEnProgreso?.nombre || actual.moduloEnProgreso);
  }
  if (!anterior.pausaActiva && actual.pausaActiva) {
    push('sesion_pausada', actual.pausaActiva?.inicio || actual.pausaActiva?.timestamp || 'pausa');
  }
  if (anterior.estadoCurso !== 'Aprobado' && actual.estadoCurso === 'Aprobado') {
    push('sesion_finalizada', actual.estadoCurso);
  }
  if (String(anterior.instructorId || '') !== String(actual.instructorId || '') && actual.instructorId) {
    push('instructor_asignado', `${actual.instructorId}|${actual.fecha || ''}|${actual.horaId || ''}`);
  }
  const cambioHorario = anterior.fecha !== actual.fecha
    || anterior.fecha2 !== actual.fecha2
    || anterior.horaId !== actual.horaId
    || anterior.horaIdReposicion !== actual.horaIdReposicion;
  if (cambioHorario && actual.estadoPago !== 'Cancelado') {
    push('reserva_reprogramada', `${actual.fecha || ''}|${actual.fecha2 || ''}|${actual.horaId || ''}|${actual.horaIdReposicion || ''}`);
  }
  const emergenciaPrevia = anterior.emergencia?.timestamp || anterior.emergencia || null;
  const emergenciaActual = actual.emergencia?.timestamp || actual.emergencia || null;
  if (emergenciaActual && emergenciaPrevia !== emergenciaActual) {
    push('emergencia_aula', emergenciaActual);
  }
  return eventos;
}

export const PLANTILLAS_NOTIFICACION = PLANTILLAS;
