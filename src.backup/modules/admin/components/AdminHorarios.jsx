// @build: 2026-06-22 | id: CRUD-HORARIOS | desc: CRUD de horarios
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormHorario from '../forms/FormHorario';

const AdminHorarios = ({ onBack }) => {
  const { horarios, saveHorario } = useContext(AppContext);
  return <CRUDView titulo="Horarios" items={horarios} saveFn={saveHorario} formComponent={FormHorario} onBack={onBack} />;
};
export default AdminHorarios;