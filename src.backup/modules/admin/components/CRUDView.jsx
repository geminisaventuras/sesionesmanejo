// @build: 2026-06-22 | id: CRUD-VIEW-GEN | desc: Componente CRUD genérico reutilizable
import { useState, useCallback, useContext, memo } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import { ChevronLeft, Plus, Edit, Power } from 'lucide-react';

const CRUDView = memo(({ titulo, items, saveFn, formComponent: FormComponent, onBack, rol }) => {
  const { showToast } = useToast();
  const { user } = useContext(AppContext);
  const [itemEdit, setItemEdit] = useState(null);
  const isAdmin = user?.role === 'admin';

  const handleSaveGeneral = useCallback(async (datos) => {
    if (!isAdmin) return;
    if (typeof saveFn === 'function') await saveFn(datos);
    setItemEdit(null);
    showToast('Guardado exitoso');
  }, [isAdmin, saveFn, showToast]);

  if (itemEdit !== null) return <FormComponent item={itemEdit} onSave={(d) => handleSaveGeneral(d, itemEdit?.id)} onCancel={() => setItemEdit(null)} />;

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 items-center">
          <button type="button" onClick={onBack} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">{titulo}</h2>
        </div>
        {isAdmin && <button type="button" onClick={() => setItemEdit({})} className="bg-[#1d4ed8] text-white p-2 px-3 rounded-xl font-bold flex gap-1 text-sm shadow-md hover:bg-blue-700"><Plus size={16} /> Nuevo</button>}
      </div>
      {(items || []).map(item => {
        const itemTitle = item.nombre || item.label || (item.marca || item.modelo ? `${item.marca || ''} ${item.modelo || ''}`.trim() : 'Elemento');
        return (
          <div key={item.id} className={`bg-white p-4 rounded-2xl shadow-sm border mb-3 flex items-center justify-between ${item.activo ? 'border-gray-100' : 'border-red-100 opacity-60'}`}>
            <div className="flex-1 pr-2"><h4 className="font-bold text-gray-900 text-sm">{itemTitle} {item.apellido || ''}</h4>{item.direccion && <p className="text-xs text-gray-500 mt-1">{item.direccion}</p>}<div className="flex gap-1 flex-wrap mt-1">{!item.activo && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Inactivo</span>}{item.esPrincipal && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Principal</span>}</div></div>
            {isAdmin && (<div className="flex gap-2"><button type="button" onClick={() => setItemEdit(item)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><Edit size={16} /></button><button type="button" onClick={async () => { await saveFn({ ...item, activo: !item.activo }); showToast('Estado cambiado'); }} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100"><Power size={16} /></button></div>)}
          </div>
        );
      })}
    </div>
  );
});

export default CRUDView;