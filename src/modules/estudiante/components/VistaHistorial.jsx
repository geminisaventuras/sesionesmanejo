// @build: 2026-10-10 | id: VISTA-HISTORIAL | desc: Historial unificado de servicios (completados/cancelados/rechazados)
import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { Clock, BookOpen, GraduationCap, Package } from 'lucide-react';

const APP_ID = 'motoescuela-pro-v1';

const ESTADO_LABEL = {
  completados: { label: 'Completado', color: 'text-green-700 bg-green-100' },
  cancelados:  { label: 'Cancelado',  color: 'text-gray-700 bg-gray-100' },
  rechazados:  { label: 'Rechazado',  color: 'text-red-700 bg-red-100' },
  vencidos:    { label: 'Vencido',    color: 'text-orange-700 bg-orange-100' }
};

export function VistaHistorial() {
  const ctx = useContext(AppContext);
  const { fbUser, cursos, cursosTeoricos } = ctx;
  const uid = fbUser?.uid;

  const [reservas, setReservas] = useState([]);
  const [accesos, setAccesos] = useState([]);
  const [packs, setPacks] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!uid) { setCargando(false); return; }
    setCargando(true);
    try {
      const base = ['artifacts', APP_ID, 'public', 'data'];
      const [rSnap, aSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, ...base, 'reservas'),        where('userId', '==', uid))),
        getDocs(query(collection(db, ...base, 'accesosTeoricos'), where('userId', '==', uid))),
        getDocs(query(collection(db, ...base, 'reservasPack'),    where('userId', '==', uid)))
      ]);
      setReservas(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAccesos(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPacks(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('[VistaHistorial] Error:', err);
    } finally {
      setCargando(false);
    }
  }, [uid]);

  useEffect(() => { cargar(); }, [cargar]);

  const items = useMemo(() => {
    const timeline = [];

    reservas.forEach(r => {
      const curso = (cursos || []).find(c => String(c.id) === String(r.cursoId));
      let estado = null;
      if (r.estadoPago === 'Cancelado') estado = 'cancelados';
      else if (r.estadoPago === 'Rechazado') estado = 'rechazados';
      else if (r.estadoCurso === 'Aprobado' || r.estadoCurso === 'Completado') estado = 'completados';
      if (estado) timeline.push({
        tipo: r.tipoReserva === 'pack_sub' ? 'pack' : 'sesion',
        id: r.id,
        titulo: r.tipoReserva === 'pack_sub'
          ? `${curso?.nombre || 'Sesión'} (Pack)`
          : (curso?.nombre || 'Sesión de práctica'),
        estado,
        fecha: r.createdAt?.toDate?.() || new Date()
      });
    });

    accesos.forEach(a => {
      const curso = (cursosTeoricos || []).find(c => String(c.id) === String(a.cursoTeoricoId));
      let estado = null;
      if (a.estadoPago === 'Cancelado') estado = 'cancelados';
      else if (a.estadoPago === 'Rechazado') estado = 'rechazados';
      if (estado) timeline.push({
        tipo: 'teorico',
        id: a.id,
        titulo: curso?.nombre || 'Módulo formativo',
        estado,
        fecha: a.fechaCompra?.toDate?.() || new Date()
      });
    });

    packs.forEach(p => {
      let estado = null;
      if (p.estadoPago === 'Cancelado' || p.estado === 'cancelado') estado = 'cancelados';
      else if (p.estado === 'completado') estado = 'completados';
      if (estado) timeline.push({
        tipo: 'pack',
        id: p.id,
        titulo: p.packNombre || 'Pack',
        estado,
        fecha: p.fechaCompra?.toDate?.() || new Date()
      });
    });

    return timeline.sort((a, b) => b.fecha - a.fecha);
  }, [reservas, accesos, packs, cursos, cursosTeoricos]);

  if (cargando) return <div className="p-4 text-center text-gray-500 text-sm">Cargando historial...</div>;

  if (items.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
        <Clock size={48} className="text-gray-300 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900 mb-1">Sin historial todavía</h3>
        <p className="text-xs text-gray-500">Aquí verás tus servicios completados y cancelados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider px-1">Historial ({items.length})</h2>
      {items.map(item => {
        const cfg = ESTADO_LABEL[item.estado];
        const Icono = item.tipo === 'sesion' ? BookOpen : item.tipo === 'teorico' ? GraduationCap : Package;
        return (
          <div key={item.tipo + item.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Icono size={18} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 truncate">{item.titulo}</p>
              <p className="text-[10px] text-gray-500">
                {item.fecha.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default VistaHistorial;
