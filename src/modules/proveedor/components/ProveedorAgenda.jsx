import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import {
  AlertCircle,
  Bike,
  Calendar,
  CalendarDays,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  User,
  X
} from 'lucide-react';
import { collection, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useToast } from '../../shared/components/ToastProvider';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { useProveedorBloqueos } from '../../../hooks/useProveedorBloqueos';
import { formatearSede } from '../../shared/utils/sedesHelpers';
import { formatearFechaSinAnio } from '../../shared/utils/fechas';
import { fechaVetHoy } from '../../shared/utils/reservaHelpers';
import ProveedorMiniCalendario from './ProveedorMiniCalendario';
import ModalConfirmacion from '../../shared/components/ModalConfirmacion';
import {
  construirEntradasAgenda,
  construirSerieFechas,
  contarDiasEntre,
  esBloqueoPropio,
  etiquetaDia,
  sumarDiasISO
} from '../utils/agendaProveedor';

const aISO = (fecha) => [
  fecha.getFullYear(),
  String(fecha.getMonth() + 1).padStart(2, '0'),
  String(fecha.getDate()).padStart(2, '0')
].join('-');

const fechaLocal = (fechaISO) => new Date(`${fechaISO}T12:00:00`);

const diaSemanaCorto = (fechaISO) => (
  fechaLocal(fechaISO).toLocaleDateString('es-VE', { weekday: 'short' }).replace('.', '')
);

const mesLargo = (fechaISO) => (
  fechaLocal(fechaISO).toLocaleDateString('es-VE', { month: 'long' })
);

const numeroDia = (fechaISO) => Number(String(fechaISO).slice(8, 10));

const estadoSesion = ({ estadoCurso, estadoPago }) => {
  if (estadoCurso === 'Aprobado') return { label: 'Completada', clase: 'bg-emerald-50 text-emerald-700' };
  if (estadoPago === 'Pendiente') return { label: 'Por confirmar', clase: 'bg-amber-50 text-amber-700' };
  if (estadoPago === 'Aprobado') return { label: 'Confirmada', clase: 'bg-green-50 text-green-700' };
  return { label: estadoCurso || 'Programada', clase: 'bg-gray-100 text-gray-600' };
};

