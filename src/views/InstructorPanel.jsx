// @build: 2026-06-18.05-30-00 | id: INSTRUCTOR-AJUSTES-FINALES | desc: Texto xs y fondo gris en tarjeta interna, header unificado
import { useContext, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { Button, Input, Select, Spinner } from '../components/UI';
import AppShell from '../modules/shared/components/AppShell';
import {
  LogOut, Calendar, Clock, MapPin, Bike, BookOpen, Phone, Award,
  AlertCircle, Check, Wallet, Settings, Activity, ChevronLeft,
  Filter, User, MessageCircle
} from 'lucide-react';

// ================================================================
// UTILIDADES DE FORMATO DE FECHA
// ================================================================

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTOS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const formatearFechaNatural = (fechaStr) => {
  if (!fechaStr) return '';
  const [anio, mes, dia] = fechaStr.split('-');
  const fecha = new Date(anio, parseInt(mes)-1, dia);
  return DIAS_SEMANA[fecha.getDay()] + ' ' + parseInt(dia) + ' de ' + MESES[parseInt(mes)-1] + ' de ' + anio;
};

const formatearFechaSinAnio = (fechaStr) => {
  if (!fechaStr) return '';
  const [anio, mes, dia] = fechaStr.split('-');
  const fecha = new Date(anio, parseInt(mes)-1, dia);
  return DIAS_SEMANA[fecha.getDay()] + ' ' + parseInt(dia) + ' de ' + MESES[parseInt(mes)-1];
};

const formatearRangoCorto = (fecha1Str, fecha2Str) => {
  if (!fecha1Str || !fecha2Str) return formatearFechaNatural(fecha1Str || fecha2Str);
  const [a1, m1, d1] = fecha1Str.split('-');
  const [a2, m2, d2] = fecha2Str.split('-');
  const f1 = new Date(a1, parseInt(m1)-1, d1);
  const f2 = new Date(a2, parseInt(m2)-1, d2);
  const dia1 = DIAS_SEMANA[f1.getDay()].substring(0, 3) + ' ' + parseInt(d1);
  const dia2 = DIAS_SEMANA[f2.getDay()].substring(0, 3) + ' ' + parseInt(d2);
  return dia1 + ' - ' + dia2;
};

const obtenerMesCortoYAnio = (fechaStr) => {
  if (!fechaStr) return { mes: '', anio: '' };
  const [anio, mes] = fechaStr.split('-');
  return { mes: MESES_CORTOS[parseInt(mes)-1], anio };
};

// ================================================================
// COMPONENTE PRINCIPAL: InstructorPanel
// ================================================================

const InstructorPanel = () => {
  const {
    user, reservas, cursos, horarios, motos, sedes, config,
    saveReserva, saveInstructor, showToast, logoutUser, instructores
  } = useContext(AppContext);
  const navigate = useNavigate();

  // ----------------------------------------------------------
  // ESTADO LOCAL
  // ----------------------------------------------------------
  const [tab, setTab] = useState('inicio');
  const [vistaInicio, setVistaInicio] = useState('resumen');
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfil, setPerfil] = useState(user?.data || {});

  // ----------------------------------------------------------
  // DATOS DERIVADOS (useMemo)
  // ----------------------------------------------------------
  const misClases = useMemo(() => {
    if (!user?.uid) return [];
    const uid = String(user.uid);
    return (reservas || []).filter(r => String(r.instructorId) === uid);
  }, [reservas, user?.uid]);

  const activas = useMemo(() => {
    return misClases.filter(c =>
      c.estadoCurso !== 'Aprobado' &&
      (c.estadoPago === 'Aprobado' || c.estadoPago === 'Pendiente')
    );
  }, [misClases]);

  const completadas = useMemo(() => {
    return misClases.filter(c => c.estadoCurso === 'Aprobado');
  }, [misClases]);

  const hoy = useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0];
    return misClases.filter(c =>
      (c.fecha === hoyStr || c.fecha2 === hoyStr) &&
      c.estadoCurso !== 'Aprobado'
    ).length;
  }, [misClases]);

  const pendientesFiltradas = useMemo(() => {
    if (!filtroFecha) return activas;
    return activas.filter(c => c.fecha === filtroFecha || c.fecha2 === filtroFecha);
  }, [activas, filtroFecha]);

  const historialFiltrado = useMemo(() => {
    let res = completadas;
    if (filtroDesde) res = res.filter(c => c.fecha >= filtroDesde || c.fecha2 >= filtroDesde);
    if (filtroHasta) res = res.filter(c => c.fecha <= filtroHasta || c.fecha2 <= filtroHasta);
    return res;
  }, [completadas, filtroDesde, filtroHasta]);

  const gananciaCobrada = useMemo(() => {
    return misClases
      .filter(r => r.estadoPago === 'Aprobado' && r.pagadoInstructor === true)
      .reduce((acc, r) => acc + Number(config.pagoInstructor || 0), 0);
  }, [misClases, config.pagoInstructor]);

  const gananciaPorCobrar = useMemo(() => {
    return misClases
      .filter(r => r.estadoPago === 'Aprobado' && !r.pagadoInstructor)
      .reduce((acc, r) => acc + Number(config.pagoInstructor || 0), 0);
  }, [misClases, config.pagoInstructor]);

  // ----------------------------------------------------------
  // HANDLERS (useCallback)
  // ----------------------------------------------------------
  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const guardarPerfil = useCallback(async () => {
    await saveInstructor({ ...user.data, ...perfil });
    showToast('Perfil actualizado correctamente', 'success');
    setEditandoPerfil(false);
  }, [saveInstructor, user, perfil, showToast]);

  const toggleModulo = useCallback(async (reserva, modulo) => {
    const modulosEstado = { ...(reserva.modulosEstado || {}) };
    if (modulosEstado[modulo]) {
      delete modulosEstado[modulo];
    } else {
      modulosEstado[modulo] = formatearFechaSinAnio(new Date().toISOString().split('T')[0]);
    }
    const nuevaReserva = { ...reserva, modulosEstado };
    await saveReserva(nuevaReserva);
    setClaseSeleccionada(nuevaReserva);
    showToast('Progreso actualizado', 'success');
  }, [saveReserva, showToast]);

  const completarCurso = useCallback(async (reserva) => {
    if (!window.confirm('¿Confirma que el estudiante completó todos los módulos?')) return;
    await saveReserva({ ...reserva, estadoCurso: 'Aprobado' });
    setClaseSeleccionada(null);
    setVistaInicio('resumen');
    showToast('Curso completado exitosamente', 'success');
  }, [saveReserva, showToast]);

  // ================================================================
  // SUBCOMPONENTE: TarjetaSimple (resumen de clase)
  // ================================================================
  const TarjetaSimple = useCallback(({ r, onClick, disabled }) => {
    const horario = (horarios || []).find(h => String(h.id) === String(r.horaId));
    const sede = (sedes || []).find(s => String(s.id) === String(r.sedeId));
    const horaInicio = horario?.label ? horario.label.split('-')[0]?.trim() : '--:--';

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full bg-white p-3 rounded-xl shadow-sm border border-blue-200 text-left ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-black text-sm text-gray-900">
              {r.nombre} {r.apellido}
            </h3>
            <p className="text-xs text-gray-500">{r.telefono || 'Sin teléfono'}</p>
          </div>
          <span className={`text-[10px] font-black px-2 py-1 rounded ${
            r.estadoPago === 'Pendiente'
              ? 'bg-orange-100 text-orange-600'
              : 'bg-green-100 text-green-700'
          }`}>
            {r.estadoPago === 'Pendiente' ? 'Pendiente' : 'Confirmada'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar size={12} />{formatearFechaSinAnio(r.fecha)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />{horaInicio}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={12} />{sede?.nombre || 'Sede'}
          </span>
        </div>
      </button>
    );
  }, [horarios, sedes]);

  // ================================================================
  // SUBCOMPONENTE: VistaDetalleCurso
  // La cabecera (volver, título, nombre, salir) ahora la gestiona
  // el header unificado del AppShell. Aquí solo va el contenido.
  // Diseño Seamless: tarjeta azul con sello mes/año, tarjeta interna
  // en grid 2 columnas, barra de progreso con fondo gris claro.
  // ================================================================
  const VistaDetalleCurso = useCallback(({ reserva }) => {
    const curso = (cursos || []).find(c => String(c.id) === String(reserva.cursoId)) || { nombre: '', modulos: [] };
    const hor = (horarios || []).find(h => String(h.id) === String(reserva.horaId));
    const sede = (sedes || []).find(s => String(s.id) === String(reserva.sedeId));
    const inst = (instructores || []).find(i => String(i.id) === String(reserva.instructorId));
    const cantCompletados = Object.keys(reserva.modulosEstado || {}).length;
    const totalModulos = curso.modulos.length;
    const todosCompletados = totalModulos > 0 && cantCompletados >= totalModulos;
    const horaInicio = hor?.label ? hor.label.split('-')[0]?.trim() : '--:--';
    const horaFin = hor?.label ? hor.label.split('-')[1]?.trim() : '--:--';
    const sello = obtenerMesCortoYAnio(reserva.fecha);
    const telefonoLimpio = reserva.telefono ? reserva.telefono.replace(/\D/g, '') : '';
    const whatsappLink = telefonoLimpio ? `https://wa.me/58${telefonoLimpio}` : null;

    return (
      <div className="space-y-3">
        {/* TARJETA AZUL GRANDE (Seamless) */}
        <div className="rounded-xl shadow-xl shadow-blue-600/20 overflow-hidden">
          {/* Cabecera azul */}
          <div className="bg-blue-600 text-white p-3 relative">
            <div className="flex items-center gap-2 mb-2">
              <Bike size={18} className="text-blue-200" />
              <p className="text-sm font-bold uppercase tracking-widest flex-1">
                {curso.nombre || 'Curso'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-300" />
                <span className="font-bold">Sede: {sede?.nombre || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-blue-300" />
                <span className="font-bold truncate">Inst: {inst?.nombre || 'N/A'}</span>
              </div>
            </div>

            {/* SELLO MES/AÑO */}
            <div className="absolute top-2 right-2 bg-white/20 rounded-lg px-2 py-1 text-center">
              <p className="text-lg font-black leading-none">{sello.mes}</p>
              <p className="text-[10px] font-bold leading-none">{sello.anio}</p>
            </div>

            {/* TARJETA INTERNA: Texto xs (12px), iconos size={12}, fondo gris oscuro */}
            <div className="bg-gray-800/50 p-3 rounded-xl grid grid-cols-5 gap-3 text-xs mb-2">
              {/* Columna izquierda: datos del curso */}
              <div className="col-span-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-blue-300" />
                  <span className="font-bold">
                    Días: {formatearRangoCorto(reserva.fecha, reserva.fecha2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-blue-300" />
                  <span className="font-bold">Hora: {horaInicio} - {horaFin}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bike size={12} className="text-blue-300" />
                  <span className="font-bold">
                    {reserva.traeMoto === 'Sí' ? 'Propia' : 'Escuela'} · {reserva.tipoMoto}
                  </span>
                </div>
              </div>

              {/* Columna derecha: botones de contacto */}
              <div className="col-span-2 flex flex-col items-center justify-center gap-1.5">
                {reserva.telefono && (
                  <a
                    href={`tel:${reserva.telefono}`}
                    className="flex items-center gap-1.5 bg-white/20 rounded-lg px-2.5 py-1.5 hover:bg-white/30 transition-colors w-full justify-center"
                  >
                    <Phone size={14} className="text-white" />
                    <span className="text-[10px] font-bold">Llamar</span>
                  </a>
                )}
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-green-500/60 rounded-lg px-2.5 py-1.5 hover:bg-green-500/80 transition-colors w-full justify-center"
                  >
                    <MessageCircle size={14} className="text-white" />
                    <span className="text-[10px] font-bold">WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* BARRA DE PROGRESO (fondo gris claro, seamless) */}
            <div className="bg-gray-100 -mx-3 -mb-3 px-3 py-2.5 mt-2 border-t border-blue-400/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">Avance Académico</span>
                <span className="text-xs font-bold text-gray-700">
                  {cantCompletados}/{totalModulos}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: totalModulos > 0
                      ? `${(cantCompletados / totalModulos) * 100}%`
                      : '0%',
                    background:
                      'repeating-linear-gradient(-45deg, #4ade80, #4ade80 6px, #22c55e 6px, #22c55e 12px)',
                    animation: 'progress-stripes 1s linear infinite'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* MÓDULOS SIN CHECKBOX */}
        {totalModulos > 0 && (
          <div className="space-y-1.5">
            {curso.modulos.map((mod, i) => {
              const completado = (reserva.modulosEstado || {})[mod];
              return (
                <button
                  key={i}
                  onClick={() => toggleModulo(reserva, mod)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 shadow-sm border ${
                    completado
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* Check circular */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      completado
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-300'
                    }`}
                  >
                    {completado && <Check size={12} strokeWidth={3} />}
                  </div>

                  <span
                    className={`text-sm font-bold flex-1 text-left ${
                      completado ? 'text-green-800 line-through' : 'text-gray-800'
                    }`}
                  >
                    {mod}
                  </span>

                  {completado && (
                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      {reserva.modulosEstado[mod]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {todosCompletados && (
          <Button
            type="button"
            onClick={() => completarCurso(reserva)}
            variant="success"
            className="mt-3"
            icon={Award}
          >
            Completar Curso
          </Button>
        )}
      </div>
    );
  }, [cursos, horarios, sedes, instructores, toggleModulo, completarCurso]);

  // ----------------------------------------------------------
  // GUARDAS DE RENDER
  // ----------------------------------------------------------
  if (!user) return <Spinner message="Cargando perfil..." />;

  // ================================================================
  // HEADER UNIFICADO
  // Cambia dinámicamente según la sub-vista activa.
  // ================================================================
  const header = (
    <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white px-4 py-2.5 flex items-center gap-3 relative overflow-hidden shadow-lg rounded-b-2xl">
      {/* Glow decorativo */}
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>

      {/* Contenido dinámico */}
      {tab === 'inicio' && vistaInicio !== 'resumen' ? (
        <>
          {/* Modo navegación interna: volver + título */}
          <button
            onClick={() => { setVistaInicio('resumen'); setFiltroFecha(''); setFiltroDesde(''); setFiltroHasta(''); setClaseSeleccionada(null); }}
            className="p-1.5 bg-white/10 rounded-full relative z-10"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <h2 className="text-base font-black uppercase tracking-widest flex-1 relative z-10">
            {vistaInicio === 'detalleCurso' ? 'Detalle del Curso' :
             vistaInicio === 'pendientes' ? 'Clases Pendientes' : 'Historial'}
          </h2>
        </>
      ) : (
        /* Modo resumen: solo nombre */
        <div className="flex items-center gap-2 flex-1 relative z-10">
          <User size={18} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-200">
            {user?.data?.nombre || 'Instructor'}
          </span>
        </div>
      )}

      {/* Botón de salir siempre visible */}
      <button
        onClick={handleLogout}
        className="p-1.5 bg-white/10 rounded-full relative z-10 hover:bg-white/20 transition-colors"
      >
        <LogOut size={18} className="text-gray-300" />
      </button>
    </div>
  );

  // Footer solo visible en resumen (o en tabs finanzas/config)
  const isSubVista = tab === 'inicio' && vistaInicio !== 'resumen';
  const footer = !isSubVista ? (
    <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center shadow-md">
      {[
        { id: 'inicio', icon: Activity, label: 'Inicio' },
        { id: 'finanzas', icon: Wallet, label: 'Finanzas' },
        { id: 'config', icon: Settings, label: 'Perfil' }
      ].map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => { setTab(t.id); setVistaInicio('resumen'); }}
          className={`flex flex-col items-center w-20 transition-all ${
            tab === t.id ? 'text-gray-900 transform -translate-y-1' : 'text-gray-400'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${tab === t.id ? 'bg-gray-100' : ''}`}>
            <t.icon size={22} className={tab === t.id ? 'stroke-[2.5px]' : ''} />
          </div>
          <span className="text-[10px] font-bold">{t.label}</span>
        </button>
      ))}
    </div>
  ) : null;

  // ================================================================
  // RENDER PRINCIPAL
  // ================================================================
  return (
    <AppShell header={header} footer={footer}>
      <div className="p-4 space-y-4">
        {/* ---------------------------------------------------- */}
        {/* TAB: INICIO                                            */}
        {/* ---------------------------------------------------- */}
        {tab === 'inicio' && (
          <>
            {vistaInicio === 'detalleCurso' && claseSeleccionada ? (
              <VistaDetalleCurso reserva={claseSeleccionada} />
            ) : vistaInicio === 'resumen' ? (
              <>
                {/* Tarjeta "Clases hoy" */}
                <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                  <p className="text-blue-200 text-xs font-bold uppercase tracking-wide">Clases hoy</p>
                  <h2 className="text-4xl font-black mt-1">{hoy}</h2>
                  <p className="text-blue-200 text-xs mt-2">
                    {activas.length} activas · {completadas.length} completadas
                  </p>
                </div>

                {/* Próximas clases */}
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">
                      Próximas Clases
                    </h2>
                    {activas.length > 0 && (
                      <button
                        onClick={() => setVistaInicio('pendientes')}
                        className="text-xs text-blue-600 font-bold"
                      >
                        Ver todas ({activas.length})
                      </button>
                    )}
                  </div>
                  {activas.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No tienes clases activas.
                    </p>
                  )}
                  {activas.slice(0, 4).map(r => (
                    <div key={r.id} className="mt-2">
                      <TarjetaSimple
                        r={r}
                        onClick={
                          r.estadoPago !== 'Pendiente'
                            ? () => { setClaseSeleccionada(r); setVistaInicio('detalleCurso'); }
                            : undefined
                        }
                        disabled={r.estadoPago === 'Pendiente'}
                      />
                    </div>
                  ))}
                </div>

                {/* Últimas completadas */}
                {completadas.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mt-4">
                      <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">
                        Últimas Completadas
                      </h2>
                      <button
                        onClick={() => setVistaInicio('historial')}
                        className="text-xs text-blue-600 font-bold"
                      >
                        Ver historial
                      </button>
                    </div>
                    {completadas.slice(-3).reverse().map(r => (
                      <div
                        key={r.id}
                        className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center mt-2"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-900">
                            {r.nombre} {r.apellido}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatearFechaSinAnio(r.fecha)}
                          </p>
                        </div>
                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">
                          Completada
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : vistaInicio === 'pendientes' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Filter size={16} className="text-gray-500" />
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={e => setFiltroFecha(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none"
                  />
                  {filtroFecha && (
                    <button
                      onClick={() => setFiltroFecha('')}
                      className="text-xs text-red-600 font-bold"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {pendientesFiltradas.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Sin resultados.</p>
                )}
                {pendientesFiltradas.map(r => (
                  <div key={r.id} className="mt-2">
                    <TarjetaSimple
                      r={r}
                      onClick={
                        r.estadoPago !== 'Pendiente'
                          ? () => { setClaseSeleccionada(r); setVistaInicio('detalleCurso'); }
                          : undefined
                      }
                      disabled={r.estadoPago === 'Pendiente'}
                    />
                  </div>
                ))}
              </>
            ) : (
              /* Historial */
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">Desde</label>
                    <input
                      type="date"
                      value={filtroDesde}
                      onChange={e => setFiltroDesde(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">Hasta</label>
                    <input
                      type="date"
                      value={filtroHasta}
                      onChange={e => setFiltroHasta(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>
                {historialFiltrado.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Sin resultados.</p>
                )}
                {historialFiltrado.map(r => (
                  <div key={r.id} className="mt-2">
                    <TarjetaSimple
                      r={r}
                      onClick={() => { setClaseSeleccionada(r); setVistaInicio('detalleCurso'); }}
                      disabled={false}
                    />
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB: FINANZAS                                         */}
        {/* ---------------------------------------------------- */}
        {tab === 'finanzas' && (
          <>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">
              Mis Finanzas
            </h2>
            <div className="bg-green-600 text-white p-5 rounded-3xl shadow-xl">
              <p className="text-green-200 text-[10px] font-bold uppercase">
                Ganancias Cobradas
              </p>
              <h2 className="text-3xl font-black">
                {config.monedaPagoStaff} {gananciaCobrada}
              </h2>
            </div>
            {gananciaPorCobrar > 0 && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center gap-3">
                <Clock size={20} className="text-orange-500" />
                <div>
                  <p className="text-sm font-bold text-orange-800">Por Cobrar</p>
                  <p className="text-lg font-black text-orange-600">
                    {config.monedaPagoStaff} {gananciaPorCobrar}
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-black text-gray-900">{activas.length}</p>
                <p className="text-[10px] text-gray-500 uppercase">Clases Activas</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-black text-gray-900">{completadas.length}</p>
                <p className="text-[10px] text-gray-500 uppercase">Completadas</p>
              </div>
            </div>
          </>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB: PERFIL                                           */}
        {/* ---------------------------------------------------- */}
        {tab === 'config' && (
          <>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">
              Mi Perfil
            </h2>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              {!editandoPerfil ? (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Nombre</p>
                      <p className="font-bold text-gray-900">
                        {user?.data?.nombre} {user?.data?.apellido || ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditandoPerfil(true)}
                      className="text-blue-600 text-xs font-bold"
                    >
                      Editar
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-bold text-gray-900">
                      {user?.data?.email || 'No disponible'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="font-bold text-gray-900">
                      {user?.data?.telefono || 'No registrado'}
                    </p>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Datos de Pago Móvil
                    </p>
                    <p className="text-sm">
                      <span className="font-bold">Banco:</span>{' '}
                      {user?.data?.pagoBanco || 'No registrado'}
                    </p>
                    <p className="text-sm">
                      <span className="font-bold">Teléfono:</span>{' '}
                      {user?.data?.pagoTelefono || 'No registrado'}
                    </p>
                    <p className="text-sm">
                      <span className="font-bold">Cédula:</span>{' '}
                      {user?.data?.pagoCedula || 'No registrado'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <Input
                    label="Teléfono"
                    value={perfil.telefono || ''}
                    onChange={e => setPerfil({ ...perfil, telefono: e.target.value })}
                  />
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-900 mb-2">
                      Datos para recibir pagos
                    </p>
                    <Select
                      label="Banco"
                      options={[
                        'Banesco', 'Mercantil', 'Provincial', 'Venezuela',
                        'Bancamiga', 'BNC', 'Tesoro'
                      ]}
                      value={perfil.pagoBanco || ''}
                      onChange={e => setPerfil({ ...perfil, pagoBanco: e.target.value })}
                    />
                    <Input
                      label="Teléfono Pago Móvil"
                      value={perfil.pagoTelefono || ''}
                      onChange={e =>
                        setPerfil({ ...perfil, pagoTelefono: e.target.value })
                      }
                    />
                    <Input
                      label="Cédula Pago Móvil"
                      value={perfil.pagoCedula || ''}
                      onChange={e =>
                        setPerfil({ ...perfil, pagoCedula: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={guardarPerfil}
                      variant="success"
                      className="!py-2 !text-sm"
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setEditandoPerfil(false)}
                      variant="outline"
                      className="!py-2 !text-sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default InstructorPanel;
