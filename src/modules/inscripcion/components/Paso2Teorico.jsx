// @build: 2026-10-09 | id: PASO2-TEORICO | desc: Paso 2 variante teórico - solo muestra el módulo formativo elegido
import { GraduationCap, BookOpen, HelpCircle, Clock, CheckCircle } from 'lucide-react';

const formatearDuracionAcceso = (duracion) => {
  if (!duracion || duracion === 'vida') return 'Acceso de por vida';
  return `Acceso por ${duracion} días`;
};

export function Paso2Teorico({ cursoTeorico }) {
  if (!cursoTeorico) return null;

  const precio = Number(cursoTeorico.precio) || 0;
  const esGratis = precio === 0;

  return (
    <div className="space-y-4">
      {/* Resumen del módulo */}
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-teal-700 mb-1">
              Módulo Formativo
            </p>
            <h3 className="font-black text-lg text-gray-900 truncate">
              {cursoTeorico.nombre}
            </h3>
            {cursoTeorico.descripcion && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {cursoTeorico.descripcion}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detalles del contenido */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
          Este módulo incluye
        </h4>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <BookOpen size={16} className="text-teal-600 flex-shrink-0" />
            <span><strong>{cursoTeorico.totalModulos || 0}</strong> módulos</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <HelpCircle size={16} className="text-teal-600 flex-shrink-0" />
            <span><strong>{cursoTeorico.totalQuizzes || 0}</strong> retos</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock size={16} className="text-teal-600 flex-shrink-0" />
            <span>{formatearDuracionAcceso(cursoTeorico.duracionAcceso)}</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
          <span className="text-xs font-bold text-gray-600">Precio final:</span>
          <span className="text-2xl font-black text-teal-700">
            {esGratis ? 'Gratis' : `$${precio} ${cursoTeorico.moneda || 'USD'}`}
          </span>
        </div>
      </div>

      {/* Aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <CheckCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Al continuar, serás dirigido al pago. Tu acceso se activará cuando el administrador apruebe el pago.
        </p>
      </div>
    </div>
  );
}

export default Paso2Teorico;
