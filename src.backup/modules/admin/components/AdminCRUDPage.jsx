// @build: 2026-06-22 | id: ADMIN-CRUD-PAGE | desc: Switch de páginas CRUD según tipo de entidad
import AdminCursos from './AdminCursos';
import AdminSedes from './AdminSedes';
import AdminHorarios from './AdminHorarios';
import AdminMotos from './AdminMotos';
import AdminInstructores from './AdminInstructores';
import AdminProveedores from './AdminProveedores';

const AdminCRUDPage = ({ vista, onBack }) => {
  switch (vista) {
    case 'cursos': return <AdminCursos onBack={onBack} />;
    case 'sedes': return <AdminSedes onBack={onBack} />;
    case 'horarios': return <AdminHorarios onBack={onBack} />;
    case 'motos': return <AdminMotos onBack={onBack} />;
    case 'instructores': return <AdminInstructores onBack={onBack} />;
    case 'proveedores': return <AdminProveedores onBack={onBack} />;
    default: return null;
  }
};

export default AdminCRUDPage;