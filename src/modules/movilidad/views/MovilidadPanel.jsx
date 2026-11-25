// @build: 2026-11-24 | id: MOVILIDAD-PANEL-1 | desc: Panel del prestador de movilidad y asignación/roster para admin (FT-058).
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import { MovilidadService } from '../../inscripcion/services/MovilidadService';
import { MOVILIDAD_ETIQUETAS } from '../../inscripcion/utils/movilidadHelpers';
import { MapPin, Phone, RefreshCw, Plus, Check, X, Bell } from 'lucide-react';

const formatoFecha = (fecha) => {
  if (!fecha) return 'Sin fecha';
  const d = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const urlMapa = (pin) => (
  pin && Number.isFinite(Number(pin.lat)) && Number.isFinite(Number(pin.lng))
    ? `https://www.google.com/maps/search/?api=1&query=${Number(pin.lat)},${Number(pin.lng)}`
    : null
);

const ACCIONES = {
  asignada: [{ estado: 'en_camino', label: 'Salir a buscar' }],
  en_camino: [{ estado: 'recogido', label: 'Recogido' }, { estado: 'no_presentado', label: 'No presentado' }],
  recogido: [{ estado: 'en_sesion', label: 'En sesión' }],
  en_sesion: [{ estado: 'retorno', label: 'Retorno' }],
  retorno: [{ estado: 'completada', label: 'Completada' }],
};

export default function MovilidadPanel({ embebido = false }) {
  const { user, config, createStaffUser, notifications = [] } = useContext(AppContext);
  const { showToast } = useToast();
  const esAdmin = user?.role === 'admin';
  const rutaVolver = esAdmin
    ? '/dashboard'
    : user?.role === 'instructor'
      ? '/instructor'
      : user?.role === 'proveedor'
        ? '/proveedor'
        : '/';
  const movilidadCfg = config?.movilidad || {};
  const [solicitudes, setSolicitudes] = useState([]);
  const [prestadores, setPrestadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('solicitudes');
  const [asignacion, setAsignacion] = useState({});
  const [mostrarFormPrestador, setMostrarFormPrestador] = useState(true);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [resultadosUsuario, setResultadosUsuario] = useState([]);
  const [buscandoUsuario, setBuscandoUsuario] = useState(false);
  const [personaSeleccionada, setPersonaSeleccionada] = useState(null);
  const [modoAlta, setModoAlta] = useState('existente');
  const [formPrestador, setFormPrestador] = useState({
    uid: '', nombre: '', email: '', password: '', telefono: '', licenciaNumero: '', licenciaVence: '', activo: true,
  });

  const cargar = useCallback(async () => {
    if (!user?.uid) return;
    setCargando(true);
    try {
      if (esAdmin) {
        const [sols, provs] = await Promise.all([
          MovilidadService.listarTodas(),
          MovilidadService.listarPrestadores(),
        ]);
        setSolicitudes(sols);
        setPrestadores(provs);
      } else {
        const sols = await MovilidadService.listarPorPrestador(user.uid);
        setSolicitudes(sols);
      }
    } catch {
      showToast?.('No pudimos cargar las solicitudes de movilidad.', 'error');
    } finally {
      setCargando(false);
    }
  }, [user?.uid, esAdmin, showToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const prestadoresActivos = useMemo(
    () => prestadores.filter((p) => p.activo !== false),
    [prestadores]
  );

  const cambiarEstado = async (solicitud, estado) => {
    const res = await MovilidadService.actualizarEstado(solicitud.id, estado);
    if (res.success) {
      showToast?.(`Solicitud marcada como ${MOVILIDAD_ETIQUETAS[estado] || estado}.`, 'success');
      cargar();
    } else {
      showToast?.(res.error?.code === 'transicion-invalida' ? 'Ese cambio de estado no es válido.' : 'No pudimos actualizar la solicitud.', 'error');
    }
  };

  const confirmarPago = async (solicitud) => {
    const res = await MovilidadService.confirmarPagoDirecto(solicitud.id);
    if (res.success) {
      showToast?.('Cobro directo confirmado.', 'success');
      cargar();
    } else {
      showToast?.('No pudimos confirmar el cobro.', 'error');
    }
  };

  const asignar = async (solicitud) => {
    const prestadorId = asignacion[solicitud.id];
    if (!prestadorId) return;
    const res = await MovilidadService.asignarPrestador(solicitud.id, prestadorId);
    if (res.success) {
      showToast?.('Prestador asignado.', 'success');
      cargar();
    } else {
      showToast?.('No pudimos asignar el prestador.', 'error');
    }
  };

  const guardarPrestador = async (e) => {
    e.preventDefault();

    if (modoAlta === 'nuevo') {
      const nombre = formPrestador.nombre.trim();
      const email = formPrestador.email.trim();
      const password = formPrestador.password;
      if (!nombre || !email || !password) {
        showToast?.('Completa nombre, correo y contraseña para crear la cuenta.', 'error');
        return;
      }
      if (password.length < 6) {
        showToast?.('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
      }
      if (typeof createStaffUser !== 'function') {
        showToast?.('La creación de usuarios no está disponible en este contexto.', 'error');
        return;
      }
      const res = await createStaffUser(email, password, 'movilidad', {
        nombre,
        telefono: formPrestador.telefono.trim(),
        licenciaNumero: formPrestador.licenciaNumero.trim(),
        licenciaVence: formPrestador.licenciaVence,
        zonas: [],
        activo: formPrestador.activo === true,
      });
      if (res.success) {
        showToast?.('Prestador creado. Ya puede iniciar sesión con su correo y contraseña.', 'success');
        setFormPrestador({ uid: '', nombre: '', email: '', password: '', telefono: '', licenciaNumero: '', licenciaVence: '', activo: true });
        setPersonaSeleccionada(null);
        setBusquedaUsuario('');
        setResultadosUsuario([]);
        cargar();
      } else {
        showToast?.(`No pudimos crear el prestador: ${res.error?.message || 'revisa el correo y la conexión'}.`, 'error');
      }
      return;
    }

    if (!formPrestador.uid.trim()) {
      showToast?.('Selecciona la persona con la búsqueda por nombre o cédula.', 'error');
      return;
    }
    const res = await MovilidadService.guardarPrestador(formPrestador);
    if (res.success) {
      showToast?.('Prestador guardado. Debe cerrar y abrir sesión para entrar al panel.', 'success');
      setFormPrestador({ uid: '', nombre: '', email: '', password: '', telefono: '', licenciaNumero: '', licenciaVence: '', activo: true });
      setPersonaSeleccionada(null);
      setBusquedaUsuario('');
      setResultadosUsuario([]);
      cargar();
    } else {
      showToast?.('No pudimos guardar el prestador.', 'error');
    }
  };

  const buscarPersona = async () => {
    if (busquedaUsuario.trim().length < 2) {
      showToast?.('Escribe al menos 2 caracteres (nombre, cédula o correo).', 'error');
      return;
    }
    setBuscandoUsuario(true);
    try {
      setResultadosUsuario(await MovilidadService.buscarPrestadoresPotenciales(busquedaUsuario));
    } catch {
      showToast?.('No pudimos buscar personas. Revisa tu conexión.', 'error');
    } finally {
      setBuscandoUsuario(false);
    }
  };

  const seleccionarPersona = (u) => {
    const nombre = `${u.nombre || ''} ${u.apellido || ''}`.trim();
    setPersonaSeleccionada(u);
    setFormPrestador((prev) => ({
      ...prev,
      uid: u.id,
      nombre,
      telefono: u.telefono || prev.telefono,
    }));
    setResultadosUsuario([]);
  };

  const limpiarPersona = () => {
    setPersonaSeleccionada(null);
    setFormPrestador((prev) => ({ ...prev, uid: '', nombre: '' }));
  };

  return (
    <div className={embebido ? '' : 'min-h-screen bg-gray-50'}>
      {!embebido && (
        <header className="bg-slate-900 text-white">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-300 font-bold">Moto App</p>
              <h1 className="text-lg font-black">Movilidad</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/notificaciones" className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20" aria-label="Notificaciones">
                <Bell size={18} />
                {notifications.filter((n) => !n.leida).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {notifications.filter((n) => !n.leida).length > 9 ? '9+' : notifications.filter((n) => !n.leida).length}
                  </span>
                )}
              </Link>
              <button onClick={cargar} className="p-2 rounded-lg bg-white/10 hover:bg-white/20" aria-label="Actualizar">
                <RefreshCw size={18} />
              </button>
              <Link to={rutaVolver} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold">
                Volver
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className={embebido ? 'space-y-4' : 'max-w-3xl mx-auto px-4 py-5 space-y-4'}>
        {embebido && (
          <div className="flex justify-end">
            <button onClick={cargar} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700" aria-label="Actualizar">
              <RefreshCw size={14} /> Actualizar
            </button>
          </div>
        )}

        {esAdmin && movilidadCfg.activo !== true && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-black text-amber-900">El servicio de movilidad está inactivo</p>
            <p className="text-amber-800 mt-1">
              Actívalo y define la tarifa en Configuración → Movilidad. Sin eso, la opción no aparece en el paso 2.
            </p>
            <Link to="/admin/config/movilidad" className="inline-block mt-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-black">
              Ir a Configuración → Movilidad
            </Link>
          </div>
        )}

        {esAdmin && movilidadCfg.activo === true && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 font-bold">
            {movilidadCfg.modalidad === 'porKm'
              ? `Tarifa por km: $${Number(movilidadCfg.precioPorKmUSD || 0).toFixed(2)} · estándar ${Number(movilidadCfg.kmEstandar || 0)} km · tope ${Number(movilidadCfg.kmTope || 0)} km`
              : `Tarifa plana: $${Number(movilidadCfg.tarifaPlanaUSD || 0).toFixed(2)} por viaje`}
            <span className="block font-normal mt-0.5">Pago directo al prestador; no se suma al pago del curso.</span>
          </div>
        )}

        {esAdmin && (
          <div className="flex gap-2">
            {['solicitudes', 'prestadores'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${tab === t ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                {t === 'solicitudes' ? 'Solicitudes' : 'Prestadores'}
              </button>
            ))}
          </div>
        )}

        {cargando && <p className="text-sm font-bold text-gray-500">Cargando…</p>}

        {!cargando && tab === 'solicitudes' && (
          <div className="space-y-3">
            {solicitudes.length === 0 && (
              <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-4">
                <p>No hay solicitudes {esAdmin ? 'registradas' : 'asignadas'} por ahora.</p>
                {esAdmin && (
                  <button
                    type="button"
                    onClick={() => { setTab('prestadores'); setMostrarFormPrestador(true); }}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-black"
                  >
                    <Plus size={14} /> Registrar un prestador
                  </button>
                )}
              </div>
            )}

            {solicitudes.map((s) => {
              const mapa = urlMapa(s.pin);
              const puedeCobrar = !s.pagoDirecto?.confirmado && ['en_sesion', 'retorno', 'completada'].includes(s.estado);
              return (
                <article key={s.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-gray-900">{s.nombreEstudiante || 'Estudiante'}</p>
                      <p className="text-xs text-gray-500">{formatoFecha(s.fechaSesion)} · Sede {s.sedeId}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[11px] font-black ${s.estado === 'completada' ? 'bg-emerald-50 text-emerald-700' : s.estado === 'cancelada' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-800'}`}>
                      {MOVILIDAD_ETIQUETAS[s.estado] || s.estado}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700">{Number(s.distanciaKm || 0).toFixed(1)} km</span>
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700">${Number(s.montoUSD || 0).toFixed(2)}</span>
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700">Bs {Number(s.montoVES || 0).toFixed(2)}</span>
                    {s.pagoDirecto?.confirmado && <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">Cobro confirmado</span>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {mapa && (
                      <a href={mapa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold">
                        <MapPin size={14} /> Ubicación
                      </a>
                    )}
                    {s.telefonoEstudiante && (
                      <a href={`tel:${s.telefonoEstudiante}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-xs font-bold">
                        <Phone size={14} /> Llamar
                      </a>
                    )}
                    {esAdmin && s.codigoRecogida && (
                      <span className="px-3 py-2 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold">
                        Código: {s.codigoRecogida}
                      </span>
                    )}
                  </div>

                  {s.direccion && <p className="text-xs text-gray-600">Referencia: {s.direccion}</p>}

                  {esAdmin && s.estado === 'solicitada' && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        value={asignacion[s.id] || ''}
                        onChange={(e) => setAsignacion((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        className="flex-1 min-w-[180px] bg-gray-50 border-2 border-gray-200 rounded-xl py-2 px-3 text-sm"
                      >
                        <option value="">Asignar prestador…</option>
                        {prestadoresActivos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre || p.id}{p.licenciaNumero ? '' : ' — sin licencia'}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => asignar(s)}
                        disabled={!asignacion[s.id]}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-40"
                      >
                        Asignar
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {(ACCIONES[s.estado] || []).map((a) => (
                      <button
                        key={a.estado}
                        onClick={() => cambiarEstado(s, a.estado)}
                        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-800 text-xs font-black hover:bg-blue-100"
                      >
                        {a.label}
                      </button>
                    ))}
                    {puedeCobrar && (
                      <button
                        onClick={() => confirmarPago(s)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black"
                      >
                        <Check size={14} /> Confirmar cobro directo
                      </button>
                    )}
                    {['solicitada', 'asignada', 'en_camino'].includes(s.estado) && (
                      <button
                        onClick={() => cambiarEstado(s, 'cancelada')}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-bold"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!cargando && esAdmin && tab === 'prestadores' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-gray-900">Prestadores de movilidad</h2>
              <button
                type="button"
                onClick={() => setMostrarFormPrestador((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black"
              >
                <Plus size={14} /> {mostrarFormPrestador ? 'Ocultar alta' : 'Nuevo prestador'}
              </button>
            </div>

            {mostrarFormPrestador && (
              <form onSubmit={guardarPrestador} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Tipo de alta">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={modoAlta === 'existente'}
                    onClick={() => setModoAlta('existente')}
                    className={`rounded-xl border-2 px-3 py-2 text-xs font-black ${modoAlta === 'existente' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600'}`}
                  >
                    Staff existente
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={modoAlta === 'nuevo'}
                    onClick={() => setModoAlta('nuevo')}
                    className={`rounded-xl border-2 px-3 py-2 text-xs font-black ${modoAlta === 'nuevo' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600'}`}
                  >
                    Persona nueva
                  </button>
                </div>

                {modoAlta === 'existente' && (
                  <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">1. Busca un proveedor o tutor</label>
                  <div className="flex gap-2">
                    <input
                      value={busquedaUsuario}
                      onChange={(e) => setBusquedaUsuario(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarPersona(); } }}
                      placeholder="Nombre, cédula o correo"
                      className="flex-1 min-w-0 bg-gray-50 border-2 border-gray-200 rounded-xl py-2 px-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={buscarPersona}
                      disabled={buscandoUsuario}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-black disabled:opacity-50"
                    >
                      {buscandoUsuario ? 'Buscando…' : 'Buscar'}
                    </button>
                  </div>

                  {resultadosUsuario.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                      {resultadosUsuario.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => seleccionarPersona(u)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50"
                        >
                          <span className="block text-sm font-bold text-gray-900">{u.nombre || 'Sin nombre'} {u.apellido || ''}</span>
                          <span className="block text-[11px] text-gray-500">
                            {u.cedula ? `Cédula ${u.cedula} · ` : ''}{u.correo || u.email || 'sin correo'}{u.tipo ? ` · ${u.tipo}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!buscandoUsuario && busquedaUsuario.trim().length >= 2 && resultadosUsuario.length === 0 && (
                    <p className="text-[11px] text-gray-500 mt-1">Sin coincidencias. Prueba con la cédula o el correo.</p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-1">
                    Solo proveedores y tutores registrados. Si no aparece, usa el UID manual.
                  </p>
                </div>

                {personaSeleccionada ? (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                    <p className="text-sm font-black text-blue-900">
                      {personaSeleccionada.nombre} {personaSeleccionada.apellido}
                    </p>
                    <p className="text-[11px] text-blue-800">
                      {personaSeleccionada.cedula ? `Cédula ${personaSeleccionada.cedula} · ` : ''}
                      {personaSeleccionada.correo || personaSeleccionada.email || ''}
                      {personaSeleccionada.tipo ? ` · ${personaSeleccionada.tipo}` : ''}
                    </p>
                    <button type="button" onClick={limpiarPersona} className="mt-2 text-xs font-black text-blue-700 underline">
                      Cambiar persona
                    </button>
                  </div>
                ) : (
                  <details className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <summary className="text-xs font-bold text-gray-600 cursor-pointer">Pegar UID manualmente (avanzado)</summary>
                    <input
                      value={formPrestador.uid}
                      onChange={(e) => setFormPrestador({ ...formPrestador, uid: e.target.value })}
                      placeholder="UID del usuario"
                      className="mt-2 w-full bg-white border-2 border-gray-200 rounded-xl py-2 px-3 text-sm"
                    />
                  </details>
                )}
                  </div>
                )}

                {modoAlta === 'nuevo' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-gray-600">
                      Nombre completo
                      <input
                        value={formPrestador.nombre}
                        onChange={(e) => setFormPrestador({ ...formPrestador, nombre: e.target.value })}
                        placeholder="Nombre y apellido"
                        className="mt-1 w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-2 px-3 text-sm"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-600">
                      Correo de acceso
                      <input
                        type="email"
                        autoComplete="off"
                        value={formPrestador.email}
                        onChange={(e) => setFormPrestador({ ...formPrestador, email: e.target.value })}
                        placeholder="correo@ejemplo.com"
                        className="mt-1 w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-2 px-3 text-sm"
                      />
                    </label>
                    <label className="text-xs font-bold text-gray-600">
                      Contraseña inicial
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={formPrestador.password}
                        onChange={(e) => setFormPrestador({ ...formPrestador, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        className="mt-1 w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-2 px-3 text-sm"
                      />
                    </label>
                    <p className="sm:col-span-2 text-[11px] text-gray-500">
                      Se crea una cuenta nueva con rol movilidad y su ficha en el roster. Comparte la contraseña por un canal seguro; no se guarda en Firestore.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-gray-600">
                    Teléfono
                    <input
                      value={formPrestador.telefono}
                      onChange={(e) => setFormPrestador({ ...formPrestador, telefono: e.target.value })}
                      placeholder="0414…"
                      className="mt-1 w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-2 px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs font-bold text-gray-600">
                    Licencia de conducir (número)
                    <input
                      value={formPrestador.licenciaNumero}
                      onChange={(e) => setFormPrestador({ ...formPrestador, licenciaNumero: e.target.value })}
                      placeholder="Opcional por ahora"
                      className="mt-1 w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-2 px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs font-bold text-gray-600">
                    Vence la licencia
                    <input
                      type="date"
                      value={formPrestador.licenciaVence}
                      onChange={(e) => setFormPrestador({ ...formPrestador, licenciaVence: e.target.value })}
                      className="mt-1 w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-2 px-3 text-sm"
                    />
                  </label>
                </div>

                <p className="text-[11px] text-gray-500">
                  La licencia es un requisito legal: si no la tienes a mano, déjala vacía y complétala antes de asignar servicios.
                </p>

                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={formPrestador.activo}
                    onChange={(e) => setFormPrestador({ ...formPrestador, activo: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  Activo
                </label>

                <button type="submit" className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-black">
                  {modoAlta === 'nuevo' ? 'Crear prestador' : 'Guardar prestador'}
                </button>
              </form>
            )}

            <div className="space-y-2">
              {prestadores.length === 0 && <p className="text-sm text-gray-600">Sin prestadores registrados.</p>}
              {prestadores.map((p) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3 text-sm">
                  <p className="font-black text-gray-900">{p.nombre || p.id}</p>
                  <p className={`text-xs ${p.licenciaNumero ? 'text-gray-500' : 'text-amber-700 font-bold'}`}>
                    {p.licenciaNumero
                      ? `Licencia ${p.licenciaNumero} · vence ${p.licenciaVence || '—'}`
                      : '⚠ Sin licencia registrada'}
                    {' · '}{p.activo === false ? 'Inactivo' : 'Activo'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
