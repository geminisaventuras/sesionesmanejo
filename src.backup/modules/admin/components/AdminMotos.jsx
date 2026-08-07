// @build: 2026-06-22 | id: CRUD-MOTOS | desc: CRUD de motos
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormMoto from '../forms/FormMoto';

const AdminMotos = ({ onBack }) => {
  const { motos, saveMoto } = useContext(AppContext);
  return <CRUDView titulo="Motos" items={motos} saveFn={saveMoto} formComponent={FormMoto} onBack={onBack} />;
};
export default AdminMotos;