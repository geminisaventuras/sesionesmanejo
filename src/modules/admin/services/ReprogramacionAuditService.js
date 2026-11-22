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

// Función pura: no escribe, no lee reloj ni Firestore. `createdAt` se añade
// en registrarEvento al momento de persistir.
export const construirEventoReprogramacion = ({
  reservaId,
  tipo,
  origen,
  motivo,
  antes,
  despues,
  autorId,
  autorRol
}) => ({
  reservaId: textoRequerido(reservaId, 'reservaId'),
  tipo: textoRequerido(tipo, 'tipo'),
  origen: textoRequerido(origen, 'origen'),
  motivo: textoAcotado(motivo),
  antes: acotarSnapshot(antes, 'antes'),
  despues: acotarSnapshot(despues, 'despues'),
  autorId: textoRequerido(autorId, 'autorId'),
  autorRol: textoRequerido(autorRol, 'autorRol'),
  inmutable: true
});

// Única operación permitida: append (create). No existe API de update/delete.
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
    return {
      success: false,
      error: { code: error.code || 'audit-write-failed', message: error.message }
    };
  }
};

export const ReprogramacionAuditService = {
  construirEventoReprogramacion,
  registrarEvento
};
