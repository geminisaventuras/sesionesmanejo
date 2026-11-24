// @build: 2026-11-24 | id: FT-047 | desc: Lista de packs aprobados para el "Ver todas" de la bandeja de Reservas.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppShell from '../../shared/components/AppShell';
import { useAdminReservas } from '../hooks/useAdminReservas';
import { itemDesdePack } from './reservasHomeDatos';
import ReservasHomeRow from './ReservasHomeRow';

const AdminPacksList = () => {
  const { packs, cargando, error } = useAdminReservas();
  const navigate = useNavigate();

  const items = useMemo(
    () => (packs || [])
      .map(itemDesdePack)
      .sort((a, b) => (b.creadoMs || 0) - (a.creadoMs || 0)),
    [packs]
  );

  const header = (
    <div className="flex min-w-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2.5">
      <button
        type="button"
        onClick={() => navigate('/admin/reservas')}
        aria-label="Volver a la bandeja de Reservas"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <ArrowLeft size={18} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="m-0 truncate text-[16px] font-extrabold tracking-tight text-gray-900">Packs</h1>
        <p className="m-0 truncate text-[11px] text-gray-500">Todos los packs de la bandeja</p>
      </div>
      <span className="inline-flex min-w-[26px] shrink-0 items-center justify-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11.5px] font-extrabold tabular-nums text-purple-700">
        {cargando || error ? '—' : items.length}
      </span>
    </div>
  );

  return (
    <AppShell header={header} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-3xl">
      <div className="min-w-0 p-4 lg:px-6 lg:py-5">
        {cargando ? (
          <div aria-busy="true" className="min-w-0">
            <span role="status" className="sr-only">Cargando packs</span>
            {[0, 1, 2].map((indice) => (
              <span key={indice} className="mb-2 block h-[64px] rounded-xl bg-gray-100 motion-safe:animate-pulse last:mb-0" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="m-0 rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center text-[12px] text-gray-600">
            No pudimos cargar los packs. Vuelve a la bandeja e inténtalo de nuevo.
          </p>
        ) : items.length === 0 ? (
          <p className="m-0 rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center text-[12px] text-gray-500">
            No hay packs en la bandeja.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {items.map((item) => (
              <ReservasHomeRow key={item.key} item={item} onClick={() => navigate(item.ruta)} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AdminPacksList;
