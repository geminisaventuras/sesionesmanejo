// @build: 2026-09-22.A2.12 | id: ADMIN-PACKS | desc: CRUD de packs comerciales con render custom
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormPack from '../forms/FormPack';

const AdminPacks = ({ onBack }) => {
  const { packs, cursos, savePack } = useContext(AppContext);

  const calcularPrecio = (pack) => {
    const cursosPack = (pack.cursoIds || [])
      .map(id => (cursos || []).find(c => String(c.id) === String(id)))
      .filter(Boolean);
    const base = cursosPack.reduce((acc, c) => acc + (Number(c.precioBase) || 0), 0);
    const desc = pack.descuentoTipo === 'porcentaje'
      ? (base * (Number(pack.descuentoValor) || 0)) / 100
      : (Number(pack.descuentoValor) || 0);
    return { base, desc, final: Math.max(0, base - desc), cursosPack };
  };

  const renderItem = (pack) => {
    const { base, final, cursosPack } = calcularPrecio(pack);
    const descLabel = pack.descuentoTipo === 'porcentaje'
      ? `${pack.descuentoValor}%`
      : `$${pack.descuentoValor}`;
    return (
      <div className="flex-1 pr-2 min-w-0">
        <h4 className="font-bold text-gray-900 text-sm">{pack.nombre}</h4>
        <p className="text-[11px] text-gray-600 mt-0.5">
          <span className="font-bold text-blue-700">${final.toFixed(2)}</span>
          {base > 0 && <span className="text-gray-400"> (de ${base.toFixed(2)}, -{descLabel})</span>}
          <span className="text-gray-400"> · {cursosPack.length} cursos · {pack.vencimientoDias || 0} días</span>
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {cursosPack.map((c, i) => (
            <span key={c.id} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
              {i > 0 && '→ '}{c.nombre}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <CRUDView
      titulo="Packs Comerciales"
      items={packs || []}
      saveFn={savePack}
      formComponent={FormPack}
      onBack={onBack}
      renderItem={renderItem}
    />
  );
};

export default AdminPacks;
