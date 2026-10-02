// @build: 2026-09-30 | id: ADMIN-CURSOS-TABS | desc: Tabs Prácticos/Teóricos dentro de Cursos
import { useContext, useState } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormCursos from '../forms/FormCursos';
import AdminCursosTeoricos from './AdminCursosTeoricos';

const AdminCursos = ({ onBack }) => {
  const { cursos, saveCurso } = useContext(AppContext);
  const [tab, setTab] = useState('practicos');

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-200 mb-4">
        <button
          type="button"
          onClick={() => setTab('practicos')}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg whitespace-nowrap transition-colors ${
            tab === 'practicos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Prácticos
        </button>
        <button
          type="button"
          onClick={() => setTab('teoricos')}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg whitespace-nowrap transition-colors ${
            tab === 'teoricos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Teóricos
        </button>
      </div>

      {tab === 'practicos' && (
        <CRUDView
          titulo="Cursos Prácticos"
          items={cursos}
          saveFn={saveCurso}
          formComponent={FormCursos}
          onBack={onBack}
        />
      )}

      {tab === 'teoricos' && (
        <AdminCursosTeoricos onBack={onBack} />
      )}
    </div>
  );
};

export default AdminCursos;