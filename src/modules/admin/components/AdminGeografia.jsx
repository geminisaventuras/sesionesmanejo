// @build: 2026-11-24 | id: ADMIN-GEOGRAFIA | desc: CRUD de estados, municipios y ciudades (jerarquía de sedes).
import { useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import { Button, Input, Select } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { Activity, BookOpen, Calendar, ChevronLeft, Settings, Wallet } from 'lucide-react';
import CRUDView from './CRUDView';
import { validarCatalogo } from '../../shared/utils/geografiaHelpers';

const porNombre = (a, b) => String(a?.nombre || a?.id || '').localeCompare(String(b?.nombre || b?.id || ''), 'es');

const FormCatalogo = ({ tipo, item, onSave, onCancel }) => {
  const { estados, municipios, ciudades } = useContext(AppContext);
  const [form, setForm] = useState(
    item?.id
      ? { ...item, activo: item.activo !== false }
      : { nombre: '', activo: true, estadoId: '', municipioId: '' }
  );
  const [error, setError] = useState('');

  const estadosOpciones = useMemo(() => (
    (estados || [])
      .filter(e => e.activo !== false || String(e.id) === String(form.estadoId))
      .sort(porNombre)
  ), [estados, form.estadoId]);

  const municipiosOpciones = useMemo(() => (
    (municipios || [])
      .filter(m => m.activo !== false || String(m.id) === String(form.municipioId))
      .sort(porNombre)
      .map(m => {
        const estado = (estados || []).find(e => String(e.id) === String(m.estadoId));
        return { ...m, nombre: estado ? `${m.nombre} (${estado.nombre})` : m.nombre, nombreOriginal: m.nombre };
      })
  ), [municipios, estados, form.municipioId]);

  const guardar = () => {
    const catalogos = { estados: estados || [], municipios: municipios || [], ciudades: ciudades || [] };
    const datos = {
      ...form,
      nombre: String(form.nombre || '').trim(),
      activo: form.activo !== false,
    };

    if (tipo === 'estados') {
      delete datos.estadoId;
      delete datos.municipioId;
    } else if (tipo === 'municipios') {
      delete datos.municipioId;
    } else if (tipo === 'ciudades') {
      delete datos.estadoId;
    }

    const validacion = validarCatalogo({ tipo, datos, catalogos, itemActual: item });
    if (!validacion.ok) {
      setError(validacion.errores[0]);
      return;
    }

    setError('');
    onSave(datos);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button>
        <h3 className="font-bold text-lg">{item?.id ? 'Editar' : 'Nuevo'} {tipo.slice(0, -1)}</h3>
      </div>

      <Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />

      {tipo === 'municipios' && (
        <Select
          label="Estado"
          value={form.estadoId || ''}
          onChange={e => setForm({ ...form, estadoId: e.target.value })}
          options={estadosOpciones}
        />
      )}

      {tipo === 'ciudades' && (
        <Select
          label="Municipio"
          value={form.municipioId || ''}
          onChange={e => setForm({ ...form, municipioId: e.target.value })}
          options={municipiosOpciones}
        />
      )}

      {error && <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

      <Button type="button" onClick={guardar} variant="dark">Guardar</Button>
    </div>
  );
};

const AdminGeografia = () => {
  const navigate = useNavigate();
  const { logoutUser, notifications, estados, municipios, ciudades, saveGeografia } = useContext(AppContext);
  const { showToast } = useToast();
  const [tab, setTab] = useState('estados');

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') },
  ];

  const itemById = useMemo(() => {
    const estadosMap = new Map((estados || []).map(e => [String(e.id), e]));
    const municipiosMap = new Map((municipios || []).map(m => [String(m.id), m]));
    return { estadosMap, municipiosMap };
  }, [estados, municipios]);

  const items = tab === 'estados' ? (estados || []) : tab === 'municipios' ? (municipios || []) : (ciudades || []);

  const etiquetaItem = (item) => {
    if (tab === 'estados') return item?.nombre || '—';
    if (tab === 'municipios') {
      const estado = itemById.estadosMap.get(String(item?.estadoId));
      return `${item?.nombre || '—'}${estado ? ` — ${estado.nombre}` : ''}`;
    }
    const municipio = itemById.municipiosMap.get(String(item?.municipioId));
    const estado = municipio ? itemById.estadosMap.get(String(municipio.estadoId)) : null;
    return [item?.nombre, municipio?.nombre, estado?.nombre].filter(Boolean).join(' — ');
  };

  const saveFn = async (datos) => {
    try {
      await saveGeografia(tab, datos);
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const header = (
    <DashboardHeader
      title="Geografía"
      onBack={() => navigate('/admin/config')}
      onLogout={handleLogout}
      notifications={notifications}
    />
  );
  const footer = (
    <DashboardFooter
      tabs={footerTabs}
      activeTab="config"
      onTabChange={(id) => {
        const target = footerTabs.find(t => t.id === id);
        if (target?.action) target.action();
      }}
    />
  );

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md min-[540px]:max-w-3xl lg:max-w-5xl">
      <div className="p-3 md:p-5">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['estados', 'municipios', 'ciudades'].map((id) => (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              className={`p-3 rounded-xl font-bold text-sm capitalize ${tab === id ? 'bg-[#1d4ed8] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            >
              {id}
            </button>
          ))}
        </div>

        <CRUDView
          key={tab}
          titulo={tab === 'estados' ? 'Estados' : tab === 'municipios' ? 'Municipios' : 'Ciudades'}
          items={items}
          saveFn={saveFn}
          formComponent={(props) => <FormCatalogo {...props} tipo={tab} />}
          onBack={() => navigate('/admin/config')}
          renderTitulo={etiquetaItem}
        />
      </div>
    </AppShell>
  );
};

export default AdminGeografia;
