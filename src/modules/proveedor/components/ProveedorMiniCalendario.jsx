import { useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Lock, Bike } from 'lucide-react';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const aISO = (fecha) => [
  fecha.getFullYear(),
  String(fecha.getMonth() + 1).padStart(2, '0'),
  String(fecha.getDate()).padStart(2, '0')
].join('-');

export default function ProveedorMiniCalendario({
  bloqueos = [],
  reservas = [],
  mesActual,
  onFechaClick,
  onCambiarMes,
  fechaSeleccionada = '',
  compacto = false
}) {
  const diasDelMes = useMemo(() => {
    const anio = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const dias = [];
    for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
      dias.push(new Date(d));
    }
    const diasConOffset = [];
    for (let i = 0; i < primerDia.getDay(); i += 1) {
      diasConOffset.push(null);
    }
    return [...diasConOffset, ...dias];
  }, [mesActual]);

  const bloqueosActivos = useMemo(
    () => (bloqueos || []).filter((b) => b && b.fecha),
    [bloqueos]
  );

  const reservasVigentes = useMemo(
    () => (reservas || []).filter((r) => r && r.estadoPago !== 'Cancelado' && r.estadoCurso !== 'Cancelado'),
    [reservas]
  );

  const tieneBloqueo = (fechaISO) => bloqueosActivos.some((b) => b.fecha === fechaISO);
  const tieneReserva = (fechaISO) => reservasVigentes.some((r) => r.fecha === fechaISO || r.fecha2 === fechaISO);
  const hoyISO = aISO(new Date());

  const cambiarMes = (delta) => {
    if (!onCambiarMes) return;
    onCambiarMes(new Date(mesActual.getFullYear(), mesActual.getMonth() + delta, 1));
  };

  const tituloMes = mesActual.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });

  return (
    <div className={compacto ? '' : 'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm'}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase text-gray-900">
          <Calendar size={16} className="text-blue-500" />
          {tituloMes}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => cambiarMes(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => cambiarMes(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="py-1 text-center text-[10px] font-bold text-gray-500">{dia}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {diasDelMes.map((dia, i) => {
          if (!dia) return <div key={`empty-${i}`} className="rounded-lg p-2" />;
          const iso = aISO(dia);
          const bloqueado = tieneBloqueo(iso);
          const reservado = tieneReserva(iso);
          const esHoy = iso === hoyISO;
          const esSeleccionado = iso === fechaSeleccionada;
          return (
            <button
              type="button"
              key={iso}
              onClick={() => onFechaClick && onFechaClick(dia)}
              aria-pressed={esSeleccionado}
              aria-label={`${dia.getDate()} de ${tituloMes}${bloqueado ? ', con bloqueos' : ''}${reservado ? ', con reservas' : ''}`}
              className={`relative rounded-lg p-2 text-sm font-medium transition-colors ${
                bloqueado ? 'border border-red-200 bg-red-50' : ''
              } ${reservado && !bloqueado ? 'border border-blue-200 bg-blue-50' : ''} ${
                esSeleccionado ? 'ring-2 ring-blue-500' : ''
              } ${esHoy ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {dia.getDate()}
              {bloqueado && <Lock size={10} className="absolute right-0.5 top-0.5 text-red-500" />}
              {reservado && !bloqueado && <Bike size={10} className="absolute right-0.5 top-0.5 text-blue-500" />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-gray-600">
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded border border-red-200 bg-red-50" /> Con bloqueos</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded border border-blue-200 bg-blue-50" /> Con reservas</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-blue-100" /> Hoy</div>
      </div>
    </div>
  );
}
