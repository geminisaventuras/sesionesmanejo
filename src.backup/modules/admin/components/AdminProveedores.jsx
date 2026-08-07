// @build: 2026-06-22 | id: CRUD-PROVEEDORES | desc: CRUD de proveedores
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormPersonal from '../forms/FormPersonal';

const AdminProveedores = ({ onBack }) => {
  const { proveedores, saveProveedor } = useContext(AppContext);
  return <CRUDView titulo="Proveedores" items={proveedores} saveFn={saveProveedor} formComponent={(p) => <FormPersonal {...p} rol="proveedor" />} onBack={onBack} />;
};
export default AdminProveedores;