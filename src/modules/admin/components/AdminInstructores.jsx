// @build: 2026-06-22 | id: CRUD-INSTRUCTORES | desc: CRUD de instructores
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormPersonal from '../forms/FormPersonal';

const AdminInstructores = ({ onBack }) => {
  const { instructores, handleSaveInstructorSeguro } = useContext(AppContext);
  return <CRUDView titulo="Instructores" items={instructores} saveFn={handleSaveInstructorSeguro} formComponent={(p) => <FormPersonal {...p} rol="instructor" />} onBack={onBack} />;
};
export default AdminInstructores;