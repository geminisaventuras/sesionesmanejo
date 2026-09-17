// @build: 2026-09-14 | id: CRUD-HORARIOS-TABS | desc: CRUD de horarios con pestana de bloqueos admin
import { useContext, useState } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormHorario from '../forms/FormHorario';
import AdminBloqueos from './AdminBloqueos';
import { ordenarHorarios } from '../../shared/utils/horarios';

const TABS = [
  { id: 'horarios', label: 'Horarios' },
  { id: 'bloqueos', label: 'Bloqueos' }
];

const AdminHorarios = ({ onBack }) => {
  const { horarios, saveHorario } = useContext(AppContext);
  const [tab, setTab] = useState('horarios');

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-200 mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'horarios' && (
        <CRUDView
          titulo="Horarios"
          items={ordenarHorarios(horarios || [])}
          saveFn={saveHorario}
          formComponent={FormHorario}
          onBack={onBack}
        />
      )}

      {tab === 'bloqueos' && <AdminBloqueos />}
    </div>
  );
};

export default AdminHorarios;
