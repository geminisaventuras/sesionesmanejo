// @build: 2026-09-16 | id: ADMIN-METODOS-PAGO | desc: CRUD de metodos de pago
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormMetodoPago from '../forms/FormMetodoPago';

const ordenarPorOrden = (lista = []) =>
  [...lista].sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));

const AdminMetodosPago = ({ onBack }) => {
  const { metodosPago, saveMetodoPago } = useContext(AppContext);
  return (
    <CRUDView
      titulo="Métodos de Pago"
      items={ordenarPorOrden(metodosPago || [])}
      saveFn={saveMetodoPago}
      formComponent={FormMetodoPago}
      onBack={onBack}
    />
  );
};

export default AdminMetodosPago;
