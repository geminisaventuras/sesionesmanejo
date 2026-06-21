// @build: 2026-06-22 | id: LISTADO-RESERVAS | desc: Listado de reservas con búsqueda universal, filtro, orden y paginación, redirecciones corregidas
import { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { Button, Select } from '../components/UI';
import AppShell from '../modules/shared/components/AppShell';
import { ChevronLeft, Search, Calendar, Clock, ArrowLeft, ArrowRight } from 'lucide-react';

const AdminReservasList = () => {
  const { reservas, instructores } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filtroInicial = searchParams.get('filtro') || 'Todas';
  const [filtroEstado, setFiltroEstado] = useState(filtroInicial);
  const [orden, setOrden] = useState('recientes_desc');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 5;

  const res = reservas || [];

  const reservasFiltradas = useMemo(() => {
    let filtradas = res;
    if (filtroEstado !== 'Todas') {
      filtradas = filtradas.filter(r => r.estadoPago === filtroEstado);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      filtradas = filtradas.filter(r => {
        const instr = (instructores || []).find(i => String(i.id) === String(r.instructorId));
        const campos = [
          r.nombre, r.apellido, r.cedula, r.telefono, r.correo, r.contactoEmergencia,
          r.cursoId, r.sedeId, r.tipoMoto, r.pagoBanco, r.pagoRef, r.estado, r.zona,
          r.fecha, r.fecha2, r.horaId,
          instr?.nombre, instr?.apellido
        ].filter(Boolean).join(' ').toLowerCase();
        return campos.includes(q);
      });
    }
    switch (orden) {
      case 'recientes_desc':
        filtradas.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        break;
      case 'recientes_asc':
        filtradas.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        break;
      case 'curso_cercano':
        filtradas.sort((a, b) => new Date(a.fecha || a.fecha1) - new Date(b.fecha || b.fecha1));
        break;
      case 'curso_lejano':
        filtradas.sort((a, b) => new Date(b.fecha || b.fecha1) - new Date(a.fecha || a.fecha1));
        break;
      default:
        break;
    }
    return filtradas;
  }, [res, filtroEstado, busqueda, orden, instructores]);

  const totalPaginas = Math.max(1, Math.ceil(reservasFiltradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const fin = inicio + POR_PAGINA;
  const reservasPagina = reservasFiltradas.slice(inicio, fin);

  useEffect(() => { setPagina(1); }, [filtroEstado, busqueda, orden]);

  const estadoBadge = {
    Pendiente: 'bg-orange-100 text-orange-700',
    Aprobado: 'bg-green-100 text-green-700',
    Rechazado: 'bg-red-100 text-red-700',
    Cancelado: 'bg-gray-200 text-gray-700',
  };

  return (
    <AppShell bgColor="bg-gray-50">
      <div className="p-4 space-y-3">
        <div className="flex gap-2 items-center">
          <button type="button" onClick={() => navigate('/dashboard?tab=reservas')} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button>
          <h2 className="text-lg font-black text-gray-900 uppercase">Gestión Reservas</h2>
        </div>

        <div className="flex gap-2">
          <Select label="" options={['Todas', 'Pendiente', 'Aprobado', 'Rechazado', 'Cancelado']} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="!mb-0 flex-1" />
          <Select label="" options={[
            { id: 'recientes_desc', nombre: 'Más recientes' },
            { id: 'recientes_asc', nombre: 'Más antiguos' },
            { id: 'curso_cercano', nombre: 'Curso + cercano' },
            { id: 'curso_lejano', nombre: 'Curso + lejano' }
          ]} value={orden} onChange={e => setOrden(e.target.value)} className="!mb-0 flex-1" />
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" placeholder="Buscar: nombre, CI, tel, sede, instructor, fecha..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>Página {paginaActual} de {totalPaginas} ({reservasFiltradas.length} resultados)</span>
        </div>

        {reservasPagina.length === 0 && <p className="text-center text-gray-500 py-6 text-xs">No hay reservas</p>}
        <div className="space-y-2">
          {reservasPagina.map(r => {
            const instr = (instructores || []).find(i => String(i.id) === String(r.instructorId));
            return (
              <button key={r.id} onClick={() => navigate(`/admin/reserva/${r.id}`)} className="w-full bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-left hover:border-blue-300 transition-colors active:scale-[0.99]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${estadoBadge[r.estadoPago] || 'bg-gray-100'}`}>{r.estadoPago === 'Cancelado' ? 'CANCELADO' : r.estadoPago}</span>
                    <span className="font-bold text-sm text-gray-900">{r.nombre} {r.apellido}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">CI: {r.cedula}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><Calendar size={11} />{r.fecha || r.fecha1} – {r.fecha2}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{r.horaId}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                  <span>👤 {instr ? `${instr.nombre} ${instr.apellido || ''}` : 'Sin instructor'}</span>
                  <span>📍 {r.sedeId || '—'}</span>
                  <span>🏍️ {r.tipoMoto}</span>
                </div>
              </button>
            );
          })}
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button type="button" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual <= 1} variant="outline" className="!py-1.5 !px-3 !text-[10px] !w-auto" icon={ArrowLeft}>Anterior</Button>
            <span className="text-[10px] text-gray-500">{paginaActual} / {totalPaginas}</span>
            <Button type="button" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual >= totalPaginas} variant="outline" className="!py-1.5 !px-3 !text-[10px] !w-auto" icon={ArrowRight}>Siguiente</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AdminReservasList;