// @build: 2026-10-02 | id: TEORICO-MODAL-DETALLE | desc: Modal de detalle de Módulo Formativo con disclaimers y CTA
import { X, Clock, BookMarked, HelpCircle, Video, BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import TextoEnriquecido from '../../shared/components/TextoEnriquecido';

const formatearDuracionAcceso = (duracion) => {
  if (!duracion || duracion === 'vida') return 'Acceso de por vida';
  return `Acceso por ${duracion} días`;
};

export default function ModalDetalleTeorico({ modulo, onClose }) {
  if (!modulo) return null;

  const precio = Number(modulo.precio) || 0;
  const esGratis = precio === 0;

  const handleInscribirme = () => {
    // Bloque 5 conectará el flujo de compra real
    alert('Este módulo formativo estará disponible próximamente. Contáctanos para más información.');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-teorico-title"
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 id="modal-teorico-title" className="text-2xl font-bold text-gray-900">
            {modulo.nombre}
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
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={18} />
              <span>{formatearDuracionAcceso(modulo.duracionAcceso)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <BookMarked size={18} />
              <span>{modulo.totalModulos || 0} módulos</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <HelpCircle size={18} />
              <span>{modulo.totalQuizzes || 0} retos</span>
            </div>
          </div>

          <div className="text-3xl font-black text-teal-600">
            {esGratis ? 'Gratis' : `$${precio} ${modulo.moneda || 'USD'}`}
          </div>

          {modulo.disclaimerInicio && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 mb-1 text-sm">Aviso</h4>
                  <TextoEnriquecido texto={modulo.disclaimerInicio} className="text-sm text-amber-800" />
                </div>
              </div>
            </div>
          )}

          {modulo.descripcion && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <BookOpen className="text-teal-600" size={20} />
                Descripción
              </h3>
              <TextoEnriquecido texto={modulo.descripcion} className="text-sm text-gray-700" />
            </div>
          )}

          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
            <h3 className="text-sm font-bold text-teal-900 mb-3">
              Este módulo formativo incluye:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-teal-800">
                <BookOpen size={18} className="flex-shrink-0" />
                <span className="text-sm">Lecciones escritas</span>
              </div>
              <div className="flex items-center gap-2 text-teal-800">
                <Video size={18} className="flex-shrink-0" />
                <span className="text-sm">Contenido en video</span>
              </div>
              <div className="flex items-center gap-2 text-teal-800">
                <HelpCircle size={18} className="flex-shrink-0" />
                <span className="text-sm">Retos interactivos</span>
              </div>
            </div>
          </div>

          {modulo.disclaimerFooter && (
            <div className="border-t border-gray-100 pt-4">
              <TextoEnriquecido texto={modulo.disclaimerFooter} className="text-xs text-gray-500 leading-relaxed" />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          <button
            onClick={handleInscribirme}
            className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            {esGratis ? 'Comenzar ahora' : 'Inscribirme'}
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