// @build: 2026-10-04 | id: VISTA-FORMACION | desc: Tab Formación del panel estudiante con 3 secciones
import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { GraduationCap, BookOpen, FileText, Play, ExternalLink, Sparkles, Loader2, Zap, AlertCircle } from 'lucide-react';

const APP_ID = 'motoescuela-pro-v1';

const TIPO_ICONO = {
  pdf: FileText,
  video: Play,
  link: ExternalLink,
  infografia: BookOpen
};

const formatearPrecio = (precio, moneda) => {
  const p = Number(precio) || 0;
  if (p === 0) return 'Gratis';
  return `$${p} ${moneda || 'USD'}`;
};

export function VistaFormacion({ showToast }) {
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const { fbUser, cursosTeoricos, recursos } = ctx;
  const uid = fbUser?.uid;

  const [accesos, setAccesos] = useState([]);
  const [cargandoAccesos, setCargandoAccesos] = useState(true);

  const cargarAccesos = useCallback(async () => {
    if (!uid) { setAccesos([]); setCargandoAccesos(false); return; }
    setCargandoAccesos(true);
    try {
      const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'accesosTeoricos');
      const q = query(ref, where('userId', '==', String(uid)));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAccesos(docs);
    } catch (err) {
      console.error('[VistaFormacion] Error cargando accesos:', err);
      setAccesos([]);
    } finally {
      setCargandoAccesos(false);
    }
  }, [uid]);

  useEffect(() => { cargarAccesos(); }, [cargarAccesos]);

  const accesosAprobados = useMemo(() => {
    const set = new Set();
    (accesos || []).forEach(a => {
      if (a.estadoPago === 'Aprobado') set.add(String(a.cursoTeoricoId));
    });
    return set;
  }, [accesos]);

  // FIX-T2.6: accesos rechazados (detección legacy + nuevo flujo T2).
  const accesosRechazados = useMemo(() => {
    return (accesos || []).filter(a => {
      if (a.estadoPago === 'Rechazado') return true;
      // Solo legacy si NO tiene historialRechazos (flujo nuevo)
      const sinHistorial = !Array.isArray(a.historialRechazos) || a.historialRechazos.length === 0;
      return a.estadoPago === 'Pendiente' && !!a.motivoRechazo && !!a.rechazadoEn && sinHistorial;
    });
  }, [accesos]);

  const todosCursos = useMemo(() => (cursosTeoricos || []).filter(c => c.activo !== false), [cursosTeoricos]);

  const misModulos = useMemo(() => {
    return todosCursos.filter(c => accesosAprobados.has(String(c.id)));
  }, [todosCursos, accesosAprobados]);

  const modulosGratuitos = useMemo(() => {
    return todosCursos
      .filter(c => (Number(c.precio) || 0) === 0)
      .filter(c => !accesosAprobados.has(String(c.id)))
      .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
  }, [todosCursos, accesosAprobados]);

  const recursosActivos = useMemo(() => {
    return (recursos || [])
      .filter(r => r.activo !== false)
      .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
  }, [recursos]);

  const masFormacion = useMemo(() => {
    return todosCursos
      .filter(c => (Number(c.precio) || 0) > 0)
      .filter(c => !accesosAprobados.has(String(c.id)))
      .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
  }, [todosCursos, accesosAprobados]);

  const handleAbrirModulo = (cursoId) => {
    navigate('/teorico/' + cursoId);
  };

  const handleAbrirRecurso = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (cargandoAccesos) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-teal-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Cargando formación...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FIX-T2.6: banner de módulos por corregir */}
      {accesosRechazados.length > 0 && (
        <section>
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-red-800">Pago rechazado</p>
                <p className="text-xs text-red-700 mt-0.5">
                  {accesosRechazados.length === 1
                    ? 'Uno de tus módulos formativos tiene un pago rechazado.'
                    : `${accesosRechazados.length} módulos formativos tienen un pago rechazado.`}
                </p>
                {accesosRechazados[0]?.motivoRechazo && (
                  <p className="text-[11px] text-red-600 mt-1 italic">
                    Motivo: {accesosRechazados[0].motivoRechazo}
                  </p>
                )}
              </div>
            </div>
            {accesosRechazados.map(a => (
              <button
                key={a.id}
                onClick={() => navigate(`/corregir-pago/teorico/${a.id}`)}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs"
              >
                Corregir pago
              </button>
            ))}
          </div>
        </section>
      )}

      {misModulos.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap size={20} className="text-teal-600" />
            <h3 className="font-black text-base text-gray-900">Mis Módulos Formativos</h3>
          </div>
          <div className="space-y-2">
            {misModulos.map(c => (
              <button
                key={c.id}
                onClick={() => handleAbrirModulo(c.id)}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={20} className="text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{c.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {c.totalModulos || 0} módulos · {c.totalQuizzes || 0} retos
                  </p>
                </div>
                <Sparkles size={18} className="text-teal-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-amber-500" />
          <h3 className="font-black text-base text-gray-900">Formación Gratuita</h3>
        </div>

        {modulosGratuitos.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Módulos Formativos
            </p>
            <div className="space-y-2">
              {modulosGratuitos.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleAbrirModulo(c.id)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
                >
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={20} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.totalModulos || 0} módulos · {c.totalQuizzes || 0} retos
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded flex-shrink-0">
                    Gratis
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {recursosActivos.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Recursos
            </p>
            <div className="space-y-2">
              {recursosActivos.map(r => {
                const Icono = TIPO_ICONO[r.tipo] || BookOpen;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleAbrirRecurso(r.url)}
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Icono size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{r.nombre}</p>
                      {r.descripcion && (
                        <p className="text-xs text-gray-500 truncate">{r.descripcion}</p>
                      )}
                    </div>
                    <ExternalLink size={18} className="text-gray-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {modulosGratuitos.length === 0 && recursosActivos.length === 0 && (
          <div className="text-center py-6 bg-gray-50 rounded-2xl">
            <p className="text-sm text-gray-500">No hay contenido gratuito disponible.</p>
          </div>
        )}
      </section>

      {masFormacion.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={20} className="text-purple-600" />
            <h3 className="font-black text-base text-gray-900">Más Formación</h3>
          </div>
          <div className="space-y-2">
            {masFormacion.map(c => (
              <button
                key={c.id}
                onClick={() => handleAbrirModulo(c.id)}
                className="w-full text-left bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 shadow-sm border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <GraduationCap size={20} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{c.nombre}</p>
                  <p className="text-xs text-gray-600 truncate">
                    {c.totalModulos || 0} módulos · {c.totalQuizzes || 0} retos
                  </p>
                </div>
                <span className="text-sm font-black text-purple-700 flex-shrink-0">
                  {formatearPrecio(c.precio, c.moneda)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={20} className="text-yellow-600" />
          <h3 className="font-black text-base text-gray-900">Retos</h3>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 text-center border border-yellow-200">
          <Zap size={40} className="text-yellow-500 mx-auto mb-3" />
          <p className="font-bold text-sm text-gray-900 mb-1">Próximamente</p>
          <p className="text-xs text-gray-600">Pruebas teóricas para medir tu conocimiento.</p>
        </div>
      </section>
    </div>
  );
}

export default VistaFormacion;
