// @build: 2026-09-25.A2.15 | id: ADMIN-PACK-DETALLE | desc: Detalle y aprobación de packs comerciales
import { useContext, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import { ReservaService } from '../../../services/ReservaService';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  ChevronLeft, CheckCircle, X, Package, User, Phone, Mail, MapPin,
  CreditCard, Calendar, Clock, Bike, BookOpen, Activity, Wallet, Settings
} from 'lucide-react';
import { useAdminReservas } from '../hooks/useAdminReservas';

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
};

const AdminPackDetalle = () => {
  const { packReservaId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { cursos, sedes, horarios, instructores, logoutUser, user, saveMovimiento } = useContext(AppContext);  
  const { reservas, packs } = useAdminReservas();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const pack = useMemo(
    () => (packs || []).find(p => String(p.id) === String(packReservaId)),
    [packs, packReservaId]
  );

  const child = useMemo(() => {
    if (!pack) return null;
    return (reservas || []).find(r => String(r.packReservaId) === String(pack.id));
  }, [reservas, pack]);

  const cursoEquilibrio = useMemo(() => {
    if (!child) return null;
    return (cursos || []).find(c => String(c.id) === String(child.cursoId));
  }, [cursos, child]);

  const sede = useMemo(
    () => (sedes || []).find(s => String(s.id) === String(pack?.sedeId)),
    [sedes, pack]
  );

  const horario = useMemo(
    () => (horarios || []).find(h => String(h.id) === String(child?.horaId)),
    [horarios, child]
  );

  const instructorActual = useMemo(
    () => (instructores || []).find(i => String(i.id) === String(child?.instructorId)),
    [instructores, child]
  );

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

   const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  const header = <DashboardHeader title={`Pack: ${pack?.packNombre || ''}`} onBack={() => navigate('/admin/reservas')} onLogout={handleLogout} />;
  const footer = <DashboardFooter tabs={footerTabs} activeTab="reservas" onTabChange={(id) => {
    const t = footerTabs.find(x => x.id === id);
    if (t?.action) t.action();
  }} />;

  if (!pack || !child) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50">
        <div className="flex flex-col items-center justify-center py-20">
          <Package size={48} className="text-gray-300 mb-4" />
          <p className="text-sm text-gray-500 mb-4">Pack no encontrado o aún cargando…</p>
          <Button onClick={() => navigate('/admin/reservas')} variant="primary">Volver</Button>
        </div>
      </AppShell>
    );
  }

   const handleAprobar = async () => {
    if (!confirm('¿Aprobar este pack? Se activará el primer curso (Equilibrio).')) return;
    setIsSubmitting(true);
    const res = await ReservaService.aprobarReservaPack(pack.id, child.id);
    if (res.success) {
      // Movimiento contable (fire-and-forget): 1 ingreso por el total del pack
      await saveMovimiento({
        id: Date.now().toString(),
        tipo: 'ingreso',
        monto: Number(pack.precioTotalCongelado) || 0,
        desc: `Pack ${pack.packNombre || ''} - C-${String(pack.id).slice(-4)}`,
        fecha: new Date().toISOString().split('T')[0],
        userId: pack.userId
      }).catch((err) => {
        console.warn('[AdminPackDetalle] Error guardando movimiento:', err);
      });
      setIsSubmitting(false);
      showToast('Pack aprobado correctamente', 'success');
      navigate('/admin/reservas');
    } else {
      setIsSubmitting(false);
      showToast('Error al aprobar: ' + res.error.message, 'error');
    }
  };

  const handleRechazar = async () => {
    if (!confirm('¿Rechazar este pack? El estudiante podrá corregir el pago.')) return;
    setIsSubmitting(true);
    const res = await ReservaService.rechazarReservaPack(pack.id, child.id);
    setIsSubmitting(false);
    if (res.success) {
      showToast('Pack rechazado', 'info');
      navigate('/admin/reservas');
    } else {
      showToast('Error al rechazar: ' + res.error.message, 'error');
    }
  };

  const handleCancelar = async () => {
    if (!confirm('¿Cancelar definitivamente? Se liberará el horario.')) return;
    setIsSubmitting(true);
    const res = await ReservaService.cancelarReservaPack(pack.id, child.id);
    setIsSubmitting(false);
    if (res.success) {
      showToast('Pack cancelado. Horario liberado.', 'info');
      navigate('/admin/reservas');
    } else {
      showToast('Error al cancelar: ' + res.error.message, 'error');
    }
  };

  const estadoBadge = {
    Pendiente: 'bg-orange-100 text-orange-700',
    Aprobado: 'bg-green-100 text-green-700',
    Rechazado: 'bg-red-100 text-red-700',
    Cancelado: 'bg-gray-200 text-gray-700',
  };

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-3 space-y-2">
        {/* Header estado */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-2">
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${estadoBadge[pack.estadoPago] || 'bg-gray-100'}`}>
            {pack.estadoPago}
          </span>
          <Package size={16} className="text-purple-600" />
          <span className="text-sm font-bold text-gray-900 truncate flex-1">{pack.packNombre}</span>
        </div>

        {/* Estudiante */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Estudiante</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1 col-span-2"><User size={12} className="text-gray-400" /><span className="font-medium">{child.nombre} {child.apellido}</span></div>
            <div className="flex items-center gap-1"><User size={12} className="text-gray-400" /><span>CI: {child.cedula}</span></div>
            <div className="flex items-center gap-1"><Phone size={12} className="text-gray-400" /><span className="truncate">{child.telefono || '—'}</span></div>
            <div className="flex items-center gap-1 col-span-2"><Mail size={12} className="text-gray-400" /><span className="truncate">{child.correo || '—'}</span></div>
            <div className="flex items-center gap-1 col-span-2"><MapPin size={12} className="text-gray-400" /><span className="truncate">{child.estado || '—'}{child.zona ? `, ${child.zona}` : ''}</span></div>
          </div>
        </div>

        {/* Cursos del pack */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">
            Cursos del pack ({(pack.subReservas || []).length})
          </h3>
          <div className="space-y-1.5">
            {(pack.subReservas || []).map((sub, idx) => {
              const estadoIcono = sub.estado === 'completado' ? '✅' : sub.estado === 'activo' ? '🔵' : '🔒';
              return (
                <div key={idx} className="flex items-center gap-2 text-[11px]">
                  <span>{estadoIcono}</span>
                  <span className="font-medium flex-1 truncate">{sub.cursoNombre || sub.cursoId}</span>
                  <span className="text-[10px] text-gray-500 uppercase">{sub.estado}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalles del primer curso */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Primer curso agendado</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1 col-span-2"><BookOpen size={12} className="text-gray-400" /><span className="font-medium">{cursoEquilibrio?.nombre || '—'}</span></div>
            <div className="flex items-center gap-1"><Calendar size={12} className="text-gray-400" /><span>{formatearFecha(child.fecha)}</span></div>
            <div className="flex items-center gap-1"><Clock size={12} className="text-gray-400" /><span>{horario?.label || child.horaId || '—'}</span></div>
            <div className="flex items-center gap-1"><MapPin size={12} className="text-gray-400" /><span>Sede: {sede?.nombre || '—'}</span></div>
            <div className="flex items-center gap-1"><User size={12} className="text-gray-400" /><span className="truncate">Inst: {instructorActual ? `${instructorActual.nombre} ${instructorActual.apellido || ''}` : '—'}</span></div>
            <div className="flex items-center gap-1 col-span-2"><Bike size={12} className="text-gray-400" /><span>{child.tipoMoto || '—'} · {child.traeMoto === 'Sí' ? 'Propia' : 'Escuela'}</span></div>
          </div>
        </div>

        {/* Pago */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Pago</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1"><CreditCard size={12} className="text-gray-400" /><span>Bco: {pack.pagoBanco || '—'}</span></div>
            <div className="flex items-center gap-1"><Phone size={12} className="text-gray-400" /><span>Tlf: {pack.pagoTelefono || '—'}</span></div>
            <div className="flex items-center gap-1"><User size={12} className="text-gray-400" /><span>CI: {pack.pagoCedula || '—'}</span></div>
            <div className="flex items-center gap-1"><span className="font-bold">Ref: {pack.pagoRef || '—'}</span></div>
            <div className="col-span-2 flex items-center gap-1 font-bold text-blue-700">
              <span>Total Pack: Bs. {pack.pagoTotalVES?.toFixed?.(2) || pack.pagoTotalVES || '—'}</span>
              <span className="text-gray-400">| USD {pack.precioTotalCongelado || '—'}</span>
            </div>
            <div className="col-span-2 text-[10px] text-gray-500">
              Base: ${pack.precioBaseCongelado} · Descuento: −${pack.descuentoCongelado?.monto}
            </div>
          </div>
        </div>

        {/* Acciones */}
        {pack.estadoPago === 'Pendiente' && (         
           <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2">
            <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Acciones</h3>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" onClick={handleAprobar} variant="success" className="!py-2 !text-xs flex-1" icon={CheckCircle} disabled={isSubmitting}>
                Aprobar Pack
              </Button>
              <Button type="button" onClick={handleRechazar} variant="danger" className="!py-2 !text-xs flex-1" icon={X} disabled={isSubmitting}>
                Rechazar (corregir)
              </Button>
            </div>
            <Button type="button" onClick={handleCancelar} variant="outline" className="!py-2 !text-xs w-full" icon={X} disabled={isSubmitting}>
              Cancelar definitivamente
            </Button>
          </div>
        )}

        {/* Acciones — Rechazado (esperando corrección del estudiante) */}
        {pack.estadoPago === 'Rechazado' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2">
            <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Acciones</h3>
            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded mb-2 text-[10px] font-bold text-yellow-800 flex items-start gap-2">
              <span>⏳</span>
              <span>El estudiante debe corregir la referencia del pago antes de que puedas aprobar.</span>
            </div>
            <Button type="button" onClick={handleCancelar} variant="outline" className="!py-2 !text-xs w-full" icon={X} disabled={isSubmitting}>
              Cancelar definitivamente
            </Button>
          </div>
        )}

        {pack.estadoPago === 'Aprobado' && (          
          <div className="bg-green-50 p-3 rounded-xl border border-green-200 text-center text-xs font-bold text-green-700">
            ✅ Este pack ya fue aprobado.
          </div>
        )}
        {pack.estadoPago === 'Cancelado' && (
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center text-xs font-bold text-gray-700">
            🚫 Este pack fue cancelado.
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AdminPackDetalle;
