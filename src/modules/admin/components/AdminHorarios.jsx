// @build: 2026-08-30.16-30-00 | id: CRUD-HORARIOS-ORDEN | backup: AdminHorarios.jsx.backup-20260830-163000 | desc: CRUD de horarios ordenados por hora de inicio
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormHorario from '../forms/FormHorario';
import { ordenarHorarios } from '../../shared/utils/horarios';

const AdminHorarios = ({ onBack }) => {
  const { horarios, saveHorario } = useContext(AppContext);
  return <CRUDView titulo="Horarios" items={ordenarHorarios(horarios || [])} saveFn={saveHorario} formComponent={FormHorario} onBack={onBack} />;
};

export default AdminHorarios;