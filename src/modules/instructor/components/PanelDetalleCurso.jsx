// @build: 2026-06-22 | id: INSTRUCTOR-FINAL | desc: Panel del instructor con tarjetas "Verificando pago", header dinámico, notificaciones habilitadas.
import { useState, useMemo, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Input, Select, Spinner } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { formatearFechaSinAnio } from '../../shared/utils/fechas';
import { Calendar, Wallet, Settings, Activity, Filter } from 'lucide-react';

export default function InstructorPanel() {
  const { user, reservas, saveInstructor, showToast, logoutUser, notifications = [] } = useContext(AppContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState('inicio');
  const [vistaInicio, setVistaInicio] = useState('resumen');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfil, setPerfil] = useState(user?.data || {});

  const misClases = useMemo(() => (reservas || []).filter(r => String(r.instructorId) === String(user?.uid)), [reservas, user?.uid]);
  const activas = useMemo(() => misClases.filter(c => c.estadoCurso !== 'Aprobado'), [misClases]);
  const completadas = useMemo(() => misClases.filter(c => c.estadoCurso === 'Aprobado'), [misClases]);
  const hoy = useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0];
    return misClases.filter(c => (c.fecha === hoyStr || c.fecha2 === hoyStr) && c.estadoCurso !== 'Aprobado').length;
  }, [misClases]);
  const pendientesFiltradas = useMemo(() => {
    if (!filtroFecha) return activas;
    return activas.filter(c => c.fecha === filtroFecha || c.fecha2 === filtroFecha);
  }, [activas, filtroFecha]);

  const handleLogout = useCallback(async () => { if (logoutUser) await logoutUser(); navigate('/'); }, [logoutUser, navigate]);
  const guardarPerfil = useCallback(async () => { await saveInstructor({ ...user.data, ...perfil }); showToast('Perfil actualizado', 'success'); setEditandoPerfil(false); }, [saveInstructor, user, perfil, showToast]);
  const abrirAula = (r) => navigate(`/aula/${r.id}`);

  if (!user) return <Spinner message="Cargando perfil..." />;

  const header = (
    <DashboardHeader
      title={vistaInicio === 'pendientes' ? 'Pendientes' : undefined}
      onBack={vistaInicio === 'pendientes' ? () => setVistaInicio('resumen') : undefined}
      nombre={vistaInicio !== 'pendientes' ? user?.data?.nombre : undefined}
      onLogout={handleLogout}
      notifications={notifications}
    />
  );

  const footer = <DashboardFooter tabs={[
    { id: 'inicio', icon: Activity, label: 'Inicio' },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas' },
    { id: 'config', icon: Settings, label: 'Perfil' }
  ]} activeTab={tab} onTabChange={setTab} />;

  return (
    <AppShell header={header} footer={footer}>
      <div className="p-4 space-y-4">
        {tab === 'inicio' && (
          <>
            {vistaInicio === 'resumen' ? (
              <>
                <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                  <p className="text-blue-200 text-xs font-bold uppercase tracking-wide">Clases hoy</p>
                  <h2 className="text-4xl font-black mt-1">{hoy}</h2>
                  <p className="text-blue-200 text-xs mt-2">{activas.length} activas · {completadas.length} completadas</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Próximas Clases</h2>
                    {activas.length > 0 && <button onClick={() => setVistaInicio('pendientes')} className="text-xs text-blue-600 font-bold">Ver todas ({activas.length})</button>}
                  </div>
                  {activas.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No tienes clases activas.</p>}
                  {activas.slice(0, 4).map(r => {
                    const pagoAprobado = r.estadoPago === 'Aprobado';
                    return (
                      <div key={r.id} className="mt-2">
                        <button
                          onClick={() => pagoAprobado && abrirAula(r)}
                          disabled={!pagoAprobado}
                          className={`w-full bg-white p-3 rounded-xl shadow-sm border text-left ${
                            pagoAprobado ? 'border-blue-200 hover:border-blue-300' : 'border-yellow-200 bg-yellow-50 opacity-80 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-black text-sm text-gray-900">{r.nombre} {r.apellido}</h3>
                            {!pagoAprobado && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">Verificando pago</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Calendar size={12} />{formatearFechaSinAnio(r.fecha)}</span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {completadas.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mt-4">
                      <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Últimas Completadas</h2>
                    </div>
                    {completadas.slice(-3).reverse().map(r => (
                      <div key={r.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center mt-2">
                        <div><p className="font-bold text-sm text-gray-900">{r.nombre} {r.apellido}</p><p className="text-xs text-gray-500">{formatearFechaSinAnio(r.fecha)}</p></div>
                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">Completada</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : vistaInicio === 'pendientes' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Filter size={16} className="text-gray-500" />
                  <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />
                  {filtroFecha && <button onClick={() => setFiltroFecha('')} className="text-xs text-red-600 font-bold">Limpiar</button>}
                </div>
                {pendientesFiltradas.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Sin resultados.</p>}
                {pendientesFiltradas.map(r => {
                  const pagoAprobado = r.estadoPago === 'Aprobado';
                  return (
                    <div key={r.id} className="mt-2">
                      <button
                        onClick={() => pagoAprobado && abrirAula(r)}
                        disabled={!pagoAprobado}
                        className={`w-full bg-white p-3 rounded-xl shadow-sm border text-left ${
                          pagoAprobado ? 'border-blue-200 hover:border-blue-300' : 'border-yellow-200 bg-yellow-50 opacity-80 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-black text-sm text-gray-900">{r.nombre} {r.apellido}</h3>
                          {!pagoAprobado && (
                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">Verificando pago</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Calendar size={12} />{formatearFechaSinAnio(r.fecha)}</span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </>
            ) : null}
          </>
        )}
        {tab === 'finanzas' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mis Finanzas</h2>
            <p className="text-sm text-gray-500">Funcionalidad en desarrollo.</p>
          </div>
        )}
        {tab === 'config' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mi Perfil</h2>
            {!editandoPerfil ? (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div><p className="text-xs text-gray-500">Nombre</p><p className="font-bold text-gray-900">{user?.data?.nombre} {user?.data?.apellido || ''}</p></div>
                  <button onClick={() => setEditandoPerfil(true)} className="text-blue-600 text-xs font-bold">Editar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Input label="Teléfono" value={perfil.telefono || ''} onChange={e => setPerfil({ ...perfil, telefono: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="button" onClick={guardarPerfil} variant="success">Guardar</Button>
                  <Button type="button" onClick={() => setEditandoPerfil(false)} variant="outline">Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}