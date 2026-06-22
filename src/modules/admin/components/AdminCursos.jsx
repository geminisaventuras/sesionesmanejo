// @build: 2026-06-22 | id: CRUD-CURSOS | desc: CRUD de cursos
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormCursos from '../forms/FormCursos';

const AdminCursos = ({ onBack }) => {
  const { cursos, saveCurso } = useContext(AppContext);
  return <CRUDView titulo="Cursos" items={cursos} saveFn={saveCurso} formComponent={FormCursos} onBack={onBack} />;
};
export default AdminCursos;