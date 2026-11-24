// src/modules/inscripcion/components/Paso1DatosPersonales.jsx
//@build: 2026-06-24 | desc: Espaciado reducido para eliminar scroll vertical
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { User, Contact, Calendar, Phone, Mail, Users, MapPin, Heart } from 'lucide-react';
import { validarPaso1 } from '../../shared/schemas/validations';
import { AppContext } from '../../../context/AppContextValue';
import { opcionesCatalogo, resolverUbicacionInscripcion } from '../../shared/utils/geografiaHelpers';

const SEXOS = ['Masculino', 'Femenino'];

export function Paso1DatosPersonales({ form, updateForm, onOpenSalud, onOpenFechaNacimiento, fbUser }) {  
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const { estados = [], municipios = [], ciudades = [] } = useContext(AppContext);
  const catalogs = { estados, municipios, ciudades };
  const ubicacion = resolverUbicacionInscripcion(form, catalogs);
  const estadosOpciones = useMemo(() => opcionesCatalogo('estados', catalogs), [estados]);
  const municipiosOpciones = useMemo(
    () => opcionesCatalogo('municipios', catalogs, ubicacion.estadoId),
    [municipios, ubicacion.estadoId]
  );
  const ciudadesOpciones = useMemo(
    () => opcionesCatalogo('ciudades', catalogs, ubicacion.municipioId),
    [ciudades, ubicacion.municipioId]
  );
  const hidratadoRef = useRef(false);
  const cedulaBloqueada = !!fbUser && !!form.cedula;
  const correoBloqueado = !!fbUser && !!form.correo;

  // Recompra/SSOT legacy: si el usuario solo tiene nombres de texto, se
  // completan los IDs del catálogo por nombre normalizado una sola vez.
  useEffect(() => {
    if (hidratadoRef.current || estados.length === 0) return;
    hidratadoRef.current = true;
    const resuelta = resolverUbicacionInscripcion(form, catalogs);
    const cambios = {};
    ['estadoId', 'estado', 'municipioId', 'municipio', 'ciudadId', 'ciudad'].forEach((campo) => {
      if (resuelta[campo] && resuelta[campo] !== form[campo]) cambios[campo] = resuelta[campo];
    });
    if (Object.keys(cambios).length > 0) updateForm(cambios);
    // Solo debe ejecutarse cuando llegan los catálogos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estados, municipios, ciudades]);

  useEffect(() => {
    if (Object.keys(tocados).length > 0) {
      const result = validarPaso1(form);
      if (!result.success) {
        const erroresFiltrados = {};
        Object.keys(result.errores).forEach(campo => {
          if (tocados[campo]) {
            erroresFiltrados[campo] = result.errores[campo];
          }
        });
        setErrores(erroresFiltrados);
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

  const handleEstado = (estadoId) => {
    const estado = estadosOpciones.find((e) => e.id === estadoId);
    updateForm({
      estadoId,
      estado: estado?.nombre || '',
      municipioId: '',
      municipio: '',
      ciudadId: '',
      ciudad: ''
    });
    marcarTocado('estadoId');
  };

  const handleMunicipio = (municipioId) => {
    const municipio = municipiosOpciones.find((m) => m.id === municipioId);
    updateForm({
      municipioId,
      municipio: municipio?.nombre || '',
      ciudadId: '',
      ciudad: ''
    });
    marcarTocado('municipioId');
  };

  const handleCiudad = (ciudadId) => {
    const ciudad = ciudadesOpciones.find((c) => c.id === ciudadId);
    updateForm({ ciudadId, ciudad: ciudad?.nombre || '' });
    marcarTocado('ciudadId');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><User size={14} className="text-gray-500" /> Nombres</label>
          <input type="text" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: Juan" maxLength={50} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none ${errores.nombre ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="given-name" />
          {errores.nombre && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.nombre}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><User size={14} className="text-gray-500" /> Apellidos</label>
          <input type="text" value={form.apellido} onChange={e => handleChange('apellido', e.target.value)} placeholder="Ej: Pérez" maxLength={50} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none ${errores.apellido ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="family-name" />
          {errores.apellido && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.apellido}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Contact size={14} className="text-gray-500" /> Cédula</label>
                   <input type="tel" value={form.cedula} onChange={e => !cedulaBloqueada && handleChange('cedula', e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="Ej: 12345678" inputMode="numeric" pattern="\d{7,10}" maxLength={10} disabled={cedulaBloqueada} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none ${errores.cedula ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'} ${cedulaBloqueada ? 'opacity-60 cursor-not-allowed' : ''}`} required autoComplete="off" />
          {errores.cedula && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.cedula}</p>}
          {cedulaBloqueada && <p className="text-[10px] text-gray-500 mt-0.5 ml-1">Vinculada a tu cuenta</p>}
        </div>
        <div onClick={onOpenFechaNacimiento} className="cursor-pointer">
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Calendar size={14} className="text-gray-500" /> Fecha de Nac.</label>
          <div className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm h-[42px] flex items-center ${errores.diaNac || errores.mesNac || errores.anoNac ? 'border-red-500' : 'border-gray-200'}`}>
            <span className={form.diaNac ? 'font-medium' : 'text-gray-400'}>
              {form.diaNac && form.mesNac && form.anoNac ? `${String(form.diaNac).padStart(2,'0')}/${String(form.mesNac).padStart(2,'0')}/${form.anoNac}` : 'DD/MM/AA'}
            </span>
            
          </div>
          {(errores.diaNac || errores.mesNac || errores.anoNac) && <p className="text-xs text-red-600 mt-0.5 ml-1">Fecha de nacimiento inválida</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Phone size={14} className="text-gray-500" /> Teléfono</label>
          <input type="tel" value={form.telefono} onChange={e => handleChange('telefono', e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="0412..." inputMode="numeric" pattern="\d{11}" maxLength={11} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none ${errores.telefono ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="tel-national" />
          {errores.telefono && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.telefono}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Phone size={14} className="text-gray-500" /> Contac. emergencia</label>
          <input type="tel" value={form.contactoEmergencia} onChange={e => handleChange('contactoEmergencia', e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="0412..." inputMode="numeric" pattern="\d{11}" maxLength={11} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none ${errores.contactoEmergencia ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="off" />
          {errores.contactoEmergencia && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.contactoEmergencia}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Mail size={14} className="text-gray-500" /> Correo</label>
                   <input type="email" value={form.correo} onChange={e => !correoBloqueado && handleChange('correo', e.target.value.trim().toLowerCase())} placeholder="ejemplo@correo.com" disabled={correoBloqueado} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none ${errores.correo ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'} ${correoBloqueado ? 'opacity-60 cursor-not-allowed' : ''}`} required autoComplete="email" />
          {errores.correo && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.correo}</p>}
          {correoBloqueado && <p className="text-[10px] text-gray-500 mt-0.5 ml-1">Vinculado a tu cuenta</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Users size={14} className="text-gray-500" /> Sexo</label>
          <select value={form.sexo} onChange={e => handleChange('sexo', e.target.value)} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none ${errores.sexo ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="sex">
            <option value="" disabled>Seleccionar</option>
            {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errores.sexo && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.sexo}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><MapPin size={14} className="text-gray-500" /> Estado</label>
          <select value={ubicacion.estadoId} onChange={e => handleEstado(e.target.value)} disabled={estadosOpciones.length === 0} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none disabled:opacity-60 ${errores.estadoId || errores.estado ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="address-level1">
            <option value="" disabled>{estadosOpciones.length === 0 ? 'Cargando…' : 'Seleccionar'}</option>
            {estadosOpciones.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          {(errores.estadoId || errores.estado) && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.estadoId || errores.estado}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><MapPin size={14} className="text-gray-500" /> Municipio</label>
          <select value={ubicacion.municipioId} onChange={e => handleMunicipio(e.target.value)} disabled={!ubicacion.estadoId || municipiosOpciones.length === 0} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none disabled:opacity-60 ${errores.municipioId ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="address-level2">
            <option value="" disabled>{!ubicacion.estadoId ? 'Elige el estado' : 'Seleccionar'}</option>
            {municipiosOpciones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          {errores.municipioId && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.municipioId}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><MapPin size={14} className="text-gray-500" /> Ciudad</label>
          <select value={ubicacion.ciudadId} onChange={e => handleCiudad(e.target.value)} disabled={!ubicacion.municipioId || ciudadesOpciones.length === 0} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none disabled:opacity-60 ${errores.ciudadId ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="address-level3">
            <option value="" disabled>{!ubicacion.municipioId ? 'Elige el municipio' : 'Seleccionar'}</option>
            {ciudadesOpciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {errores.ciudadId && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.ciudadId}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><MapPin size={14} className="text-gray-500" /> Zona/Dirección</label>
          <input type="text" value={form.zona} onChange={e => handleChange('zona', e.target.value)} placeholder="Ej: Petare, calle 5" maxLength={100} className={`w-full bg-gray-50 border-2 rounded-xl py-2 px-3 text-sm outline-none ${errores.zona ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`} required autoComplete="street-address" />
          {errores.zona && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.zona}</p>}
        </div>
        {estados.length === 0 && (
          <p className="col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No pudimos cargar la geografía. Revisa tu conexión y recarga la página para continuar.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSalud}
        className={`w-full flex items-center justify-center gap-2 mt-3 py-3 border-2 rounded-xl text-sm font-medium transition-colors ${
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