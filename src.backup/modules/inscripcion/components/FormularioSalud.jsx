// @build: 2026-06-22.REFACTOR | id: FORM-SALUD | desc: Componente puro del formulario de salud. Texto restaurado al original.
import React from 'react';
import { X } from 'lucide-react';

export function FormularioSalud({ form, updateForm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Información de Seguridad y Salud</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X size={20} className="text-gray-600" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">🔒 La siguiente información es estrictamente confidencial y se solicita exclusivamente para garantizar tu seguridad durante las prácticas en pista.</p>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            ¿Padeces alguna condición médica, lesión o enfermedad crónica que pueda limitar tu capacidad para conducir una motocicleta de forma segura? *
          </label>
          <p className="text-xs text-gray-400 mb-3">(Ej: problemas visuales, vértigo, condiciones cardíacas, convulsiones, lesiones de columna, etc.)</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="condicion_medica" value="no" checked={form.condicionMedica === 'no'} onChange={() => updateForm({ condicionMedica: 'no', detalleCondicion: '' })} className="text-indigo-600 focus:ring-indigo-500" />
              <span className="text-gray-700">No, me encuentro en óptimas condiciones</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="condicion_medica" value="si" checked={form.condicionMedica === 'si'} onChange={() => updateForm({ condicionMedica: 'si' })} className="text-indigo-600 focus:ring-indigo-500" />
              <span className="text-gray-700">Sí, presento una condición</span>
            </label>
          </div>
        </div>

        {form.condicionMedica === 'si' && (
          <div className="mt-4 transition-all duration-300">
            <label className="block text-sm font-medium text-gray-700 mb-1">Por favor, especifica brevemente tu condición (indica también si tomas medicamentos que afecten tus reflejos):</label>
            <textarea
              rows={3}
              value={form.detalleCondicion}
              onChange={e => updateForm({ detalleCondicion: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ejemplo: Sufro de vértigo ocasional / Tomo medicación para la tensión..."
            />
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
          >
            Guardar y cerrar
          </button>
        </div>
      </div>
    </div>
  );
}