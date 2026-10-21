// @build: 2026-10-20 | id: FEATURE-BLOQUEOS-INSTRUCTORES-TAB | desc: Tab de disponibilidad del instructor con lista + modal de bloqueo.
import { useState, useEffect, useContext } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Calendar, Plus, X, Clock, MapPin, AlertCircle } from 'lucide-react';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import ModalBloqueoInstructor from './ModalBloqueoInstructor';
import { Button } from '../../../components/UI';

const APP_ID = 'motoescuela-pro-v1';
const COLL = 'bloqueosInstructores';

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
};

export default function DisponibilidadTab({ user }) {
  const ctx = useContext(AppContext);
  const { showToast } = useToast();
  const [bloqueos, setBloqueos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cancelandoId, setCancelandoId] = useState(null);

  const instructorId = user?.uid;

  // Cargar bloqueos activos del instructor.
  useEffect(() => {
    if (!instructorId) { setBloqueos([]); setCargando(false); return; }

    const q = query(
      collection(db, COLL),
      where('instructorId', '==', instructorId),
      where('estado', '==', 'activo')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar por fechaInicio ascendente.
      docs.sort((a, b) => (a.fechaInicio || '').localeCompare(b.fechaInicio || ''));
      setBloqueos(docs);
      setCargando(false);
    }, (err) => {
      console.warn('[DisponibilidadTab] Error onSnapshot:', err);
      setCargando(false);
    });

    return () => unsub();
  }, [instructorId]);

  // Soft-delete: cambiar estado a 'cancelado'.
  const handleCancelar = async (bloqueoId) => {
    if (!confirm('¿Cancelar este bloqueo? La disponibilidad se restaura automáticamente.')) return;
    setCancelandoId(bloqueoId);
    try {
      await updateDoc(
        doc(db, COLL, bloqueoId),
        { estado: 'cancelado', updatedAt: Timestamp.now() }
      );
      showToast('Bloqueo cancelado. Disponibilidad restaurada.', 'success');
    } catch (err) {
      console.error('[DisponibilidadTab] Error cancelando:', err);
      showToast('Error al cancelar bloqueo', 'error');
    } finally {
      setCancelandoId(null);
    }
  };

  // Filtrar bloqueos futuros (fechaFin >= hoy).
  const hoy = new Date().toISOString().split('T')[0];
  const bloqueosFuturos = bloqueos.filter(b => (b.fechaFin || b.fechaInicio) >= hoy);

  return (
    <div className="space-y-4">
      {/* Header + botón agregar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-gray-900">Mi disponibilidad</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Bloquea fechas específicas para que no te asignen reservas.
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Plus size={14} /> Bloquear
        </button>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500">Cargando bloqueos...</p>
        </div>
      ) : bloqueosFuturos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600 mb-1">Sin bloqueos activos</p>
          <p className="text-xs text-gray-500">
            Cuando bloquees una fecha, no se te asignarán reservas esos días.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bloqueosFuturos.map(b => {
            const esRango = b.fechaInicio !== b.fechaFin && b.fechaFin;
            const etiqueta = esRango
              ? `${formatearFecha(b.fechaInicio)} → ${formatearFecha(b.fechaFin)}`
              : formatearFecha(b.fechaInicio);
            const sedeNombre = b.sedeId
              ? (ctx.sedes || []).find(s => String(s.id) === String(b.sedeId))?.nombre || b.sedeId
              : 'Todas las sedes';
            const horariosTexto = b.todoElDia
              ? 'Todo el día'
              : (b.horarios || []).map(hId => {
                  const h = (ctx.horarios || []).find(x => String(x.id) === String(hId));
                  return h?.label || hId;
                }).join(', ');

            return (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar size={12} className="text-indigo-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-gray-900 truncate">{etiqueta}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Clock size={11} className="flex-shrink-0" />
                      <span>{horariosTexto}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                      <MapPin size={11} className="flex-shrink-0" />
                      <span>{sedeNombre}</span>
                    </div>
                    {b.motivo && (
                      <p className="text-[10px] text-gray-400 mt-1 italic truncate">
                        {b.motivo}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCancelar(b.id)}
                    disabled={cancelandoId === b.id}
                    className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 disabled:opacity-40 flex-shrink-0"
                    title="Cancelar bloqueo"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <AlertCircle size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-800">
          No puedes bloquear fechas donde ya tengas reservas activas.
          Si necesitas bloquear ese día, primero reprograma o cancela las reservas.
        </p>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <ModalBloqueoInstructor
          user={user}
          horarios={ctx.horarios}
          sedes={ctx.sedes}
          onConfirmar={(id) => {
            setModalAbierto(false);
            showToast('Bloqueo creado correctamente', 'success');
          }}
          onCancelar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}
