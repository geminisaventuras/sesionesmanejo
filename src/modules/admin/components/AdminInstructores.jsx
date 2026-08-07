// @build: 2026-06-22 | id: CRUD-INSTRUCTORES | desc: CRUD de instructores
import { useState, useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormPersonal from '../forms/FormPersonal';
import ResetPasswordModal from './ResetPasswordModal';
import { usePasswordReset } from '../../../hooks/usePasswordReset';

const AdminInstructores = ({ onBack }) => {
  const { instructores, handleSaveInstructorSeguro } = useContext(AppContext);
  const { resetPassword } = usePasswordReset();
  const [selectedStaff, setSelectedStaff] = useState(null);

  const handleResetClick = (instructor) => {
    setSelectedStaff(instructor);
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
        titulo="Instructores"
        items={instructores}
        saveFn={handleSaveInstructorSeguro}
        formComponent={(p) => <FormPersonal {...p} rol="instructor" />}
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

export default AdminInstructores;