// Colección append-only: solo create. Nunca update/delete desde el cliente.
export const COLECCION_AUDITORIA_REPROGRAMACIONES = 'auditoriaReprogramaciones';

// Whitelist de campos de reprogramación. Deliberadamente NO se copian
// documentos completos de reserva/espejo: solo el delta relevante.
const CAMPOS_REPROGRAMACION = [
  'fecha',
  'fecha2',
  'horaId',
  'horaIdReposicion',
  'motoAsignadaId',
  'motoReposicionId',
  'proveedorId',
  'proveedorReposicionId',
  'instructorId',
  'sedeId'
];

const MAX_TEXTO = 500;
const MAX_VALOR_TEXTO = 200;
const MAX_CONFLICTOS = 20;
const MAX_MENSAJE_ERROR = 300;

// Solo recursos en conflicto (IDs internos). Nada de PII ni documentos completos.
const CAMPOS_CONFLICTO = ['tipo', 'reservaId', 'fecha', 'horaId', 'instructorId', 'motoId'];

const textoRequerido = (valor, campo) => {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new TypeError(`ReprogramacionAuditService: "${campo}" debe ser string no vacío`);
  }
  return valor.trim();
};

const textoAcotado = (valor) => {
  if (valor == null) return '';
  if (typeof valor !== 'string') {
    throw new TypeError('ReprogramacionAuditService: "motivo" debe ser string');
  }
  return valor.slice(0, MAX_TEXTO);
};

// Devuelve un mapa plano y acotado: solo claves permitidas y valores primitivos.
// Los objetos/arreglos anidados se omiten para no filtrar documentos completos.
const acotarSnapshot = (snapshot, campo) => {
  if (snapshot == null) return {};
  if (typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError(`ReprogramacionAuditService: "${campo}" debe ser un objeto`);
  }
  const acotado = {};
  for (const clave of CAMPOS_REPROGRAMACION) {
    if (!Object.prototype.hasOwnProperty.call(snapshot, clave)) continue;
    const valor = snapshot[clave];
    if (valor === null) {
      acotado[clave] = null;
    } else if (typeof valor === 'string') {
      acotado[clave] = valor.slice(0, MAX_VALOR_TEXTO);
    } else if (typeof valor === 'number' || typeof valor === 'boolean') {
      acotado[clave] = valor;
    }
    // Cualquier otro tipo (map/array/Timestamp) se descarta.
  }
  return acotado;
};

// Acota la lista de conflictos a primitivos conocidos. Un conflicto malformado
// no rompe la auditoría: se descarta.
const acotarConflictos = (conflictos) => {
  if (conflictos == null) return [];
  if (!Array.isArray(conflictos)) {
    throw new TypeError('ReprogramacionAuditService: "conflictos" debe ser un arreglo');
  }
  const acotados = [];
  for (const conflicto of conflictos.slice(0, MAX_CONFLICTOS)) {
    if (!conflicto || typeof conflicto !== 'object' || Array.isArray(conflicto)) continue;
    const acotado = {};
    for (const clave of CAMPOS_CONFLICTO) {
      if (!Object.prototype.hasOwnProperty.call(conflicto, clave)) continue;
      const valor = conflicto[clave];
      if (valor === null) {
        acotado[clave] = null;
      } else if (typeof valor === 'string') {
        acotado[clave] = valor.slice(0, MAX_VALOR_TEXTO);
      } else if (typeof valor === 'number' || typeof valor === 'boolean') {
        acotado[clave] = valor;
      }
    }
    if (Object.keys(acotado).length > 0) acotados.push(acotado);
  }
  return acotados;
};

// Función pura: no escribe, no lee reloj ni Firestore. `createdAt` se añade
// en registrarEvento al momento de persistir.
export const construirEventoReprogramacion = ({
  reservaId,
  tipo,
  origen,
  motivo,
  antes,
  despues,
  conflictos = [],
  autorId,
  autorRol
}) => ({
  reservaId: textoRequerido(reservaId, 'reservaId'),
  tipo: textoRequerido(tipo, 'tipo'),
  origen: textoRequerido(origen, 'origen'),
  motivo: textoAcotado(motivo),
  antes: acotarSnapshot(antes, 'antes'),
  despues: acotarSnapshot(despues, 'despues'),
  conflictos: acotarConflictos(conflictos),
  autorId: textoRequerido(autorId, 'autorId'),
  autorRol: textoRequerido(autorRol, 'autorRol'),
  inmutable: true
});

// Normaliza cualquier error (Firestore, red o validación) a un resultado
// serializable y acotado. Función pura: no lee reloj, red ni Firestore.
export const normalizarErrorAuditoria = (error) => {
  const codeBruto = typeof error?.code === 'string' ? error.code.trim() : '';
  const mensajeBruto = typeof error?.message === 'string' ? error.message.trim() : '';
  return {
    code: codeBruto ? codeBruto.slice(0, 100) : 'audit-write-failed',
    message: mensajeBruto
      ? mensajeBruto.slice(0, MAX_MENSAJE_ERROR)
      : 'Error desconocido al registrar la auditoría'
  };
};

// Contexto mínimo de log: IDs internos y tipo/origen. Sin snapshots ni PII.
const contextoLog = (datos) => ({
  reservaId: typeof datos?.reservaId === 'string' ? datos.reservaId : null,
  tipo: typeof datos?.tipo === 'string' ? datos.tipo : null,
  origen: typeof datos?.origen === 'string' ? datos.origen : null
});

// Única operación permitida: append (create). No existe API de update/delete.
// Nunca relanza: el bloqueo D9 debe mantenerse aunque falle la auditoría.
// El fallo es observable vía `success: false` + log seguro en consola.
export const registrarEvento = async (datos) => {
  try {
    const evento = construirEventoReprogramacion(datos || {});
    // Import dinámico: mantiene la función pura importable/testeable sin
    // inicializar Firebase hasta que realmente se persiste el evento.
    const [{ addDoc, collection, Timestamp }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('../../shared/firebase/firebase')
    ]);
    const ref = await addDoc(collection(db, COLECCION_AUDITORIA_REPROGRAMACIONES), {
      ...evento,
      createdAt: Timestamp.now()
    });
    return { success: true, data: { id: ref.id } };
  } catch (error) {
    const errorNormalizado = normalizarErrorAuditoria(error);
    // Log seguro (sin snapshots ni PII) para que el fallo no pase inadvertido.
    console.error('[ReprogramacionAuditService] Auditoría no persistida', {
      ...contextoLog(datos),
      error: errorNormalizado
    });
    return { success: false, error: errorNormalizado };
  }
};

export const ReprogramacionAuditService = {
  construirEventoReprogramacion,
  registrarEvento,
  normalizarErrorAuditoria
};
