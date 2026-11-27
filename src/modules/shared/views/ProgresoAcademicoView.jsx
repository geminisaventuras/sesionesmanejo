// @build: 2026-09-21 | id: PROGRESO-ACADEMICO-VIEW | desc: Vista dedicada de progreso académico por reserva (admin, instructor, estudiante)
import { useContext, useState, useEffect, useMemo } from 'react';
import { formatearSede } from '../../shared/utils/sedesHelpers';
import { normalizarModulos, marcarModulo, marcarTodosLosModulos, cursoEstaCompletado } from '../utils/progresoAcademico';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { Spinner } from '../../../components/UI';
import AppShell from '../components/AppShell';
import DashboardHeader from '../components/DashboardHeader';
import { Check, Clock, User, BookOpen, Calendar, MapPin } from 'lucide-react';

const APP_ID = 'motoescuela-pro-v1';

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-');
  return `${parseInt(d)} ${MESES_CORTOS[parseInt(m)-1] || ''} ${y}`;
};

// A2.8: formato 24h compacto
const formatHora = (ms) => {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Caracas'
  });
};

export function ProgresoAcademicoView() {
    const { reservaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const volverA = location.state?.from || null;
  const ctx = useContext(AppContext);
  const [reservaLocal, setReservaLocal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const {
    reservas = [], cursos = [], instructores = [], sedes = [],
    user, fbUser, logoutUser, notifications = []
  } = ctx;

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      // 1. Buscar en contexto global (sin lectura Firestore)
      const fromCtx = (reservas || []).find(r => String(r.id) === String(reservaId));
      if (fromCtx) {
        if (activo) { setReservaLocal(fromCtx); setCargando(false); }
        return;
      }
      // 2. Fallback: lectura puntual si no está en contexto
      try {
        const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaId));
        if (!activo) return;
        if (snap.exists()) {
          setReservaLocal({ id: snap.id, ...snap.data() });
        } else {
          setError('Reserva no encontrada.');
        }
      } catch (e) {
        if (activo) setError('No se pudo cargar la reserva.');
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [reservaId, reservas]);

  const curso = useMemo(() => (cursos || []).find(c => String(c.id) === String(reservaLocal?.cursoId)), [cursos, reservaLocal]);
  const instructor = useMemo(() => (instructores || []).find(i => String(i.id) === String(reservaLocal?.instructorId)), [instructores, reservaLocal]);
  const sede = useMemo(() => (sedes || []).find(s => String(s.id) === String(reservaLocal?.sedeId)), [sedes, reservaLocal]);

  const rol = user?.role;
  const uid = fbUser?.uid || user?.uid;

  // A2.8: validación de acceso por rol
  const puedeVer = reservaLocal && (
    rol === 'admin' ||
    (rol === 'instructor' && String(reservaLocal.instructorId) === String(uid)) ||
    (rol === 'estudiante' && String(reservaLocal.userId) === String(uid))
  );

  // A2.8: instructor NO ve datos sensibles del estudiante
  const mostrarDatosSensibles = rol === 'admin' || (rol === 'estudiante' && String(reservaLocal?.userId) === String(uid));

      const backRoute = rol === 'admin'
    ? `/admin/reserva/${reservaId}`
    : rol === 'instructor'
      ? '/instructor'
      : '/portal-reservas';

  // A2.11: propagar el origen original (state.from) al volver al detalle
  const irAtras = () => {
    if (volverA) {
      navigate(backRoute, { state: { from: volverA } });
    } else {
      navigate(backRoute);
    }
  };

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

  const puedeGestionar = rol === 'admin';
  const completarModulo = async (modulo) => {
    if (!puedeGestionar || !reservaLocal) return;
    const nombre = modulo.nombre;
    try {
      const batch = writeBatch(db);
      const reservaRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaLocal.id);
      const nuevosEstados = marcarModulo(reservaLocal.modulosEstado, modulo, new Date().toISOString());
      const modulos = normalizarModulos(curso);
      const cursoCompletado = cursoEstaCompletado(modulos, nuevosEstados);
      const updateData = { modulosEstado: nuevosEstados, updatedAt: serverTimestamp() };
      if (cursoCompletado) updateData.estadoCurso = 'Aprobado';
      batch.update(reservaRef, updateData);
      if (cursoCompletado) {
        batch.set(doc(db, 'ocupacionConfirmada', reservaLocal.id), { estadoCurso: 'Aprobado' }, { merge: true });
        if (reservaLocal.userId) {
          batch.update(doc(db, 'artifacts', APP_ID, 'public', 'data', 'usuarios', reservaLocal.userId), { updatedAt: serverTimestamp() });
        }
      }
      await batch.commit();
      setReservaLocal((prev) => ({
        ...(prev || reservaLocal),
        modulosEstado: nuevosEstados,
        ...(cursoCompletado ? { estadoCurso: 'Aprobado' } : {})
      }));
      ctx.showToast?.(cursoCompletado ? 'Curso completado y aprobado.' : `Módulo "${nombre}" completado`, 'success');
    } catch (e) {
      ctx.showToast?.(`Error al completar módulo: ${e.message}`, 'error');
    }
  };

  const completarCursoEntero = async () => {
    if (!puedeGestionar || !reservaLocal) return;
    if (!window.confirm('¿Marcar todos los módulos como completados y aprobar el curso?\n\nEsta acción no se puede deshacer.')) return;
    try {
      const batch = writeBatch(db);
      const reservaRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaLocal.id);
      const modulos = normalizarModulos(curso);
      const nuevosEstados = marcarTodosLosModulos(reservaLocal.modulosEstado, modulos, new Date().toISOString());
      batch.update(reservaRef, { modulosEstado: nuevosEstados, estadoCurso: 'Aprobado', updatedAt: serverTimestamp() });
      batch.set(doc(db, 'ocupacionConfirmada', reservaLocal.id), { estadoCurso: 'Aprobado' }, { merge: true });
      if (reservaLocal.userId) {
        batch.update(doc(db, 'artifacts', APP_ID, 'public', 'data', 'usuarios', reservaLocal.userId), { updatedAt: serverTimestamp() });
      }
      await batch.commit();
      setReservaLocal((prev) => ({ ...(prev || reservaLocal), modulosEstado: nuevosEstados, estadoCurso: 'Aprobado' }));
      ctx.showToast?.('Curso completado y aprobado exitosamente', 'success');
    } catch (e) {
      ctx.showToast?.(`Error al completar curso: ${e.message}`, 'error');
    }
  };

  if (cargando) {
    return (
      <AppShell bgColor="bg-gray-50">
        <div className="flex items-center justify-center min-h-full">
          <Spinner message="Cargando progreso..." />
        </div>
      </AppShell>
    );
  }

  if (error || !reservaLocal) {
    return (
      <AppShell bgColor="bg-gray-50">
        <div className="flex flex-col items-center justify-center min-h-full p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">{error || 'Reserva no encontrada.'}</p>
          <button
                       onClick={irAtras}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            Volver
          </button>
        </div>
      </AppShell>
    );
  }

  if (!puedeVer) {
    return (
      <AppShell bgColor="bg-gray-50">
        <div className="flex flex-col items-center justify-center min-h-full p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">No tienes acceso a esta reserva.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            Volver al inicio
          </button>
        </div>
      </AppShell>
    );
  }

  const estados = reservaLocal?.modulosEstado || {};
  const modulosCurso = normalizarModulos(curso);
  const total = modulosCurso.length;
  const completados = modulosCurso.filter(m => estados[m.nombre]?.fecha).length;
  const tiempoConsumido = Object.values(estados).reduce((acc, m) => acc + (m.duracion || 0) + (m.duracionExtra || 0), 0);
  const tiempoTotal = curso?.duracionTotal || 240;
  const tiempoRestante = Math.max(0, tiempoTotal - tiempoConsumido);
  const sinIniciar = Object.keys(estados).length === 0;

  const header = (
    <DashboardHeader
      title={`Avance: ${reservaLocal.nombre || ''} ${reservaLocal.apellido || ''}`.trim()}
            onBack={irAtras}
      onLogout={handleLogout}
      notifications={notifications}
    />
  );

  return (
    <AppShell header={header} bgColor="bg-gray-50">
      <div className="p-4 space-y-3">
        {/* Card resumen */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Resumen</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1 col-span-2">
              <User size={12} className="text-gray-400 flex-shrink-0" />
              <span className="font-bold truncate">{reservaLocal.nombre} {reservaLocal.apellido}</span>
            </div>
            {mostrarDatosSensibles && reservaLocal.cedula && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400">CI:</span>
                <span>{reservaLocal.cedula}</span>
              </div>
            )}
            {mostrarDatosSensibles && reservaLocal.telefono && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Tlf:</span>
                <span>{reservaLocal.telefono}</span>
              </div>
            )}
            <div className="flex items-center gap-1 col-span-2 border-t border-gray-100 pt-1 mt-1">
              <BookOpen size={12} className="text-gray-400 flex-shrink-0" />
              <span className="font-bold truncate">{curso?.nombre || 'Curso'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={12} className="text-gray-400 flex-shrink-0" />
              <span>{formatearFecha(reservaLocal.fecha)}{reservaLocal.fecha2 ? ` – ${formatearFecha(reservaLocal.fecha2)}` : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <User size={12} className="text-gray-400 flex-shrink-0" />
              <span className="truncate">Inst: {instructor ? `${instructor.nombre} ${instructor.apellido || ''}`.trim() : '—'}</span>
            </div>
            {sede && (
              <div className="flex items-center gap-1 col-span-2">
                <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">Sede: {formatearSede(sede, { catalogos: { estados: ctx.estados, municipios: ctx.municipios, ciudades: ctx.ciudades } })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progreso de módulos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider">Módulos</h3>
            <span className="text-[11px] font-bold text-blue-600">{completados}/{total}</span>
          </div>

          {total === 0 ? (
            <p className="text-[11px] text-gray-500 text-center py-3">Sin módulos configurados.</p>
          ) : (
            <div className="space-y-1.5">
              {modulosCurso.map((mod, i) => {
                const est = estados[mod.nombre];
                const completado = !!est?.fecha;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2 rounded-lg border ${completado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${completado ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {completado ? <Check size={12} strokeWidth={3} /> : <Clock size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${completado ? 'text-green-900' : 'text-gray-600'}`}>
                        {mod.nombre}
                      </p>
                      {completado && (
                        <p className="text-[10px] text-green-700 mt-0.5">
                          {formatearFecha(est.fecha)} · {est.duracion || 0} min
                          {est.duracionExtra > 0 && (
                            <span className="text-orange-600"> (+{est.duracionExtra} extra)</span>
                          )}
                          {est.horaInicio && est.horaFin && (
                            <span className="text-gray-400 ml-1">
                              · {formatHora(est.horaInicio)}-{formatHora(est.horaFin)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    {puedeGestionar && !completado && (
                      <button
                        type="button"
                        onClick={() => completarModulo(mod)}
                        className="min-h-11 px-2.5 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-[10px] font-black hover:bg-blue-50 transition-colors flex-shrink-0"
                      >
                        Completar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {puedeGestionar && total > 0 && completados < total && (
            <button
              type="button"
              onClick={completarCursoEntero}
              className="mt-2 w-full min-h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors"
            >
              Completar curso entero
            </button>
          )}

          {sinIniciar && !puedeGestionar && (
            <p className="text-[10px] text-gray-500 text-center mt-2">Aún no se ha iniciado el curso.</p>
          )}

          <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between text-[11px]">
            <span className="text-gray-500">Consumido: <strong className="text-gray-700">{tiempoConsumido} min</strong></span>
            <span className="text-gray-500">Restante: <strong className="text-gray-700">{tiempoRestante} min</strong></span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default ProgresoAcademicoView;
