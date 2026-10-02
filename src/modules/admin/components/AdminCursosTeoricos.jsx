// @build: 2026-09-30 | id: ADMIN-CURSOS-TEORICOS | desc: CRUD de cursos teóricos con render custom
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormCursoTeorico from '../forms/FormCursoTeorico';

const AdminCursosTeoricos = ({ onBack }) => {
  const { cursosTeoricos, saveCursoTeorico } = useContext(AppContext);

  const renderItem = (curso) => {
    const precioLabel = curso.precio
      ? `$${Number(curso.precio).toFixed(2)} ${curso.moneda || 'USD'}`
      : 'Gratis';
    const duracionLabel = curso.duracionAcceso === 'vida'
      ? 'De por vida'
      : curso.duracionAcceso
        ? `${curso.duracionAcceso} días`
        : 'Sin definir';
    return (
      <div className="flex-1 pr-2 min-w-0">
        <h4 className="font-bold text-gray-900 text-sm">{curso.nombre}</h4>
        <p className="text-[11px] text-gray-600 mt-0.5">
          <span className="font-bold text-blue-700">{precioLabel}</span>
          <span className="text-gray-400"> · {duracionLabel} · {curso.totalModulos || 0} módulos · {curso.totalQuizzes || 0} quizzes</span>
        </p>
        {curso.descripcion && (
          <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{curso.descripcion}</p>
        )}
      </div>
    );
  };

  return (
    <CRUDView
      titulo="Cursos Teóricos"
      items={cursosTeoricos || []}
      saveFn={saveCursoTeorico}
      formComponent={FormCursoTeorico}
      onBack={onBack}
      renderItem={renderItem}
    />
  );
};

export default AdminCursosTeoricos;