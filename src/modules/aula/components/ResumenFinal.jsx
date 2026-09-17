// @build: 2026-08-30.13-00-00 | id: RESUMEN-FINAL | backup: ResumenFinal.jsx.backup-20260830-130000 | desc: Resumen de módulos aprobados y sumatoria de tiempo
import { CheckCircle, Clock, Award } from 'lucide-react';

function formatearMinutos(minutos) {
  if (minutos <= 0) return '0 min';
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas} h`;
  return `${horas} h ${mins} min`;
}

export default function ResumenFinal({ modulos, modulosEstado }) {
  if (!modulos || !modulosEstado) return null;

  const modulosCompletados = modulos
    .map(modulo => {
      // Normalizar módulo: puede ser string o objeto
      const nombre = typeof modulo === 'string' ? modulo : modulo.nombre;

      const estado = modulosEstado[nombre];
      if (!estado || !estado.fecha) return null;

      const duracion = estado.duracion || 0;
      const duracionExtra = estado.duracionExtra || 0;

      return {
        nombre,
        duracion,
        duracionExtra,
        duracionTotal: duracion + duracionExtra,
      };
    })
    .filter(Boolean);

  if (modulosCompletados.length === 0) return null;

  const tiempoTotal = modulosCompletados.reduce((acc, m) => acc + m.duracionTotal, 0);
  const tiempoExtraTotal = modulosCompletados.reduce((acc, m) => acc + m.duracionExtra, 0);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-green-200">
        <Award className="w-7 h-7 text-green-600" />
        <div>
          <h3 className="text-lg font-bold text-green-900">Curso Completado</h3>
          <p className="text-sm text-green-700">Resumen del tiempo invertido</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {modulosCompletados.map((modulo) => (
          <div key={modulo.nombre} className="flex items-center justify-between bg-white rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{modulo.nombre}</p>
                <p className="text-xs text-gray-500">
                  {modulo.duracion} min planificados
                  {modulo.duracionExtra > 0 && (
                    <span className="text-blue-600 ml-1">+ {modulo.duracionExtra} min extra</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm font-bold text-green-700 ml-3">
              <Clock className="w-4 h-4" />
              {formatearMinutos(modulo.duracionTotal)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg p-4 border-2 border-green-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">Tiempo Total Invertido</p>
            {tiempoExtraTotal > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Incluye {formatearMinutos(tiempoExtraTotal)} de tiempo extra
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-green-700">{formatearMinutos(tiempoTotal)}</p>
            <p className="text-xs text-gray-500">{modulosCompletados.length} módulos</p>
          </div>
        </div>
      </div>
    </div>
  );
}