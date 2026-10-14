// @build: 2026-10-03 | id: ADMIN-RECURSOS | desc: CRUD de recursos gratuitos (PDFs, videos, documentales)
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormRecurso from '../forms/FormRecurso';

const ordenarPorOrden = (lista = []) =>
  [...lista].sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));

const AdminRecursos = ({ onBack }) => {
  const { recursos, saveRecurso } = useContext(AppContext);
  return (
    <CRUDView
      titulo="Recursos Gratuitos"
      items={ordenarPorOrden(recursos || [])}
      saveFn={saveRecurso}
      formComponent={FormRecurso}
      onBack={onBack}
    />
  );
};

export default AdminRecursos;
