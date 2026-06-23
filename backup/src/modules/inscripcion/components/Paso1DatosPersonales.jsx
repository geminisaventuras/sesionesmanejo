// @build: 2026-06-22.REFACTOR | id: PASO1-DATOS | desc: Componente puro del paso 1 (datos personales). Recibe form y updateForm.
import React from 'react';
import { User, Contact, Calendar, Phone, Mail, Users, MapPin, Heart } from 'lucide-react';

const ESTADOS_VZLA = ['Distrito Capital', 'Miranda', 'La Guaira', 'Aragua', 'Carabobo', 'Zulia', 'Táchira'];
const SEXOS = ['Masculino', 'Femenino'];

export function Paso1DatosPersonales({ form, updateForm, onOpenSalud, onOpenFechaNacimiento }) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><User size={14} className="text-gray-500" /> Nombres</label>
          <input type="text" value={form.nombre} onChange={e => updateForm({ nombre: e.target.value })} placeholder="Ej: Juan" maxLength={50} className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><User size={14} className="text-gray-500" /> Apellidos</label>
          <input type="text" value={form.apellido} onChange={e => updateForm({ apellido: e.target.value })} placeholder="Ej: Pérez" maxLength={50} className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Contact size={14} className="text-gray-500" /> Cédula</label>
          <input type="tel" value={form.cedula} onChange={e => updateForm({ cedula: e.target.value.replace(/\D/g,'').slice(0,10) })} placeholder="Ej: 12345678" inputMode="numeric" pattern="\d{7,10}" maxLength={10} className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none" required />
        </div>
        <div onClick={onOpenFechaNacimiento} className="cursor-pointer">
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Calendar size={14} className="text-gray-500" /> Fecha de Nac.</label>
          <div className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-2.5 px-3 text-sm text-gray-700 h-[42px] flex items-center">
            <span className={form.diaNac ? 'font-medium' : 'text-gray-400'}>
              {form.diaNac && form.mesNac && form.anoNac ? `${String(form.diaNac).padStart(2,'0')}/${String(form.mesNac).padStart(2,'0')}/${form.anoNac}` : 'DD/MM/AA'}
            </span>
            <Calendar size={16} className="ml-auto text-gray-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Phone size={14} className="text-gray-500" /> Teléfono</label>
          <input type="tel" value={form.telefono} onChange={e => updateForm({ telefono: e.target.value.replace(/\D/g,'').slice(0,11) })} placeholder="0412..." inputMode="numeric" pattern="\d{11}" maxLength={11} className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Phone size={14} className="text-gray-500" /> Contac. emergencia</label>
          <input type="tel" value={form.contactoEmergencia} onChange={e => updateForm({ contactoEmergencia: e.target.value.replace(/\D/g,'').slice(0,11) })} placeholder="0412..." inputMode="numeric" pattern="\d{11}" maxLength={11} className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Mail size={14} className="text-gray-500" /> Correo</label>
          <input type="email" value={form.correo} onChange={e => updateForm({ correo: e.target.value.trim().toLowerCase() })} placeholder="ejemplo@correo.com" className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Users size={14} className="text-gray-500" /> Sexo</label>
          <select value={form.sexo} onChange={e => updateForm({ sexo: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none" required>
            <option value="" disabled>Seleccionar</option>
            {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><MapPin size={14} className="text-gray-500" /> Estado</label>
          <select value={form.estado} onChange={e => updateForm({ estado: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none" required>
            <option value="" disabled>Seleccionar</option>
            {ESTADOS_VZLA.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><MapPin size={14} className="text-gray-500" /> Zona</label>
          <input type="text" value={form.zona} onChange={e => updateForm({ zona: e.target.value })} placeholder="Ej: Petare" maxLength={100} className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none" required />
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSalud}
        className={`w-full flex items-center justify-center gap-2 py-2 border-2 rounded-xl text-sm font-medium transition-colors ${
          form.condicionMedica
            ? 'border-green-400 bg-green-50 text-green-700'
            : 'border-red-300 bg-red-50 text-red-600 animate-pulse'
        }`}
      >
        <Heart size={16} />
        Información de Salud (obligatorio)
      </button>
    </div>
  );
}