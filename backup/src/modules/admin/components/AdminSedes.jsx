// @build: 2026-06-22 | id: CRUD-SEDES | desc: CRUD de sedes
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormSede from '../forms/FormSede';

const AdminSedes = ({ onBack }) => {
  const { sedes, saveSede } = useContext(AppContext);
  return <CRUDView titulo="Sedes" items={sedes} saveFn={saveSede} formComponent={FormSede} onBack={onBack} />;
};
export default AdminSedes;