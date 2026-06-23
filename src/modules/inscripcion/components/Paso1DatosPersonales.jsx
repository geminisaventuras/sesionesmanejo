import React, { useState, useEffect } from 'react';
import { User, Contact, Calendar, Phone, Mail, Users, MapPin, Heart } from 'lucide-react';
import { validarPaso1 } from '../../shared/schemas/validations';

const ESTADOS_VZLA = ['Distrito Capital', 'Miranda', 'La Guaira', 'Aragua', 'Carabobo', 'Zulia', 'Táchira'];
const SEXOS = ['Masculino', 'Femenino'];

export function Paso1DatosPersonales({ form, updateForm, onOpenSalud, onOpenFechaNacimiento }) {
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});

  useEffect(() => {
    if (Object.keys(tocados).length > 0) {
      const result = validarPaso1(form);
      if (!result.success) {
        setErrores(result.errores);
      } else {
        setErrores({});
      }
    }
  }, [form, tocados]);

  const marcarTocado = (campo) => {
    setTocados(prev => ({ ...prev, [campo]: true }));
  };

  const handleChange = (campo, valor) => {
    updateForm({ [campo]: valor });
    marcarTocado(campo);
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><User size={14} className="text-gray-500" /> Nombres</label>
          <input type="text" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: Juan" maxLength={50} className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${errores.nombre ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="given-name" />
          {errores.nombre && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.nombre}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><User size={14} className="text-gray-500" /> Apellidos</label>
          <input type="text" value={form.apellido} onChange={e => handleChange('apellido', e.target.value)} placeholder="Ej: Pérez" maxLength={50} className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${errores.apellido ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="family-name" />
          {errores.apellido && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.apellido}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Contact size={14} className="text-gray-500" /> Cédula</label>
          <input type="tel" value={form.cedula} onChange={e => handleChange('cedula', e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="Ej: 12345678" inputMode="numeric" pattern="\d{7,10}" maxLength={10} className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${errores.cedula ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="off" />
          {errores.cedula && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.cedula}</p>}
        </div>
        <div onClick={onOpenFechaNacimiento} className="cursor-pointer">
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Calendar size={14} className="text-gray-500" /> Fecha de Nac.</label>
          <div className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm h-[42px] flex items-center ${errores.diaNac || errores.mesNac || errores.anoNac ? 'border-red-500' : 'border-gray-200'}`}>
            <span className={form.diaNac ? 'font-medium' : 'text-gray-400'}>
              {form.diaNac && form.mesNac && form.anoNac ? `${String(form.diaNac).padStart(2,'0')}/${String(form.mesNac).padStart(2,'0')}/${form.anoNac}` : 'DD/MM/AA'}
            </span>
            <Calendar size={16} className="ml-auto text-gray-500" />
          </div>
          {(errores.diaNac || errores.mesNac || errores.anoNac) && <p className="text-xs text-red-600 mt-0.5 ml-1">Fecha de nacimiento inválida</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Phone size={14} className="text-gray-500" /> Teléfono</label>
          <input type="tel" value={form.telefono} onChange={e => handleChange('telefono', e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="0412..." inputMode="numeric" pattern="\d{11}" maxLength={11} className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${errores.telefono ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="tel-national" />
          {errores.telefono && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.telefono}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Phone size={14} className="text-gray-500" /> Contac. emergencia</label>
          <input type="tel" value={form.contactoEmergencia} onChange={e => handleChange('contactoEmergencia', e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="0412..." inputMode="numeric" pattern="\d{11}" maxLength={11} className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${errores.contactoEmergencia ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="off" />
          {errores.contactoEmergencia && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.contactoEmergencia}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Mail size={14} className="text-gray-500" /> Correo</label>
          <input type="email" value={form.correo} onChange={e => handleChange('correo', e.target.value.trim().toLowerCase())} placeholder="ejemplo@correo.com" className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${errores.correo ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="email" />
          {errores.correo && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.correo}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Users size={14} className="text-gray-500" /> Sexo</label>
          <select value={form.sexo} onChange={e => handleChange('sexo', e.target.value)} className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${errores.sexo ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="sex">
            <option value="" disabled>Seleccionar</option>
            {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errores.sexo && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.sexo}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><MapPin size={14} className="text-gray-500" /> Estado</label>
          <select value={form.estado} onChange={e => handleChange('estado', e.target.value)} className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${errores.estado ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="address-level1">
            <option value="" disabled>Seleccionar</option>
            {ESTADOS_VZLA.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          {errores.estado && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.estado}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><MapPin size={14} className="text-gray-500" /> Zona</label>
          <input type="text" value={form.zona} onChange={e => handleChange('zona', e.target.value)} placeholder="Ej: Petare" maxLength={100} className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${errores.zona ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="address-level2" />
          {errores.zona && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.zona}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSalud}
        className={`w-full flex items-center justify-center gap-2 py-2 border-2 rounded-xl text-sm font-medium transition-colors ${
          form.condicionMedica
            ? 'border-green-400 bg-green-50 text-green-700'
            : errores.condicionMedica
            ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
            : 'border-red-300 bg-red-50 text-red-600 animate-pulse'
        }`}
      >
        <Heart size={16} />
        Información de Salud (obligatorio)
      </button>
      {errores.condicionMedica && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.condicionMedica}</p>}
    </div>
  );
}