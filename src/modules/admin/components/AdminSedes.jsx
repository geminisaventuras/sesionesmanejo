// @build: 2026-11-24 | id: CRUD-SEDES-GEOGRAFIA | desc: CRUD de sedes con etiqueta de ubicación y enlace "Ver mapa" sin lat/lng visibles.
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import CRUDView from './CRUDView';
import FormSede from '../forms/FormSede';
import { etiquetaUbicacionSede, nombreSedeCanonico } from '../../shared/utils/sedesHelpers';
import { urlMapaSede } from '../../shared/utils/geografiaHelpers';

const AdminSedes = ({ onBack }) => {
  const { sedes, saveSede, estados, municipios, ciudades } = useContext(AppContext);
  const catalogos = { estados, municipios, ciudades };

  const tituloSede = (item) => {
    const etiqueta = etiquetaUbicacionSede(item, catalogos);
    const nombre = nombreSedeCanonico(item);
    return etiqueta ? `${nombre} — ${etiqueta}` : `${nombre} (${item?.id ?? '—'})`;
  };

  return (
    <CRUDView
      titulo="Sedes"
      items={sedes}
      saveFn={saveSede}
      formComponent={FormSede}
      onBack={onBack}
      renderItem={(item) => {
        const urlMapa = urlMapaSede(item, catalogos);
        return (
          <div className="flex-1 pr-2">
            <h4 className="font-bold text-gray-900 text-sm">{tituloSede(item)}</h4>
            {item.direccion && <p className="text-xs text-gray-500 mt-1">{item.direccion}</p>}
            {urlMapa && (
              <a
                href={urlMapa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 text-xs font-bold text-blue-600 underline"
              >
                Ver mapa
              </a>
            )}
            <div className="flex gap-1 flex-wrap mt-1">
              {!item.activo && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Inactivo</span>}
              {item.esPrincipal && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Principal</span>}
            </div>
          </div>
        );
      }}
    />
  );
};
export default AdminSedes;
