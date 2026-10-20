// @build: 2026-10-10 | id: VISTA-INICIO | desc: Hub dinámico del panel del cliente
import { useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import { BookOpen, Package, GraduationCap, Compass, Zap } from 'lucide-react';

export function VistaInicio({ onNavigate, reservaActual, packExistente, cursos, metricas: metricasProp }) {
  const ctx = useContext(AppContext);
  const { user } = ctx;
  const capacidades = user?.data?.capacidades || {};
  // FASE 2: metricas viene por prop del hook useMetricasUsuario, con fallback al SSOT
  const metricas = metricasProp || user?.data?.metricas;
  const nombre = user?.data?.nombre || 'Estudiante';

  const tieneServiciosActivos = 
    (metricas?.totales?.activos || 0) > 0 ||
    (metricas?.totales?.pendientes || 0) > 0;

  const curso = reservaActual ? (cursos || []).find(c => String(c.id) === String(reservaActual.cursoId)) : null;
  const tieneSesionAprobada = reservaActual?.estadoPago === 'Aprobado';
  const tienePackActivo = packExistente?.estado === 'activo' && packExistente?.estadoPago === 'Aprobado';

  // FEATURE-RESUMEN-SIEMPRE-VISIBLE: cinta de resumen reutilizable en ambos escenarios.
  // Antes vivía duplicada dentro de ESCENARIO 2. Ahora se define una sola vez y se
  // reutiliza en ESCENARIO 1 (vitrina) y ESCENARIO 2 (hub).
  const resumenCinta = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Resumen</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-black text-green-600">{metricas?.totales?.activos || 0}</p>
          <p className="text-[10px] text-gray-500">Activos</p>
        </div>
        <div>
          <p className="text-xl font-black text-orange-600">{metricas?.totales?.pendientes || 0}</p>
          <p className="text-[10px] text-gray-500">Pendientes</p>
        </div>
        <div>
          <p className="text-xl font-black text-blue-600">{metricas?.totales?.completados || 0}</p>
          <p className="text-[10px] text-gray-500">Completados</p>
        </div>
      </div>
    </div>
  );

  // ── ESCENARIO 1: Usuario sin servicios (vitrina) ──
  if (!tieneServiciosActivos) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-black mb-1">¡Hola, {nombre}!</h2>
          <p className="text-sm text-blue-100">
            Descubre todo lo que tenemos para ti. Aprende a manejar, fórmate online o aprovecha nuestros servicios.
          </p>
        </div>

        {resumenCinta}

        <div>
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider px-1 mb-2">
            Explora nuestros servicios
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate?.('cursos')}
              className="bg-white rounded-2xl border-2 border-blue-200 p-4 text-left hover:border-blue-400 active:scale-[0.98] transition-all"
            >
              <BookOpen size={28} className="text-blue-600 mb-2" />
              <p className="font-bold text-sm text-gray-900">Sesiones Prácticas</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Clases con tutor y moto</p>
            </button>
            <button
              onClick={() => onNavigate?.('formacion')}
              className="bg-white rounded-2xl border-2 border-teal-200 p-4 text-left hover:border-teal-400 active:scale-[0.98] transition-all"
            >
              <GraduationCap size={28} className="text-teal-600 mb-2" />
              <p className="font-bold text-sm text-gray-900">Módulos Formativos</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Contenido digital</p>
            </button>
          </div>
          <button
            onClick={() => onNavigate?.('packs')}
            className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-4 text-left hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <Package size={24} className="mb-2" />
            <p className="font-black text-base">Packs</p>
            <p className="text-xs text-indigo-100 mt-0.5">Combos con descuento exclusivo</p>
          </button>
        </div>
      </div>
    );
  }

  // ── ESCENARIO 2: Sesión activa (hub accionable) ──
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-6 rounded-2xl shadow-lg">
        <p className="text-xs font-bold text-blue-100 uppercase tracking-wider mb-1">Hola,</p>
        <h2 className="text-xl font-black mb-3">{nombre}</h2>
        {tieneSesionAprobada && curso && (
          <button
            onClick={() => onNavigate?.('miCurso')}
            className="w-full bg-white text-purple-700 font-bold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-blue-50 active:scale-[0.98] transition-all"
          >
            <Zap size={16} /> Ir al Panel de Sesiones
          </button>
        )}
        {!tieneSesionAprobada && (
          <p className="text-sm text-blue-100">
            Tienes servicios pendientes o en proceso. Explora tus servicios para más detalles.
          </p>
        )}
      </div>

      {resumenCinta}

      <button
        onClick={() => onNavigate?.('servicios')}
        className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:border-blue-300 transition-all"
      >
        <span className="flex items-center gap-2 font-bold text-sm text-gray-900">
          <Compass size={18} className="text-blue-600" /> Ver todos mis servicios
        </span>
        <span className="text-blue-600">→</span>
      </button>
    </div>
  );
}

export default VistaInicio;
