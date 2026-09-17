import { useContext, useState } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import { Button, Input, Select } from '../../../components/UI';
import { Bike, Plus, Power, Edit, ChevronLeft } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const APP_ID = 'motoescuela-pro-v1';

const ProveedorMotos = () => {
  const { user, motos, config } = useContext(AppContext);
  const { showToast } = useToast();
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ marca: '', modelo: '', cilindrada: '', tipo: 'Automática', sedes: [] });

  const misMotos = (motos || []).filter(m => String(m.proveedorId) === String(user?.uid));
  const sedes = config?.sedes || [];

  const handleSave = async () => {
    if (!form.marca || !form.modelo) {
      showToast('Completa marca y modelo', 'error');
      return;
    }
    const id = form.id || Date.now().toString();
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'motos', id);
    await setDoc(ref, {
      ...form,
      id,
      proveedorId: user.uid,
      activo: form.activo !== undefined ? form.activo : true
    });
    showToast('Moto guardada', 'success');
    setEditando(null);
  };

  const toggleActivo = async (moto) => {
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'motos', moto.id);
    await setDoc(ref, { ...moto, activo: !moto.activo }, { merge: true });
    showToast('Estado actualizado', 'success');
  };

  if (editando !== null) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 items-center mb-4">
          <button onClick={() => setEditando(null)} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button>
          <h3 className="font-bold text-lg">{editando ? 'Editar' : 'Nueva'} Moto</h3>
        </div>
        <Input label="Marca" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} />
        <Input label="Modelo" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} />
        <Input label="Cilindrada (ej. 150cc)" value={form.cilindrada} onChange={e => setForm({ ...form, cilindrada: e.target.value })} />
        <Select label="Tipo" options={['Automática', 'Sincrónica']} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} />
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Sedes donde estará disponible</h4>
          <div className="flex flex-col gap-2">
            {sedes.filter(s => s.activo).map(s => (
              <label key={s.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg cursor-pointer">
                <input type="checkbox" checked={form.sedes?.includes(s.id)} onChange={() => setForm({ ...form, sedes: form.sedes?.includes(s.id) ? form.sedes.filter(id => id !== s.id) : [...(form.sedes || []), s.id] })} className="w-5 h-5 text-blue-600 rounded" />
                <span className="font-bold text-gray-800">{s.nombre}</span>
              </label>
            ))}
          </div>
        </div>
        <Button onClick={handleSave} variant="dark">Guardar Moto</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black text-gray-900 uppercase">Mis Motos</h2>
        <button onClick={() => { setForm({ marca: '', modelo: '', cilindrada: '', tipo: 'Automática', sedes: [] }); setEditando(true); }} className="bg-blue-600 text-white p-2 px-3 rounded-xl font-bold flex gap-1 text-sm"><Plus size={16} /> Nueva</button>
      </div>
      {misMotos.map(moto => (
        <div key={moto.id} className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between ${moto.activo ? 'border-gray-100' : 'border-red-100 opacity-60'}`}>
          <div>
            <h4 className="font-bold text-gray-900">{moto.marca} {moto.modelo}</h4>
            <p className="text-xs text-gray-500">{moto.tipo} · {moto.cilindrada}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggleActivo(moto)} className="p-2 bg-gray-50 rounded-lg"><Power size={16} className={moto.activo ? 'text-green-600' : 'text-red-600'} /></button>
            <button onClick={() => { setForm(moto); setEditando(true); }} className="p-2 bg-gray-50 rounded-lg"><Edit size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProveedorMotos;