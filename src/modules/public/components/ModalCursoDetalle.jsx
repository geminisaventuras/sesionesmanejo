import { X, Clock, Users, Shirt, Droplet, HardHat, Bike, CheckCircle2, AlertCircle } from 'lucide-react';

const formatearDuracion = (minutos) => {
  if (!minutos && minutos !== 0) return 'N/A';
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return `${horas}h ${mins} min`;
};


export default function ModalCursoDetalle({ curso, prerequisitoLabel, onClose, onInscribirme }) {
  if (!curso) return null;

   const tieneMotoIncluida = curso.motoIncluida !== false;
  const tiposMotoEscuela = curso.tiposMotoEscuela || [];
  const precioAlquilerMoto = curso.precioAlquilerMoto || 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
            {curso.nombre}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={18} />
             <span>{formatearDuracion(curso.duracionTotal)}</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              ${curso.precioBase || 0} USD
            </div>
          </div>

          {prerequisitoLabel && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-yellow-900 mb-1">Requisitos previos</h4>
                  <p className="text-sm text-yellow-800">
                    Para inscribirte en este curso debes haber completado:{' '}
                    <strong>{prerequisitoLabel}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {curso.queAprenderas && curso.queAprenderas.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={20} />
                Qué aprenderás
              </h3>
              <ul className="space-y-2">
                {(typeof curso.queAprenderas === 'string'
                  ? curso.queAprenderas.split('\n')
                  : curso.queAprenderas
                ).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {curso.dirigidoA && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Users className="text-blue-600" size={20} />
                A quién va dirigido
              </h3>
              <p className="text-sm text-gray-700">{curso.dirigidoA}</p>
            </div>
          )}

          {curso.formato && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Clock className="text-purple-600" size={20} />
                Formato de clases
              </h3>
              <p className="text-sm text-gray-700">{curso.formato}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {curso.vestimenta && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shirt className="text-gray-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Vestimenta</h4>
                    <p className="text-xs text-gray-700">{curso.vestimenta}</p>
                  </div>
                </div>
              </div>
            )}

            {curso.hidratacion && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Droplet className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Hidratación</h4>
                    <p className="text-xs text-gray-700">{curso.hidratacion}</p>
                  </div>
                </div>
              </div>
            )}

            {curso.casco && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <HardHat className="text-orange-600 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Casco</h4>
                    <p className="text-xs text-gray-700">{curso.casco}</p>
                  </div>
                </div>
              </div>
            )}

                        <div className={`p-4 rounded-lg ${tieneMotoIncluida ? 'bg-green-50' : 'bg-orange-50'}`}>
              <div className="flex items-start gap-2">
                <Bike className={`${tieneMotoIncluida ? 'text-green-600' : 'text-orange-600'} flex-shrink-0 mt-0.5`} size={18} />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">Moto de práctica</h4>
                  <p className="text-xs text-gray-700">
                    {tieneMotoIncluida
                      ? (tiposMotoEscuela.length > 0
                          ? `La escuela proporciona moto: ${tiposMotoEscuela.join(' o ')}`
                          : 'La escuela proporciona la moto')
                      : 'El alumno debe traer su propia moto'}
                  </p>
                  {tieneMotoIncluida && precioAlquilerMoto > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Alquiler:</strong> +${precioAlquilerMoto} USD
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {curso.modulos && curso.modulos.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Contenido del curso</h3>
              <div className="space-y-2">
                {curso.modulos.map((modulo, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="text-sm text-gray-700">
                      {typeof modulo === 'string' ? modulo : modulo.nombre}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          <button
            onClick={() => onInscribirme(curso.id)}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Inscribirme ahora
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}