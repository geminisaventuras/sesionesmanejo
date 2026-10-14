// @build: 2026-10-12 | id: CORREGIR-PAGO-FASE3B | desc: Página universal de corrección de referencia de pago
import { useContext, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, BookOpen, GraduationCap, AlertCircle, ArrowLeft, Hash, CreditCard, Phone, Contact } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Spinner } from '../../../components/UI';
import { useToast } from '../components/ToastProvider';
import AppShell from '../components/AppShell';
import DashboardHeader from '../components/DashboardHeader';
import { CorreccionReferencia } from '../components/CorreccionReferencia';
import { CorreccionPagoService } from '../services/CorreccionPagoService';
import {
  SERVICE_TYPES,
  SERVICE_TYPES_VALIDOS,
  MOTIVO_RECHAZO_DEFAULT,
} from '../../../constants/servicios';

const ICONOS = {
  [SERVICE_TYPES.RESERVA]: BookOpen,
  [SERVICE_TYPES.PACK]: Package,
  [SERVICE_TYPES.TEORICO]: GraduationCap,
};

export function CorregirPagoView() {
  const { tipo, id } = useParams();
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const { showToast } = useToast();

  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const handleLogout = useCallback(async () => {
    if (ctx.logoutUser) await ctx.logoutUser();
    navigate('/');
  }, [ctx, navigate]);

  // Validación de tipo ANTES de pedir el detalle
  const tipoValido = SERVICE_TYPES_VALIDOS.includes(tipo);

  const cargar = useCallback(async () => {
    if (!tipoValido) {
      setError('Tipo de servicio no válido.');
      setCargando(false);
      return;
    }
    if (!id) {
      setError('Falta el identificador.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);
    const res = await CorreccionPagoService.obtenerDetalle(tipo, id);
    if (!res.success) {
      setError(res.error?.message || 'No se pudo cargar la información.');
      setCargando(false);
      return;
    }
    // Si no está rechazado, no corresponde esta página → volver
    if (!res.data.estaRechazado) {
      showToast('Ese pago ya no requiere corrección.', 'info');
      navigate('/portal-reservas', { replace: true });
      return;
    }
    setDetalle(res.data);
    setCargando(false);
  }, [tipo, id, tipoValido, navigate, showToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGuardar = useCallback(async (nuevaRef) => {
    if (!detalle) return;
    if ((detalle.intentosCorreccion || 0) >= detalle.intentosMax) {
      showToast('Has alcanzado el límite de intentos. Contacta al administrador.', 'error');
      return;
    }
    setEnviando(true);
    try {
      const res = await CorreccionPagoService.corregir(detalle.tipo, detalle.id, nuevaRef, detalle.childId);
      if (res.success) {
        showToast('Referencia enviada con éxito. Espera la validación.', 'success');
        navigate('/portal-reservas', { replace: true });
      } else {
        const code = res.error?.code;
        // Freno táctico SRE: si el estado cambió (aprobado/rechazado en paralelo)
        if (code === 'permission-denied') {
          showToast('El estado de tu pago cambió. Recargando...', 'info');
          setTimeout(() => navigate('/portal-reservas', { replace: true }), 800);
        } else {
          showToast(res.error?.message || 'Error al enviar la referencia', 'error');
        }
      }
    } catch (e) {
      showToast('Error de conexión. Intenta de nuevo.', 'error');
    } finally {
      setEnviando(false);
    }
  }, [detalle, navigate, showToast]);

  const header = (
    <DashboardHeader
      title="Corregir pago"
      onBack={() => navigate(-1)}
      onLogout={handleLogout}
      notifications={ctx.notifications || []}
    />
  );

  // ─── Estados de carga / error ────────────────────────
  if (cargando) {
    return (
      <AppShell header={header} bgColor="bg-gray-50">
        <div className="flex items-center justify-center min-h-full">
          <Spinner message="Cargando información del pago..." />
        </div>
      </AppShell>
    );
  }

  if (error || !detalle) {
    return (
      <AppShell header={header} bgColor="bg-gray-50">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <p className="text-sm text-gray-600 mb-4">{error || 'No se pudo cargar la información.'}</p>
          <Button onClick={() => navigate('/portal-reservas')} variant="primary">
            Volver al panel
          </Button>
        </div>
      </AppShell>
    );
  }

  const IconoTipo = ICONOS[detalle.tipo] || AlertCircle;
  const intentosAgotados = (detalle.intentosCorreccion || 0) >= detalle.intentosMax;

  return (
    <AppShell header={header} bgColor="bg-gray-50">
      <div className="p-4 space-y-4 pb-8">

        {/* Aviso principal */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-base font-black text-red-800">Pago rechazado</h2>
              <p className="text-xs text-red-700 mt-1">
                Tu pago no pudo ser validado. Por favor, verifica los datos y envía la nueva referencia.
              </p>
            </div>
          </div>
        </div>

        {/* Identificación del servicio */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <IconoTipo size={18} className="text-blue-600" />
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
              {detalle.tipoLabel}
            </span>
          </div>
          {detalle.packNombre && (
            <p className="font-black text-gray-900 text-base">{detalle.packNombre}</p>
          )}
        </div>

        {/* Datos del pago erróneo */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
            Datos del pago anterior
          </h3>
          <div className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Monto:</span>
              <span className="font-black text-teal-700">${detalle.monto} {detalle.moneda || 'USD'}</span>
            </div>
            {detalle.pagoBanco && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1"><CreditCard size={12} /> Banco:</span>
                <span className="font-bold">{detalle.pagoBanco}</span>
              </div>
            )}
            {detalle.pagoTelefono && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1"><Phone size={12} /> Teléfono:</span>
                <span className="font-bold">{detalle.pagoTelefono}</span>
              </div>
            )}
            {detalle.pagoCedula && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1"><Contact size={12} /> CI titular:</span>
                <span className="font-bold">{detalle.pagoCedula}</span>
              </div>
            )}
            {detalle.pagoRef && (
              <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1">
                <span className="text-gray-600 flex items-center gap-1"><Hash size={12} /> Referencia enviada:</span>
                <span className="font-black text-red-600 line-through">{detalle.pagoRef}</span>
              </div>
            )}
          </div>
        </div>

        {/* Motivo del rechazo */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-[10px] font-black text-orange-900 uppercase tracking-wider mb-1">
            Motivo del rechazo
          </p>
          <p className="text-sm text-orange-900">
            {detalle.motivoRechazo || MOTIVO_RECHAZO_DEFAULT}
          </p>
        </div>

        {/* Formulario de corrección */}
        {intentosAgotados ? (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-center">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-red-800">Has alcanzado el límite de intentos</p>
            <p className="text-xs text-red-700 mt-1">
              Contacta al administrador para resolver tu caso.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 mb-1">
              Ingresa los últimos 4 dígitos de la referencia del pago
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Puedes consultar el comprobante de tu banco.
            </p>
            <CorreccionReferencia onGuardar={handleGuardar} enviando={enviando} />
            {(detalle.intentosCorreccion || 0) > 0 && (
              <p className="text-[10px] text-gray-500 mt-2">
                Intento {detalle.intentosCorreccion + 1} de {detalle.intentosMax}
              </p>
            )}
          </div>
        )}

      </div>
    </AppShell>
  );
}

export default CorregirPagoView;
