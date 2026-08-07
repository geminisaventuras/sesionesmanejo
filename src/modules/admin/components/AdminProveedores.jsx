// @build: 2026-06-22 | id: CRUD-PROVEEDORES | desc: CRUD de proveedores
import { useState, useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormPersonal from '../forms/FormPersonal';
import ResetPasswordModal from './ResetPasswordModal';
import { usePasswordReset } from '../../../hooks/usePasswordReset';

const AdminProveedores = ({ onBack }) => {
  const { proveedores, saveProveedorSeguro } = useContext(AppContext);
  const { resetPassword } = usePasswordReset();
  const [selectedStaff, setSelectedStaff] = useState(null);

  const handleResetClick = (proveedor) => {
    setSelectedStaff(proveedor);
  };

  const handleConfirmReset = async () => {
    if (selectedStaff) {
      await resetPassword(selectedStaff.email, selectedStaff.nombre);
      setSelectedStaff(null);
    }
  };

  return (
    <>
      <CRUDView
        titulo="Proveedores"
        items={proveedores}
        saveFn={saveProveedorSeguro}
        formComponent={(p) => <FormPersonal {...p} rol="proveedor" />}
        onBack={onBack}
        onResetPassword={handleResetClick}
      />
      <ResetPasswordModal
        isOpen={!!selectedStaff}
        staffEmail={selectedStaff?.email}
        staffName={selectedStaff?.nombre}
        onConfirm={handleConfirmReset}
        onCancel={() => setSelectedStaff(null)}
      />
    </>
  );
};

export default AdminProveedores;