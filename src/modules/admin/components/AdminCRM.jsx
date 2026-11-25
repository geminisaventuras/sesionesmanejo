// CRM minimo de interesados y conversaciones IA (FT-078 / T-148 / F-17.2).
// Solo admin: lectura, estados, notas y eliminacion a solicitud. Sin transcripcion del chat.
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, MessagesSquare, Trash2 } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import { ESTADOS_CRM, resumenInteresado } from '../../public/utils/crmHelpers';
import { resumenConversacion, resumenMensaje } from '../../public/utils/conversacionesHelpers';
import { actualizarInteresado, eliminarInteresado, listarInteresados } from '../../public/services/InteresadosCRMService';
import { eliminarConversacion, listarConversaciones, listarMensajes } from '../../public/services/ConversacionesIAService';

const ETIQUETAS = { nuevo: 'Nuevo', contactado: 'Contactado', convertido: 'Convertido', descartado: 'Descartado' };

function fechaLegible(valor) {
  const fecha = valor?.toDate ? valor.toDate() : valor ? new Date(valor) : null;
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleDateString('es-VE') : '—';
}

function fechaHoraLegible(valor) {
  const fecha = valor instanceof Date ? valor : valor?.toDate ? valor.toDate() : valor ? new Date(valor) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return 'Sin actividad';
  return `${fecha.toLocaleDateString('es-VE')} ${fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
}

function horaLegible(valor) {
  const fecha = valor instanceof Date ? valor : valor?.toDate ? valor.toDate() : valor ? new Date(valor) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminCRM() {
  const navigate = useNavigate();
  const { user, logoutUser, notifications } = useContext(AppContext);
  const [pestana, setPestana] = useState('interesados');
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [guardandoId, setGuardandoId] = useState(null);
  const [conversaciones, setConversaciones] = useState([]);
  const [cargandoConversaciones, setCargandoConversaciones] = useState(true);
  const [errorConversaciones, setErrorConversaciones] = useState('');
  const [abiertaId, setAbiertaId] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [errorMensajes, setErrorMensajes] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await listarInteresados();
      setItems(datos.map((item) => ({ ...resumenInteresado(item), fecha: item.fecha, expiraEn: item.expiraEn })));
    } catch {
      setError('No se pudo cargar la lista de interesados.');
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarConversaciones = useCallback(async () => {
    setCargandoConversaciones(true);
    setErrorConversaciones('');
    try {
      const datos = await listarConversaciones();
      setConversaciones(datos.map((item) => resumenConversacion(item)));
    } catch {
      setErrorConversaciones('No se pudo cargar la actividad del chat. Revisa las reglas de conversacionesIA.');
    } finally {
      setCargandoConversaciones(false);
    }
  }, []);

  useEffect(() => { cargar(); cargarConversaciones(); }, [cargar, cargarConversaciones]);

  const visibles = useMemo(
    () => (filtro === 'todos' ? items : items.filter((item) => item.estado === filtro)),
    [items, filtro],
  );

  const interesadosPorId = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const cambiar = (id, campo, valor) => {
    setItems((previos) => previos.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)));
  };

  const guardar = async (item) => {
    setGuardandoId(item.id);
    const resultado = await actualizarInteresado(item.id, { estado: item.estado, notas: item.notas });
    setGuardandoId(null);
    if (!resultado.ok) setError('No se pudo guardar el interesado.');
  };

  const eliminar = async (item) => {
    if (!window.confirm(`Eliminar definitivamente los datos de ${item.nombre}?`)) return;
    const resultado = await eliminarInteresado(item.id);
    if (!resultado.ok) { setError('No se pudo eliminar el interesado.'); return; }
    setItems((previos) => previos.filter((fila) => fila.id !== item.id));
    const eraAbierta = conversaciones.some((fila) => fila.id === abiertaId && fila.interesadoId === item.id);
    if (eraAbierta) {
      setAbiertaId(null);
      setMensajes([]);
    }
    setConversaciones((previas) => previas.filter((fila) => fila.interesadoId !== item.id));
  };

  const eliminarConversacionAdmin = async (conversacion) => {
    if (!window.confirm('Eliminar la conversacion y sus mensajes? No se puede deshacer.')) return;
    const resultado = await eliminarConversacion(conversacion.id);
    if (!resultado.ok) { setErrorConversaciones('No se pudo eliminar la conversacion.'); return; }
    setConversaciones((previas) => previas.filter((fila) => fila.id !== conversacion.id));
    if (abiertaId === conversacion.id) {
      setAbiertaId(null);
      setMensajes([]);
    }
  };

  const verConversacion = async (conversacion) => {
    if (abiertaId === conversacion.id) {
      setAbiertaId(null);
      setMensajes([]);
      return;
    }
    setAbiertaId(conversacion.id);
    setMensajes([]);
    setErrorMensajes('');
    setCargandoMensajes(true);
    try {
      const datos = await listarMensajes(conversacion.id);
      setMensajes(datos.map((item) => resumenMensaje(item)));
    } catch {
      setErrorMensajes('No se pudo leer la conversacion. Revisa las reglas de mensajes.');
    } finally {
      setCargandoMensajes(false);
    }
  };

  const header = (
    <DashboardHeader
      title="Interesados (CRM)"
      onBack={() => navigate('/admin/config')}
      onLogout={async () => { if (logoutUser) await logoutUser(); navigate('/'); }}
      notifications={notifications}
    />
  );

  return (
    <AppShell header={header} bgColor="bg-gray-50" maxWidth="max-w-md min-[540px]:max-w-3xl lg:max-w-5xl">
      <div className="space-y-4 p-3 md:p-5">
        <div className="flex gap-2 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setPestana('interesados')}
            aria-pressed={pestana === 'interesados'}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-black ${pestana === 'interesados' ? 'bg-slate-900 text-white' : 'text-gray-600'}`}
          >
            Interesados ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setPestana('conversaciones')}
            aria-pressed={pestana === 'conversaciones'}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-black ${pestana === 'conversaciones' ? 'bg-slate-900 text-white' : 'text-gray-600'}`}
          >
            Conversaciones IA ({conversaciones.length})
          </button>
        </div>

        {pestana === 'conversaciones' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-white p-4">
              <MessagesSquare size={22} className="mt-0.5 text-sky-600" />
              <div>
                <h2 className="text-sm font-black text-gray-900">Quien hablo con la IA</h2>
                <p className="text-xs text-gray-600">
                  Actividad y transcripcion para auditar las respuestas. Solo admin; retencion 12 meses.
                </p>
              </div>
            </div>

            {errorConversaciones && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{errorConversaciones}</p>
            )}
            {cargandoConversaciones && <p className="text-sm text-gray-500">Cargando conversaciones...</p>}
            {!cargandoConversaciones && conversaciones.length === 0 && !errorConversaciones && (
              <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                Todavia no hay conversaciones con la IA.
              </p>
            )}

            {conversaciones.map((conversacion) => {
              const persona = interesadosPorId.get(conversacion.interesadoId);
              return (
                <article key={conversacion.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-gray-900">
                        {persona ? persona.nombre : 'Datos eliminados'}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {persona ? persona.telefono : 'El interesado ya no esta en el CRM'}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {conversacion.turnos} {conversacion.turnos === 1 ? 'respuesta' : 'respuestas'} · ultimo turno {fechaHoraLegible(conversacion.ultimoMensajeEn)}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Inicio {fechaHoraLegible(conversacion.inicioEn)} · {conversacion.pagina || conversacion.origen || '/'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarConversacionAdmin(conversacion)}
                      aria-label="Eliminar registro de conversacion"
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">Canal: {conversacion.canal}</span>
                    {conversacion.derivacionWhatsapp && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Derivo a WhatsApp</span>
                    )}
                    {!persona && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Sin datos personales</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => verConversacion(conversacion)}
                      aria-expanded={abiertaId === conversacion.id}
                      className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-bold text-slate-700 hover:border-slate-500"
                    >
                      {abiertaId === conversacion.id ? 'Ocultar conversacion' : 'Ver conversacion'}
                    </button>
                    <span className="text-[10px] text-gray-400">Transcripcion solo admin</span>
                  </div>

                  {abiertaId === conversacion.id && (
                    <div className="mt-2 max-h-[360px] space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
                      {cargandoMensajes && <p className="text-xs font-semibold text-slate-500">Cargando mensajes...</p>}
                      {errorMensajes && <p className="text-xs font-semibold text-red-600">{errorMensajes}</p>}
                      {!cargandoMensajes && !errorMensajes && mensajes.length === 0 && (
                        <p className="text-xs text-slate-500">Sin mensajes guardados. Solo se registran desde la version con auditoria.</p>
                      )}
                      {mensajes.map((mensaje) => (
                        <div
                          key={mensaje.id}
                          className={
                            mensaje.rol === 'usuario'
                              ? 'ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-sm bg-slate-900 px-3 py-2 text-xs text-white'
                              : 'w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs text-slate-800 shadow-sm ring-1 ring-slate-200'
                          }
                        >
                          <p className="whitespace-pre-wrap break-words">{mensaje.texto}</p>
                          <p className="mt-1 text-[9px] font-semibold opacity-60">
                            {mensaje.rol === 'usuario' ? 'Persona' : 'IA'}
                            {mensaje.fuente ? ` · ${mensaje.fuente}` : ''}
                            {mensaje.kbVersion ? ` · kb ${mensaje.kbVersion.slice(0, 8)}` : ''}
                            {mensaje.creadoEn ? ` · ${horaLegible(mensaje.creadoEn)}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-white p-4">
              <Megaphone size={22} className="mt-0.5 text-indigo-500" />
              <div>
                <h2 className="text-sm font-black text-gray-900">Contactos con consentimiento</h2>
                <p className="text-xs text-gray-600">
                  Solo personas que autorizaron ser contactadas. Retencion: 12 meses. No se crean cuentas ni reservas.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['todos', ...ESTADOS_CRM].map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setFiltro(opcion)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${filtro === opcion ? 'bg-slate-900 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
                >
                  {opcion === 'todos' ? 'Todos' : ETIQUETAS[opcion]}
                </button>
              ))}
            </div>

            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
            {cargando && <p className="text-sm text-gray-500">Cargando interesados...</p>}
            {!cargando && visibles.length === 0 && (
              <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                No hay interesados en este filtro.
              </p>
            )}

            <div className="space-y-3">
              {visibles.map((item) => (
                <article key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-gray-900">{item.nombre}</h3>
                      <p className="text-xs text-gray-600">{item.telefono}{item.correo ? ` · ${item.correo}` : ''}</p>
                      <p className="text-[11px] text-gray-500">
                        {item.interes || 'Sin interes indicado'} · {item.canal} · {fechaLegible(item.fecha)}
                      </p>
                      <p className="text-[11px] text-gray-400">Origen: {item.origen || '/'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminar(item)}
                      aria-label={`Eliminar interesado ${item.nombre}`}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                    <select
                      value={item.estado}
                      onChange={(evento) => cambiar(item.id, 'estado', evento.target.value)}
                      aria-label={`Estado de ${item.nombre}`}
                      className="rounded-xl border border-gray-300 px-2 py-2 text-xs"
                    >
                      {ESTADOS_CRM.map((estado) => <option key={estado} value={estado}>{ETIQUETAS[estado]}</option>)}
                    </select>
                    <input
                      value={item.notas}
                      onChange={(evento) => cambiar(item.id, 'notas', evento.target.value)}
                      placeholder="Nota de seguimiento"
                      maxLength={500}
                      aria-label={`Notas de ${item.nombre}`}
                      className="rounded-xl border border-gray-300 px-2 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => guardar(item)}
                      disabled={guardandoId === item.id}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {guardandoId === item.id ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Consentimiento registrado</span>
                    <span className={`rounded-full px-2 py-0.5 ${item.vencido ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {item.vencido ? 'Retencion vencida: eliminar' : 'Retencion vigente (12 meses)'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
