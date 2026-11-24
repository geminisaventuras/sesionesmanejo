// @build: 2026-11-24 | id: FORM-SEDE-GEOGRAFIA | desc: Sede con jerarquía estado→municipio→ciudad, zona, dirección y GPS opcional.
import { useState, memo, useContext, useMemo } from 'react';
import { Button, Input, Select } from '../../../components/UI';
import { ChevronLeft, CheckSquare } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { requiereZona, urlMapaSede, validarCoordenadas, validarSedeGeografia } from '../../shared/utils/geografiaHelpers';
import SelectorUbicacionMapa from '../components/SelectorUbicacionMapa';

const porNombre = (a, b) => String(a?.nombre || a?.id || '').localeCompare(String(b?.nombre || b?.id || ''), 'es');

const FormSede = memo(({ item, onSave, onCancel }) => {
  const ctx = useContext(AppContext);

  const horariosDisponibles = useMemo(() => {
    return (ctx?.horarios || [])
      .filter(h => h.activo)
      .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  }, [ctx?.horarios]);

  const estados = useMemo(() => (ctx?.estados || []).filter(e => e.activo !== false).sort(porNombre), [ctx?.estados]);
  const municipios = useMemo(() => (ctx?.municipios || []).filter(m => m.activo !== false).sort(porNombre), [ctx?.municipios]);
  const ciudades = useMemo(() => (ctx?.ciudades || []).filter(c => c.activo !== false).sort(porNombre), [ctx?.ciudades]);

  const formInicial = useMemo(() => {
    if (!item?.id) {
      return {
        nombre: '', zona: '', direccion: '', recargo: 0, horariosHabilitados: [],
        activo: true, estadoId: '', municipioId: '', ciudadId: '', lat: '', lng: '',
      };
    }

    const ciudad = (ctx?.ciudades || []).find(c => String(c.id) === String(item.ciudadId));
    const municipio = (ctx?.municipios || []).find(m => String(m.id) === String(ciudad?.municipioId));
    const estado = (ctx?.estados || []).find(e => String(e.id) === String(municipio?.estadoId));

    return {
      ...item,
      activo: item.activo !== false,
      estadoId: estado?.id || '',
      municipioId: municipio?.id || ciudad?.municipioId || '',
      ciudadId: item.ciudadId || ciudad?.id || '',
      lat: item.coordenadas?.lat ?? '',
      lng: item.coordenadas?.lng ?? '',
      horariosHabilitados: Array.isArray(item.horariosHabilitados) ? item.horariosHabilitados : [],
    };
  }, [item, ctx?.ciudades, ctx?.municipios, ctx?.estados]);

  const [form, setForm] = useState(formInicial);
  const [error, setError] = useState('');

  const municipiosFiltrados = useMemo(() => (
    form.estadoId
      ? municipios.filter(m => String(m.estadoId) === String(form.estadoId))
      : []
  ), [municipios, form.estadoId]);

  const ciudadesFiltradas = useMemo(() => (
    form.municipioId
      ? ciudades.filter(c => String(c.municipioId) === String(form.municipioId))
      : []
  ), [ciudades, form.municipioId]);

  const sedeConCiudad = { id: item?.id, ciudadId: form.ciudadId };
  const zonaObligatoria = requiereZona(sedeConCiudad, ctx?.sedes || []);

  const catalogosFormulario = useMemo(() => ({
    estados: ctx?.estados || [],
    municipios: ctx?.municipios || [],
    ciudades: ctx?.ciudades || [],
  }), [ctx?.estados, ctx?.municipios, ctx?.ciudades]);

  const coordenadasFormulario = useMemo(
    () => validarCoordenadas({ lat: form.lat, lng: form.lng }),
    [form.lat, form.lng]
  );

  const urlMapa = useMemo(() => {
    if (!coordenadasFormulario.ok || !coordenadasFormulario.coordenadas) return '';
    return urlMapaSede({ ...form, coordenadas: coordenadasFormulario.coordenadas }, catalogosFormulario);
  }, [form, coordenadasFormulario, catalogosFormulario]);

  const centroMapa = useMemo(() => {
    if (coordenadasFormulario.coordenadas) {
      return [coordenadasFormulario.coordenadas.lat, coordenadasFormulario.coordenadas.lng];
    }

    const ciudadSeleccionada = catalogosFormulario.ciudades.find(c => String(c.id) === String(form.ciudadId));
    const coordenadasCiudad = validarCoordenadas(ciudadSeleccionada?.coordenadas);
    if (coordenadasCiudad.ok && coordenadasCiudad.coordenadas) {
      return [coordenadasCiudad.coordenadas.lat, coordenadasCiudad.coordenadas.lng];
    }

    const sedeCiudad = (ctx?.sedes || []).find(s => (
      String(s.ciudadId) === String(form.ciudadId) && validarCoordenadas(s.coordenadas).coordenadas
    ));
    if (sedeCiudad) {
      return [sedeCiudad.coordenadas.lat, sedeCiudad.coordenadas.lng];
    }

    return null;
  }, [coordenadasFormulario, form.ciudadId, catalogosFormulario.ciudades, ctx?.sedes]);

  const toggleHorario = (horaId) => setForm(prev => ({
    ...prev,
    horariosHabilitados: prev.horariosHabilitados.includes(horaId)
      ? prev.horariosHabilitados.filter(id => id !== horaId)
      : [...prev.horariosHabilitados, horaId]
  }));

  const todosSeleccionados = horariosDisponibles.length > 0
    && horariosDisponibles.every(h => form.horariosHabilitados.includes(h.id));

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setForm(prev => ({ ...prev, horariosHabilitados: [] }));
    } else {
      setForm(prev => ({ ...prev, horariosHabilitados: horariosDisponibles.map(h => h.id) }));
    }
  };

  const cambiarEstado = (e) => {
    setError('');
    setForm(prev => ({ ...prev, estadoId: e.target.value, municipioId: '', ciudadId: '' }));
  };

  const cambiarMunicipio = (e) => {
    setError('');
    setForm(prev => ({ ...prev, municipioId: e.target.value, ciudadId: '' }));
  };

  const handleSave = () => {
    const coords = validarCoordenadas({ lat: form.lat, lng: form.lng });
    if (!coords.ok) {
      setError(coords.error);
      return;
    }

    const { estadoId, municipioId, lat, lng, coordenadas: _coords, ...resto } = form;
    const datos = {
      ...resto,
      nombre: String(form.nombre || '').trim(),
      zona: String(form.zona || '').trim(),
      direccion: String(form.direccion || '').trim(),
      recargo: Math.max(0, Number(form.recargo) || 0),
      ciudadId: form.ciudadId,
      activo: form.activo !== false,
    };
    if (coords.coordenadas) datos.coordenadas = coords.coordenadas;
    else delete datos.coordenadas;

    const validacion = validarSedeGeografia({
      sede: { ...datos, coordenadas: coords.coordenadas },
      sedes: ctx?.sedes || [],
      catalogos: { estados: ctx?.estados || [], municipios: ctx?.municipios || [], ciudades: ctx?.ciudades || [] },
    });
    if (!validacion.ok) {
      setError(validacion.errores[0]);
      return;
    }

    setError('');
    onSave(datos);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button>
        <h3 className="font-bold text-lg">{item.id ? 'Editar' : 'Nueva'} Sede</h3>
      </div>

      <Input label="Nombre de la Sede" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />

      <Select label="Estado" value={form.estadoId} onChange={cambiarEstado} options={estados} />
      <Select
        label="Municipio"
        value={form.municipioId}
        onChange={cambiarMunicipio}
        options={municipiosFiltrados}
        disabled={!form.estadoId}
        helperText={!form.estadoId ? 'Selecciona primero el estado.' : undefined}
      />
      <Select
        label="Ciudad"
        value={form.ciudadId}
        onChange={e => { setError(''); setForm({ ...form, ciudadId: e.target.value }); }}
        options={ciudadesFiltradas}
        disabled={!form.municipioId}
        helperText={!form.municipioId ? 'Selecciona primero el municipio.' : undefined}
      />

      <Input
        label={`Zona / Punto de Encuentro${zonaObligatoria ? ' (obligatoria)' : ''}`}
        value={form.zona}
        onChange={e => setForm({ ...form, zona: e.target.value })}
        helperText={zonaObligatoria ? 'Esta ciudad ya tiene otra sede: la zona es obligatoria.' : 'Ej: Ciudad Universitaria, Montalbán.'}
      />
      <Input label="Dirección exacta" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />

      <SelectorUbicacionMapa
        latitud={form.lat}
        longitud={form.lng}
        centro={centroMapa}
        onChange={(punto) => setForm(prev => ({
          ...prev,
          lat: punto ? punto.lat : '',
          lng: punto ? punto.lng : '',
        }))}
      />
      {urlMapa && (
        <a
          href={urlMapa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-bold text-blue-600 underline"
        >
          Abrir en el mapa
        </a>
      )}

      <div>
        <Input label="Recargo por sesión (USD)" type="number" min="0" step="0.01" value={form.recargo ?? 0} onChange={e => setForm({ ...form, recargo: e.target.value })} />
        <p className="text-[11px] text-gray-500 mt-1 ml-1">Se suma por cada sesión agendada en esta sede. Usa 0 si no tiene recargo.</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-gray-700">Horarios habilitados</label>
          <button
            type="button"
            onClick={toggleTodos}
            disabled={horariosDisponibles.length === 0}
            className="text-xs font-bold text-blue-600 flex items-center gap-1 disabled:opacity-40"
          >
            <CheckSquare size={14} />
            {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        </div>

        {horariosDisponibles.length === 0 ? (
          <p className="text-xs text-gray-500">No hay horarios activos.</p>
        ) : (
          <div className="space-y-2">
            {horariosDisponibles.map(h => (
              <label key={h.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.horariosHabilitados.includes(h.id)}
                  onChange={() => toggleHorario(h.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  <span className="font-mono text-xs text-gray-500">{h.id}</span>
                  <span className="ml-2">{h.label || '?'}</span>
                  {h.isLunch && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase">Almuerzo</span>}
                </span>
              </label>
            ))}
          </div>
        )}

        {form.horariosHabilitados.length === 0 && horariosDisponibles.length > 0 && (
          <p className="text-[11px] text-yellow-700 mt-2">Sin horarios seleccionados: se asumiran todos por defecto.</p>
        )}
      </div>

      {error && <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

      <Button type="button" onClick={handleSave} variant="dark">
        Guardar Sede
      </Button>
    </div>
  );
});

export default FormSede;