function ModalNuevoBloqueo({ hoy, fechaInicial, misMotos, onCerrar, onGuardar, guardando, errorExterno }) {
  const contenedorRef = useRef(null);
  const fechaRef = useRef(null);
  const [modo, setModo] = useState('unico');
  const [desde, setDesde] = useState(fechaInicial || hoy);
  const [hasta, setHasta] = useState(fechaInicial || hoy);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [motoId, setMotoId] = useState('ALL');
  const [errorLocal, setErrorLocal] = useState('');

  useFocusTrap(contenedorRef, onCerrar);

  useEffect(() => {
    fechaRef.current?.focus();
  }, []);

  const error = errorLocal || errorExterno;
  const totalDias = modo === 'serie' ? contarDiasEntre(desde, hasta) : 1;

  const enviar = () => {
    if (!desde) { setErrorLocal('Elige una fecha para el bloqueo.'); return; }
    if (desde < hoy) { setErrorLocal('No puedes bloquear una fecha pasada.'); return; }
    if (modo === 'serie') {
      if (totalDias === 0) { setErrorLocal('El rango de fechas no es válido.'); return; }
      if (totalDias > 90) { setErrorLocal('Máximo 90 días por serie.'); return; }
    }
    if (!horaInicio || !horaFin) { setErrorLocal('Completa la hora de inicio y de fin.'); return; }
    if (horaFin <= horaInicio) { setErrorLocal('La hora de fin debe ser posterior al inicio.'); return; }
    const fechas = modo === 'serie'
      ? construirSerieFechas(desde, hasta, 90)
      : [desde];
    if (!fechas.length) { setErrorLocal('El rango de fechas no es válido.'); return; }
    setErrorLocal('');
    onGuardar({ fechas, horaInicio, horaFin, motoId });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) onCerrar(); }}
    >
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuevo-bloqueo-titulo"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 id="nuevo-bloqueo-titulo" className="text-sm font-black uppercase text-gray-900">Nuevo bloqueo</h3>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 disabled:opacity-50"
            aria-label="Cerrar formulario de bloqueo"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setModo('unico')}
              aria-pressed={modo === 'unico'}
              className={`rounded-lg py-1.5 text-[11px] font-bold ${modo === 'unico' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Un día
            </button>
            <button
              type="button"
              onClick={() => setModo('serie')}
              aria-pressed={modo === 'serie'}
              className={`rounded-lg py-1.5 text-[11px] font-bold ${modo === 'serie' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Varios días
            </button>
          </div>

          {modo === 'unico' ? (
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="bloqueo-fecha">Fecha</label>
              <input
                ref={fechaRef}
                id="bloqueo-fecha"
                type="date"
                min={hoy}
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="bloqueo-desde">Desde</label>
                  <input
                    ref={fechaRef}
                    id="bloqueo-desde"
                    type="date"
                    min={hoy}
                    value={desde}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setDesde(valor);
                      if (hasta < valor) setHasta(valor);
                    }}
                    className="w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="bloqueo-hasta">Hasta</label>
                  <input
                    id="bloqueo-hasta"
                    type="date"
                    min={desde || hoy}
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
              <p className={`text-[10px] font-bold ${totalDias > 90 ? 'text-red-600' : 'text-gray-500'}`}>
                {totalDias === 0
                  ? 'Elige un rango de fechas válido.'
                  : totalDias > 90
                    ? 'Máximo 90 días por serie.'
                    : totalDias === 1
                      ? 'Se bloqueará 1 día.'
                      : `Se bloquearán ${totalDias} días seguidos.`}
              </p>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="bloqueo-inicio">Inicio</label>
              <input
                id="bloqueo-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="bloqueo-fin">Fin</label>
              <input
                id="bloqueo-fin"
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700" htmlFor="bloqueo-moto">Moto</label>
            <select
              id="bloqueo-moto"
              value={motoId}
              onChange={(e) => setMotoId(e.target.value)}
              className="w-full rounded-xl border bg-gray-50 px-3 py-2.5 text-sm"
            >
              <option value="ALL">Todas mis motos</option>
              {misMotos.map((m) => (
                <option key={m.id} value={m.id}>{m.marca} {m.modelo}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="flex items-start gap-1.5 text-xs font-bold text-red-600">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button onClick={onCerrar} variant="outline" disabled={guardando} className="!py-2.5 !text-sm">Cancelar</Button>
            <Button onClick={enviar} icon={Plus} disabled={guardando} className="!py-2.5 !text-sm">
              {guardando ? 'Guardando…' : (modo === 'serie' && totalDias > 1 ? `Bloquear ${totalDias} días` : 'Guardar')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalMes({
  mesActual,
  onCambiarMes,
  fechaSeleccionada,
  bloqueos,
  reservas,
  onSeleccionar,
  onCerrar
}) {
  const contenedorRef = useRef(null);
  useFocusTrap(contenedorRef, onCerrar);
  const hoy = fechaVetHoy();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="elegir-dia-titulo"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 id="elegir-dia-titulo" className="text-sm font-black uppercase text-gray-900">Elegir día</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSeleccionar(hoy)}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-700"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600"
              aria-label="Cerrar calendario"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <ProveedorMiniCalendario
          compacto
          bloqueos={bloqueos}
          reservas={reservas}
          mesActual={mesActual}
          onCambiarMes={onCambiarMes}
          onFechaClick={(fecha) => onSeleccionar(aISO(fecha))}
          fechaSeleccionada={fechaSeleccionada}
        />
      </div>
    </div>
  );
}

export default function ProveedorAgenda({ reservas = [], cargandoReservas = false }) {
  const { user, motos, horarios, sedes, instructores, estados, municipios, ciudades } = useContext(AppContext);
  const { showToast } = useToast();
  const { bloqueos, loading, invalidarCache, recargar } = useProveedorBloqueos(user?.uid);

  const hoy = fechaVetHoy();
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy);
  const [mesActual, setMesActual] = useState(new Date());
  const [modalMes, setModalMes] = useState(false);
  const [modalBloqueo, setModalBloqueo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const [bloqueoAEliminar, setBloqueoAEliminar] = useState(null);
  const autoSeleccionRef = useRef(false);
  const guardandoRef = useRef(false);

  useEffect(() => {
    guardandoRef.current = guardando;
  }, [guardando]);

  const misMotos = useMemo(
    () => (motos || []).filter((m) => String(m.proveedorId) === String(user?.uid)),
    [motos, user?.uid]
  );

  // La regla permite lectura pública de bloqueos; solo se pintan los propios.
  const bloqueosPropios = useMemo(
    () => (bloqueos || []).filter((b) => esBloqueoPropio(b, user?.uid)),
    [bloqueos, user?.uid]
  );

  const entradas = useMemo(
    () => construirEntradasAgenda({
      reservas,
      bloqueos: bloqueosPropios,
      horarios,
      hoy,
      proveedorId: user?.uid
    }),
    [reservas, bloqueosPropios, horarios, hoy, user?.uid]
  );

  const reservasVisibles = useMemo(
    () => entradas
      .filter((entrada) => entrada.tipo === 'sesion')
      .map((entrada) => ({ fecha: entrada.fecha })),
    [entradas]
  );

  const entradasPorFecha = useMemo(() => {
    const mapa = new Map();
    entradas.forEach((entrada) => {
      if (!mapa.has(entrada.fecha)) mapa.set(entrada.fecha, []);
      mapa.get(entrada.fecha).push(entrada);
    });
    return mapa;
  }, [entradas]);

  const proximos7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => sumarDiasISO(hoy, i)),
    [hoy]
  );

  const cargando = cargandoReservas || loading;

  useEffect(() => {
    if (autoSeleccionRef.current || cargando) return;
    const hoyConEventos = (entradasPorFecha.get(hoy) || []).length > 0;
    if (!hoyConEventos && entradas.length > 0) {
      setDiaSeleccionado(entradas[0].fecha);
    }
    autoSeleccionRef.current = true;
  }, [cargando, entradas, entradasPorFecha, hoy]);

  const entradasDia = useMemo(
    () => entradasPorFecha.get(diaSeleccionado) || [],
    [entradasPorFecha, diaSeleccionado]
  );
  const sesionesDia = entradasDia.filter((e) => e.tipo === 'sesion').length;
  const bloqueosDia = entradasDia.filter((e) => e.tipo === 'bloqueo').length;
  const prefijoDia = etiquetaDia(diaSeleccionado, hoy);

  const nombreMoto = (id) => {
    if (!id) return '';
    const moto = misMotos.find((m) => String(m.id) === String(id));
    return moto ? `${moto.marca} ${moto.modelo}` : 'Moto no disponible';
  };

  const seleccionarDia = (fecha) => {
    autoSeleccionRef.current = true;
    setDiaSeleccionado(fecha);
    setModalMes(false);
  };

  const abrirModalBloqueo = () => {
    setErrorGuardar('');
    setModalBloqueo(true);
  };

  const cerrarModalBloqueo = useCallback(() => {
    if (guardandoRef.current) return;
    setModalBloqueo(false);
    setErrorGuardar('');
  }, []);

  const cerrarModalMes = useCallback(() => setModalMes(false), []);

  const guardarBloqueo = async ({ fechas, horaInicio, horaFin, motoId }) => {
    if (!user?.uid) return;
    const lista = (fechas || []).filter(Boolean);
    if (!lista.length) {
      setErrorGuardar('Elige al menos un día para bloquear.');
      return;
    }
    if (lista.length > 90) {
      setErrorGuardar('Máximo 90 días por serie.');
      return;
    }

    const nuevas = lista.filter((fecha) => !bloqueosPropios.some((bloqueo) => (
      bloqueo.fecha === fecha &&
      bloqueo.horaInicio === horaInicio &&
      bloqueo.horaFin === horaFin &&
      String(bloqueo.motoId || 'ALL') === String(motoId || 'ALL')
    )));

    if (!nuevas.length) {
      setErrorGuardar('Esos días ya están bloqueados en ese horario.');
      return;
    }

    setGuardando(true);
    setErrorGuardar('');
    try {
      const batch = writeBatch(db);
      nuevas.forEach((fecha) => {
        const ref = doc(collection(db, 'bloqueosGlobales'));
        batch.set(ref, {
          proveedorId: user.uid,
          motoId,
          fecha,
          horaInicio,
          horaFin,
          createdAt: new Date()
        });
      });
      await batch.commit();
      showToast(
        nuevas.length === 1 ? 'Bloqueo creado' : `${nuevas.length} bloqueos creados`,
        'success'
      );
      invalidarCache();
      await recargar({ forzar: true });
      autoSeleccionRef.current = true;
      setDiaSeleccionado(nuevas[0]);
      setModalBloqueo(false);
    } catch (e) {
      console.error('[ProveedorAgenda] Error creando bloqueo:', e);
      setErrorGuardar('No pudimos crear el bloqueo. Intenta de nuevo.');
      showToast('No se pudo crear el bloqueo', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarBloqueo = async () => {
    if (!bloqueoAEliminar) return;
    try {
      await deleteDoc(doc(db, 'bloqueosGlobales', bloqueoAEliminar.id));
      showToast('Bloqueo eliminado', 'success');
      invalidarCache();
      await recargar({ forzar: true });
    } catch (e) {
      console.error('[ProveedorAgenda] Error eliminando bloqueo:', e);
      showToast('No se pudo eliminar el bloqueo', 'error');
    } finally {
      setBloqueoAEliminar(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex shrink-0 items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-black uppercase text-gray-900">Agenda</h2>
          <p className="text-[11px] text-gray-500">Tus próximos 7 días y bloqueos.</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => recargar({ forzar: true })}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            aria-label="Actualizar agenda"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-gray-500' : ''} />
          </button>
          <button
            type="button"
            onClick={abrirModalBloqueo}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700"
            aria-label="Agregar bloqueo"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      <section className="shrink-0">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Próximos 7 días</span>
          <button
            type="button"
            onClick={() => setModalMes(true)}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-700"
          >
            <CalendarDays size={12} /> Ver mes
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {proximos7.map((fecha) => {
            const total = (entradasPorFecha.get(fecha) || []).length;
            const sesiones = (entradasPorFecha.get(fecha) || []).filter((e) => e.tipo === 'sesion').length;
            const bloqueosDiaChip = (entradasPorFecha.get(fecha) || []).filter((e) => e.tipo === 'bloqueo').length;
            const seleccionado = fecha === diaSeleccionado;
            return (
              <button
                type="button"
                key={fecha}
                onClick={() => seleccionarDia(fecha)}
                aria-pressed={seleccionado}
                aria-label={`${diaSemanaCorto(fecha)} ${numeroDia(fecha)} de ${mesLargo(fecha)}: ${total} eventos`}
                className={`flex min-w-0 flex-col items-center rounded-xl py-1.5 transition-colors ${
                  seleccionado
                    ? 'bg-[#0f172a] text-white shadow-md'
                    : fecha === hoy
                      ? 'bg-white text-gray-800 ring-1 ring-blue-200'
                      : 'bg-white text-gray-700 ring-1 ring-gray-100 hover:bg-gray-50'
                }`}
              >
                <span className="text-[9px] font-bold uppercase">{diaSemanaCorto(fecha)}</span>
                <span className="text-sm font-black leading-tight">{numeroDia(fecha)}</span>
                <span className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                  {sesiones > 0 && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-blue-300' : 'bg-blue-500'}`} />}
                  {bloqueosDiaChip > 0 && <span className={`h-1.5 w-1.5 rounded-full ${seleccionado ? 'bg-red-300' : 'bg-red-500'}`} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {!proximos7.includes(diaSeleccionado) && (
        <button
          type="button"
          onClick={() => seleccionarDia(hoy)}
          className="shrink-0 text-left text-[10px] font-bold text-blue-700"
        >
          ← Volver a los próximos 7 días
        </button>
      )}

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 px-1 pb-1.5">
          <h3 className="min-w-0 truncate text-xs font-black uppercase tracking-wider text-gray-500">
            {prefijoDia && <span className="text-blue-600">{prefijoDia} · </span>}
            {formatearFechaSinAnio(diaSeleccionado)}
          </h3>
          <span className="shrink-0 text-[10px] text-gray-400">
            {sesionesDia} ses · {bloqueosDia} bloq.
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
          {cargando && entradasDia.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-xs text-gray-500">
              Cargando agenda…
            </div>
          ) : entradasDia.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center">
              <Calendar size={24} className="mx-auto mb-1.5 text-gray-300" />
              <p className="text-xs font-black text-gray-800">Sin eventos este día</p>
              <p className="mt-0.5 text-[10px] text-gray-500">Elige otro día o bloquea tu disponibilidad.</p>
              <button
                type="button"
                onClick={abrirModalBloqueo}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700"
              >
                <Plus size={12} /> Agregar bloqueo
              </button>
            </div>
          ) : (
            entradasDia.map((entrada) => {
              if (entrada.tipo === 'bloqueo') {
                const { bloqueo } = entrada;
                const ambito = bloqueo.motoId === 'ALL'
                  ? 'Todas mis motos'
                  : (nombreMoto(bloqueo.motoId) || 'Moto no disponible');
                return (
                  <div key={entrada.key} className="flex items-start gap-2.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                      <Lock size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase text-red-600">Bloqueo</span>
                        <span className="text-[11px] font-bold text-gray-800">{entrada.horaLabel}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">{ambito}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBloqueoAEliminar(bloqueo)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-500 hover:bg-red-50"
                      aria-label={`Eliminar bloqueo ${entrada.horaLabel}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              }

              const { reserva } = entrada;
              const sede = (sedes || []).find((s) => String(s.id) === String(reserva.sedeId));
              const instructor = (instructores || []).find((i) => String(i.id) === String(reserva.instructorId));
              const estado = estadoSesion(entrada);
              return (
                <div key={entrada.key} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Bike size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700">Sesión</span>
                        {reserva.fecha2 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-600">
                            Día {entrada.dia}
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${estado.clase}`}>
                          {estado.label}
                        </span>
                        <span className="ml-auto text-[11px] font-black text-gray-800">{entrada.horaLabel}</span>
                      </div>
                      <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-gray-600">
                        <Bike size={11} className="shrink-0 text-gray-400" />
                        <span className="truncate">{nombreMoto(entrada.motoId) || 'Moto por asignar'}</span>
                      </p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-gray-600">
                        <MapPin size={11} className="shrink-0 text-gray-400" />
                        <span className="truncate">{formatearSede(sede, { catalogos: { estados, municipios, ciudades } })}</span>
                      </p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-gray-500">
                        <User size={11} className="shrink-0 text-gray-400" />
                        <span className="truncate">
                          Tutor: {instructor ? `${instructor.nombre} ${instructor.apellido || ''}`.trim() : 'No asignado'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {modalBloqueo && (
        <ModalNuevoBloqueo
          hoy={hoy}
          fechaInicial={diaSeleccionado >= hoy ? diaSeleccionado : hoy}
          misMotos={misMotos}
          onCerrar={cerrarModalBloqueo}
          onGuardar={guardarBloqueo}
          guardando={guardando}
          errorExterno={errorGuardar}
        />
      )}

      {modalMes && (
        <ModalMes
          mesActual={mesActual}
          onCambiarMes={setMesActual}
          fechaSeleccionada={diaSeleccionado}
          bloqueos={bloqueosPropios}
          reservas={reservasVisibles}
          onSeleccionar={seleccionarDia}
          onCerrar={cerrarModalMes}
        />
      )}

      {bloqueoAEliminar && (
        <ModalConfirmacion
          titulo="Eliminar bloqueo"
          mensaje={`Se liberará ${bloqueoAEliminar.horaInicio} - ${bloqueoAEliminar.horaFin} del ${formatearFechaSinAnio(bloqueoAEliminar.fecha)}.`}
          onConfirm={eliminarBloqueo}
          onCancel={() => setBloqueoAEliminar(null)}
        />
      )}
    </div>
  );
}
