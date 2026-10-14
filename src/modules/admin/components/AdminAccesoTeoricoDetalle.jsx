// @build: 2026-10-09 | id: ADMIN-ACCESO-TEORICO-DETALLE | desc: Detalle y aprobación/rechazo de compras teóricas
import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import { Button, Spinner } from '../../../components/UI';
import { ChevronLeft, CheckCircle, AlertCircle, X, CreditCard, Phone, Contact, Hash, User, GraduationCap, Clock } from 'lucide-react';
import AccesoTeoricoService from '../../public/services/AccesoTeoricoService';
import ModalMotivoRechazo from '../../shared/components/ModalMotivoRechazo';

const APP_ID = 'motoescuela-pro-v1';

const ESTADO_COLOR = {
  Pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Aprobado: 'bg-green-100 text-green-800 border-green-200',
  Rechazado: 'bg-red-100 text-red-800 border-red-200',
  Cancelado: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function AdminAccesoTeoricoDetalle() {
  const { accesoId } = useParams();
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const { saveMovimiento } = ctx;
  const { showToast } = useToast();

  const [acceso, setAcceso] = useState(null);
  const [curso, setCurso] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  // FIX-T2.4: estado del modal de motivo (null | 'rechazar' | 'cancelar')
  const [modalMotivo, setModalMotivo] = useState(null);

  const cargarTodo = useCallback(async () => {
    if (!accesoId) { setCargando(false); return; }
    setCargando(true);
    try {
      // 1. Leer acceso
      const aSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'accesosTeoricos', accesoId));
      if (!aSnap.exists()) { showToast('Acceso no encontrado', 'error'); navigate('/admin/reservas'); return; }
      const aData = { id: aSnap.id, ...aSnap.data() };
      setAcceso(aData);

      // 2. Leer curso
      if (aData.cursoTeoricoId) {
        const cSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'cursosTeoricos', aData.cursoTeoricoId));
        if (cSnap.exists()) setCurso({ id: cSnap.id, ...cSnap.data() });
      }

      // 3. Leer usuario (SSOT)
      if (aData.userId) {
        const uSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'usuarios', aData.userId));
        if (uSnap.exists()) setUsuario({ id: uSnap.id, ...uSnap.data() });
      }
    } catch (err) {
      console.error('[AdminAccesoTeoricoDetalle] Error:', err);
      showToast('Error cargando datos', 'error');
    } finally {
      setCargando(false);
    }
  }, [accesoId, navigate, showToast]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const handleAprobar = async () => {
    if (!acceso) return;
    setProcesando(true);
    const esVitalicio = curso?.duracionAcceso === 'vida' || acceso.esAccesoVitalicio === true;
    const duracion = parseInt(curso?.duracionAcceso) || 30;
    const res = await AccesoTeoricoService.aprobarAcceso(
      acceso.id,
      acceso.userId,
      acceso.cursoTeoricoId,
      esVitalicio,
      duracion
    );
    setProcesando(false);
    if (res.success) {
      // FASE-5D: movimiento contable con ID determinístico (idempotente)
      try {
        const cursoNombre = curso?.nombre || 'Módulo formativo';
        await saveMovimiento({
          id: `mov_acc_${acceso.id}`,
          tipo: 'ingreso',
          monto: Number(acceso.precio) || 0,
          desc: `Módulo formativo - ${cursoNombre} - A-${String(acceso.id).slice(-4)}`,
          fecha: new Date().toISOString().split('T')[0],
          referenciaId: acceso.id,
          referenciaTipo: 'acceso_teorico'
        });
      } catch (err) {
        console.warn('[AdminAccesoTeoricoDetalle] Error guardando movimiento:', err);
        showToast('Acceso aprobado. Falló el registro contable. Agregalo manual en Finanzas.', 'info');
      }
      showToast('Acceso aprobado correctamente.', 'success');
      navigate('/admin/reservas');
    } else {
      showToast(res.error || 'Error aprobando.', 'error');
    }
  };

  // FIX-T2.4: recibe (tipo, motivo) desde el modal. Se eliminó window.prompt.
  const handleRechazar = async (tipo, motivo) => {
    if (!acceso) return;
    setProcesando(true);
    const res = await AccesoTeoricoService.rechazarAcceso(
      acceso.id,
      acceso.userId,
      acceso.cursoTeoricoId,
      tipo,
      motivo
    );
    setProcesando(false);
    if (res.success) {
      showToast(tipo === 'cancelar' ? 'Acceso cancelado.' : 'Acceso rechazado para corrección.', 'success');
      navigate('/admin/reservas');
    } else {
      showToast(res.error || 'Error procesando.', 'error');
    }
  };

  const header = (
    <DashboardHeader
      title="Acceso Teórico"
      onBack={() => navigate('/admin/reservas')}
      onLogout={async () => { if (ctx.logoutUser) await ctx.logoutUser(); navigate('/'); }}
      notifications={ctx.notifications}
    />
  );

  if (cargando) {
    return (
      <AppShell header={header} bgColor="bg-gray-50">
        <div className="flex items-center justify-center min-h-full"><Spinner message="Cargando..." /></div>
      </AppShell>
    );
  }

  if (!acceso) {
    return (
      <AppShell header={header} bgColor="bg-gray-50">
        <div className="p-6 text-center">
          <p className="text-gray-500">Acceso no encontrado.</p>
        </div>
      </AppShell>
    );
  }

  const estadoColor = ESTADO_COLOR[acceso.estadoPago] || ESTADO_COLOR.Pendiente;
  const precio = Number(acceso.precio) || 0;

  return (
    <AppShell header={header} bgColor="bg-gray-50">
      <div className="p-4 space-y-4 pb-8">

        {/* Estado */}
        <div className={`rounded-2xl border-2 p-4 ${estadoColor}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">Estado</span>
            <span className="text-lg font-black">{acceso.estadoPago}</span>
          </div>
          {acceso.motivoRechazo && (
            <p className="text-xs mt-2">Motivo: {acceso.motivoRechazo}</p>
          )}
        </div>

        {/* Usuario */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <User size={14} /> Usuario
          </h3>
          <p className="font-black text-gray-900 text-base">
            {usuario ? `${usuario.nombre} ${usuario.apellido}` : '(Sin perfil SSOT)'}
          </p>
          {usuario && (
            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
              {usuario.cedula && <p>CI: {usuario.cedula}</p>}
              {usuario.correo && <p>{usuario.correo}</p>}
              {usuario.telefono && <p>Tel: {usuario.telefono}</p>}
            </div>
          )}
        </div>

        {/* Curso */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <GraduationCap size={14} /> Módulo Formativo
          </h3>
          <p className="font-black text-gray-900 text-base">
            {curso?.nombre || acceso.cursoTeoricoId}
          </p>
          {curso && (
            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
              <p>{curso.totalModulos || 0} módulos · {curso.totalQuizzes || 0} retos</p>
              <p className="flex items-center gap-1">
                <Clock size={12} />
                {curso.duracionAcceso === 'vida' ? 'Acceso de por vida' : `Acceso por ${curso.duracionAcceso} días`}
              </p>
            </div>
          )}
        </div>

        {/* Pago */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Datos del pago</h3>
          <div className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Precio:</span>
              <span className="font-black text-teal-700">${precio} {acceso.moneda || 'USD'}</span>
            </div>
            {acceso.metodoPagoId && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Método:</span>
                <span className="font-bold">{acceso.metodoPagoId === 'pago_movil' ? 'Pago Móvil' : 'USDT'}</span>
              </div>
            )}
            {acceso.pagoBanco && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1"><CreditCard size={12} /> Banco:</span>
                <span className="font-bold">{acceso.pagoBanco}</span>
              </div>
            )}
            {acceso.pagoTelefono && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1"><Phone size={12} /> Teléfono:</span>
                <span className="font-bold">{acceso.pagoTelefono}</span>
              </div>
            )}
            {acceso.pagoCedula && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1"><Contact size={12} /> CI titular:</span>
                <span className="font-bold">{acceso.pagoCedula}</span>
              </div>
            )}
            {acceso.pagoRef && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1"><Hash size={12} /> Ref:</span>
                <span className="font-bold">{acceso.pagoRef}</span>
              </div>
            )}
          </div>
        </div>

        {/* FIX-T2.4-BIS: acciones para Pendiente Y Rechazado + banner de intentos */}
        {(acceso.estadoPago === 'Pendiente' || acceso.estadoPago === 'Rechazado') && (() => {
          const intentos = Number(acceso.intentosCorreccion) || 0;
          const agotados = intentos >= 3;
          const yaRechazado = acceso.estadoPago === 'Rechazado';
          return (
            <div className="space-y-2 pt-2">
              {/* Banner de intentos */}
              {agotados ? (
                <div className="bg-red-100 border-2 border-red-400 rounded-2xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-red-800">
                        ⚠️ El usuario agotó los 3 intentos de corrección
                      </p>
                      <p className="text-[10px] text-red-700 mt-0.5">
                        Ya no puede corregir la referencia. Decide: <strong>Aprobar</strong> o <strong>Cancelar definitivamente</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : intentos > 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-[10px] font-bold text-orange-800">
                  ⚠️ Rechazos acumulados: {intentos} de 3
                </div>
              ) : null}

              <Button
                type="button"
                onClick={handleAprobar}
                disabled={procesando}
                variant="success"
                icon={CheckCircle}
                className="w-full"
              >
                {procesando ? 'Procesando...' : 'Aprobar Acceso'}
              </Button>

              {/* Rechazar solo si NO está ya rechazado ni agotado */}
              {!yaRechazado && !agotados && (
                <Button
                  type="button"
                  onClick={() => setModalMotivo('rechazar')}
                  disabled={procesando}
                  variant="danger"
                  icon={AlertCircle}
                  className="w-full"
                >
                  Rechazar (corregir)
                </Button>
              )}

              <Button
                type="button"
                onClick={() => setModalMotivo('cancelar')}
                disabled={procesando}
                variant="outline"
                icon={X}
                className="w-full"
              >
                Cancelar definitivamente
              </Button>
            </div>
          );
        })()}

        {acceso.estadoPago === 'Aprobado' && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="font-black text-green-900">Acceso aprobado</p>
              <p className="text-xs text-green-700">El estudiante ya puede ver el módulo en su panel.</p>
            </div>
          </div>
        )}

      </div>

      {/* FIX-T2.4: modal de motivo (rechazar / cancelar) */}
      {modalMotivo && (
        <ModalMotivoRechazo
          titulo={modalMotivo === 'cancelar' ? 'Motivo de la cancelación' : 'Motivo del rechazo'}
          onConfirm={(motivo) => {
            handleRechazar(modalMotivo, motivo);
            setModalMotivo(null);
          }}
          onCancel={() => setModalMotivo(null)}
        />
      )}
    </AppShell>
  );
}
