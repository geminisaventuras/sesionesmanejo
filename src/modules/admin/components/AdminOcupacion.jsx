// @build: 2026-11-24 | id: ADMIN-OCUPACION-MOVIL | desc: Layout móvil de Ocupación con selector de los 7 días, lista de sedes del día elegido y atajo al día con sedes (T-104).
import { useContext, useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { LockService } from '../../inscripcion/services/LockService';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { FiltrosSistema, construirResumenActivo } from '../../shared/components/filtros';
import { ordenarHorarios } from '../../shared/utils/horarios';
import { formatearSede } from '../../shared/utils/sedesHelpers';
import { etiquetaMoto } from '../../shared/utils/motosHelpers';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';
import { useOcupacionPorRango } from '../../../hooks/useOcupacionPorRango';
import { calcularEstadoBloque, construirRangoFechas } from '../utils/ocupacionHelpers';
import { agregarSedesDia, indiceDiaConSedes, siguienteDiaConSedes } from '../utils/ocupacionMovil';
import { limpiarSeleccionesOcupacion, opcionesFiltrosOcupacion } from '../utils/filtrosOcupacion';
import {
  Calendar, MapPin, BookOpen, Activity, Wallet, Settings, Lock, Clock,
  ChevronRight, ArrowLeft, Eraser, XCircle
} from 'lucide-react';

const CONFIG_ESTADO = {
  libre: { color: 'bg-green-100 text-green-700 border-green-300', icon: null },
  parcial: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: null },
  lleno: { color: 'bg-red-100 text-red-700 border-red-300', icon: null },
  retenido: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
  bloqueado: { color: 'bg-gray-200 text-gray-700 border-gray-400', icon: Lock },
  cerrado: { color: 'bg-gray-100 text-gray-500 border-gray-300', icon: XCircle },
  parcial_bloqueado: { color: 'bg-gray-100 text-gray-600 border-gray-300', icon: null },
};

// Una sola fila, sin «Parcial bloq.»: si no cabe, la fila hace scroll horizontal.
const LEYENDA_ESTADOS = [
  { label: 'Libre', color: 'bg-green-100 border-green-300' },
  { label: 'Parcial', color: 'bg-yellow-100 border-yellow-300' },
  { label: 'Lleno', color: 'bg-red-100 border-red-300' },
  { label: 'Retenido', color: 'bg-blue-100 border-blue-300 border-dashed', icon: Clock },
  { label: 'Bloqueado', color: 'bg-gray-200 border-gray-400' },
  { label: 'Cerrado', color: 'bg-gray-100 border-gray-300', icon: XCircle },
];

const CHIP_DIA = {
  libre: 'bg-green-100 text-green-700 border-green-300',
  parcial: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  lleno: 'bg-red-100 text-red-700 border-red-300',
  sin_datos: 'bg-gray-100 text-gray-500 border-gray-200',
};

// dd/mm a partir del string VET `YYYY-MM-DD`; no reinterpreta la fecha.
const formatearDia = (fecha) => {
  if (typeof fecha !== 'string' || fecha.length < 10) return fecha || '';
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
};

// Estado agregado del día por sede (solo presentación: deriva de `matriz.porSede`).
const estadoDiaSede = (datos) => {
  if (!datos?.total) return { label: 'Sin datos', color: CHIP_DIA.sin_datos };
  if (datos.disponibles <= 0) return { label: 'Lleno', color: CHIP_DIA.lleno };
  if (datos.disponibles < datos.total) return { label: 'Parcial', color: CHIP_DIA.parcial };
  return { label: 'Libre', color: CHIP_DIA.libre };
};

const describirCelda = ({ bloque, fecha, info, sedeNombre }) => {
  const partes = [];
  if (sedeNombre) partes.push(sedeNombre);
  partes.push(bloque?.label || 'Bloque', fecha, String(info?.estado || '').replace('_', ' '));
  if (info?.estado === 'bloqueado') {
    if (info.motivo) partes.push(`motivo: ${info.motivo}`);
  } else if (info?.estado === 'cerrado') {
    partes.push('horario vencido');
  } else {
    partes.push(`${info?.disponibles ?? 0}/${info?.total ?? 0} disponibles`);
    if (info?.instructores?.total > 0) {
      partes.push(`tutores ${info.instructores.disponibles}/${info.instructores.total}`);
    }
    if (info?.motos?.requerida) {
      partes.push(`motos ${info.motos.disponibles}/${info.motos.total}`);
    }
  }
  if (info?.locks?.length) {
    partes.push(`${info.locks.length} retenido${info.locks.length === 1 ? '' : 's'}`);
  }
  return partes.join(' · ');
};

function CeldaOcupacion({ bloque, fecha, info, sedeNombre, onSeleccionar }) {
  if (!info) {
    return (
      <div
        aria-hidden="true"
        className="flex h-11 min-w-[44px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-[11px] font-bold text-gray-300"
      >
        —
      </div>
    );
  }
  const config = CONFIG_ESTADO[info.estado] || CONFIG_ESTADO.lleno;
  const Icono = config.icon;
  const esBloqueado = info.estado === 'bloqueado';
  const esCerrado = info.estado === 'cerrado';
  const sinRecursos = !esBloqueado && !esCerrado && info.total === 0 && info.disponibles === 0 && !info.motivo;
  const esRetenido = info.estado === 'retenido';
  const descripcion = describirCelda({ bloque, fecha, info, sedeNombre });

  return (
    <button
      type="button"
      onClick={() => onSeleccionar?.({ fecha, bloque, info, sedeNombre })}
      title={descripcion}
      aria-label={descripcion}
      className={`flex h-11 w-full min-w-[44px] items-center justify-center gap-0.5 rounded-lg border text-[10.5px] font-extrabold leading-none transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${config.color} ${esRetenido ? 'border-dashed' : ''}`}
    >
      {esBloqueado ? (
        <Icono size={14} aria-hidden="true" />
      ) : esCerrado ? (
        <Icono size={14} aria-hidden="true" />
      ) : sinRecursos ? (
        <span className="text-gray-400">—</span>
      ) : (
        <>
          {esRetenido ? <Clock size={11} aria-hidden="true" /> : null}
          <span>{info.disponibles}/{info.total}</span>
        </>
      )}
    </button>
  );
}

function MatrizOcupacion({ dias, bloques, obtenerInfo, onSeleccionar, sedeNombre, ariaLabel }) {
  return (
    <div className="min-w-0 overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[364px] border-separate border-spacing-0" aria-label={ariaLabel}>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 w-14 border-b border-gray-100 bg-gray-50 p-1 text-left text-[10px] font-extrabold uppercase tracking-wide text-gray-600"
            >
              Bloque
            </th>
            {dias.map((fecha) => (
              <th
                key={fecha}
                scope="col"
                title={fecha}
                className="border-b border-gray-100 bg-gray-50 p-1 text-center text-[10px] font-extrabold text-gray-700"
              >
                {formatearDia(fecha)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bloques.map((bloque) => (
            <tr key={bloque.id}>
              <th
                scope="row"
                className="sticky left-0 z-10 w-14 border-b border-gray-100 bg-white p-1 text-left text-[10px] font-bold leading-tight text-gray-700"
              >
                <span className="block truncate" title={bloque.label}>
                  {bloque.label.split(' - ')[0]}
                </span>
              </th>
              {dias.map((fecha) => (
                <td key={fecha} className="border-b border-gray-100 p-0.5 align-middle">
                  <CeldaOcupacion
                    bloque={bloque}
                    fecha={fecha}
                    info={obtenerInfo(fecha, bloque.id)}
                    sedeNombre={sedeNombre}
                    onSeleccionar={onSeleccionar}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResumenSede({ nombre, datos }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-2.5">
      <p className="m-0 flex min-w-0 items-center gap-1 text-[11.5px] font-extrabold text-gray-900">
        <MapPin size={12} aria-hidden="true" className="shrink-0 text-gray-400" />
        <span className="min-w-0 break-words leading-tight" title={nombre}>{nombre}</span>
      </p>
      <dl className="m-0 mt-1.5 grid grid-cols-4 gap-1 text-center">
        <div className="min-w-0">
          <dt className="m-0 text-[9px] font-bold uppercase tracking-wide text-gray-500">Libres</dt>
          <dd className="m-0 text-[13px] font-extrabold leading-tight text-green-700">{datos.disponibles}</dd>
        </div>
        <div className="min-w-0">
          <dt className="m-0 text-[9px] font-bold uppercase tracking-wide text-gray-500">Ocup.</dt>
          <dd className="m-0 text-[13px] font-extrabold leading-tight text-gray-800">{datos.ocupados}</dd>
        </div>
        <div className="min-w-0">
          <dt className="m-0 text-[9px] font-bold uppercase tracking-wide text-gray-500">Reten.</dt>
          <dd className={`m-0 text-[13px] font-extrabold leading-tight ${datos.retenidos > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
            {datos.retenidos}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="m-0 text-[9px] font-bold uppercase tracking-wide text-gray-500">Bloq.</dt>
          <dd className={`m-0 text-[13px] font-extrabold leading-tight ${datos.bloqueados > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
            {datos.bloqueados}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function MensajeEstado({ children, tono = 'neutro' }) {
  return (
    <p
      role={tono === 'error' ? 'alert' : undefined}
      className={`m-0 rounded-xl bg-white p-6 text-center text-xs font-bold ${tono === 'error' ? 'text-red-600' : 'text-gray-500'}`}
    >
      {children}
    </p>
  );
}

// Acción secundaria compacta (no ocupa una fila completa en el inicio móvil).
function AccionPurgarLocks({ onClick, purgando }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={purgando}
      title="Purgar locks corruptos o expirados de los 7 días"
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1.5 text-[10.5px] font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Eraser size={13} aria-hidden="true" />
      {purgando ? 'Purgando...' : 'Purgar locks'}
    </button>
  );
}

function FilaSedeDia({ nombre, datos, fecha, onAbrir }) {
  const chip = estadoDiaSede(datos);
  const retenidos = datos.retenidos > 0
    ? ` · ${datos.retenidos} retenido${datos.retenidos === 1 ? '' : 's'}`
    : '';
  const bloqueados = datos.bloqueados > 0 ? ` · ${datos.bloqueados} bloq.` : '';

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`Abrir detalle de ${nombre}: ${datos.disponibles} de ${datos.total} cupos libres, ${chip.label}, ${formatearDia(fecha)}.`}
      className="flex min-h-[60px] w-full min-w-0 items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
    >
      <MapPin size={14} aria-hidden="true" className="shrink-0 text-gray-400" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-extrabold leading-tight text-gray-900" title={nombre}>
          {nombre}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-semibold text-gray-500">
          {formatearDia(fecha)}{retenidos}{bloqueados}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[15px] font-extrabold leading-none tabular-nums text-gray-900">
          {datos.disponibles}/{datos.total}
        </span>
        <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wide text-gray-500">libres</span>
      </span>
      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9.5px] font-extrabold ${chip.color}`}>
        {chip.label}
      </span>
      <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-gray-300" />
    </button>
  );
}

const AdminOcupacion = memo(() => {
  const { horarios, sedes, instructores, motos, cursos, user, logoutUser, estados, municipios, ciudades } = useContext(AppContext);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Fecha por defecto en VET (America/Caracas), nunca en UTC.
  const [fechaInicial] = useState(() => {
    try { return obtenerFechaVenezuela(); } catch (e) { return ''; }
  });
  const [fechaInicio, setFechaInicio] = useState(fechaInicial);
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroInstructor, setFiltroInstructor] = useState('');
  const [filtroMoto, setFiltroMoto] = useState('');
  const [sheetAbierto, setSheetAbierto] = useState(false);

  const [bloqueosAdmin, setBloqueosAdmin] = useState([]);
  const [bloqueosInstructores, setBloqueosInstructores] = useState([]);
  const [bloqueosProveedor, setBloqueosProveedor] = useState([]);
  const [celdaSeleccionada, setCeldaSeleccionada] = useState(null);
  const [purgandoLocks, setPurgandoLocks] = useState(false);

  // ERR-051: tick de 60 s para que un bloque que cruza su hora de inicio pase
  // a "cerrado" sin recargar. Se inyecta como `ahora` en la matriz.
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(intervalo);
  }, []);

  // Ventana de 7 días sobre el string VET; un campo vacío/inválido no lanza.
  const rango = useMemo(() => construirRangoFechas(fechaInicio, 7), [fechaInicio]);
  const fechaFin = rango.fechaFin;
  const dias = rango.dias;

  const {
    reservas: reservasSemana,
    ocupacion: ocupacionSemana,
    locks: locksSemana,
    cargando: cargandoOcupacion,
    error: errorOcupacion
  } = useOcupacionPorRango(rango.fechaInicio, rango.fechaFin);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setBloqueosAdmin([]);
      setBloqueosInstructores([]);
      setBloqueosProveedor([]);
      return;
    }
    const cargar = async () => {
      try {
        const qAdmin = query(
          collection(db, 'bloqueosAdmin'),
          where('fechaInicio', '<=', fechaFin)
        );
        const snapAdmin = await getDocs(qAdmin);
        setBloqueosAdmin(snapAdmin.docs.map(d => ({ id: d.id, ...d.data() })));

        const qInst = query(
          collection(db, 'bloqueosInstructores'),
          where('estado', '==', 'activo')
        );
        const snapInst = await getDocs(qInst);
        setBloqueosInstructores(snapInst.docs.map(d => ({ id: d.id, ...d.data() })));

        const qProv = query(
          collection(db, 'bloqueosGlobales'),
          where('fecha', '>=', fechaInicio),
          where('fecha', '<=', fechaFin)
        );
        const snapProv = await getDocs(qProv);
        setBloqueosProveedor(snapProv.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Error cargando bloqueos:', error);
      }
    };
    cargar();
  }, [fechaInicio, fechaFin]);

  const bloquesActivos = useMemo(() => ordenarHorarios((horarios || []).filter(h => h.activo && !h.isLunch)), [horarios]);

  const matriz = useMemo(() => {
    const result = {};
    const filtros = {
      sedeId: filtroSede || null,
      cursoId: filtroCurso || null,
      instructorId: filtroInstructor || null,
      motoId: filtroMoto || null,
    };

    for (const fecha of dias) {
      result[fecha] = {};
      for (const bloque of bloquesActivos) {
        result[fecha][bloque.id] = calcularEstadoBloque({
          fecha,
          bloque,
          instructores: instructores || [],
          motos: motos || [],
          cursos: cursos || [],
          reservas: reservasSemana,
          ocupacion: ocupacionSemana,
          locks: locksSemana,
          bloqueosAdmin,
          bloqueosInstructores,
          bloqueosProveedor,
          filtros,
          ahora,
        });
      }
    }
    return result;
  }, [dias, bloquesActivos, instructores, motos, cursos, reservasSemana, ocupacionSemana, locksSemana, bloqueosAdmin, bloqueosInstructores, bloqueosProveedor, filtroSede, filtroCurso, filtroInstructor, filtroMoto, ahora]);

  const catalogosSede = useMemo(
    () => ({ estados: estados || [], municipios: municipios || [], ciudades: ciudades || [] }),
    [estados, municipios, ciudades]
  );

  const nombreSede = useCallback((sedeId) => {
    const sede = (sedes || []).find((s) => String(s.id) === String(sedeId));
    return sede ? formatearSede(sede, { catalogos: catalogosSede }) : `Sede ${sedeId}`;
  }, [sedes, catalogosSede]);

  // En «Todas» la vista separa por sede: no se suma el cupo de sedes distintas.
  // Todo se deriva de `porSede` que ya calcula `calcularEstadoBloque` (sin consultas nuevas).
  const vistaPorSede = useMemo(() => {
    if (filtroSede || !rango.valido) return { resumen: [], sinRecursos: [] };
    const porSede = new Map();
    for (const fecha of dias) {
      for (const bloque of bloquesActivos) {
        const info = matriz[fecha]?.[bloque.id];
        const lista = Array.isArray(info?.porSede) ? info.porSede : [];
        for (const sedeInfo of lista) {
          const clave = String(sedeInfo?.sedeId ?? '');
          if (!clave) continue;
          const previo = porSede.get(clave) || {
            sedeId: clave,
            disponibles: 0,
            ocupados: 0,
            retenidos: 0,
            bloqueados: 0,
            celdas: 0,
          };
          const total = Number(sedeInfo.total) || 0;
          const disponibles = Number(sedeInfo.disponibles) || 0;
          porSede.set(clave, {
            sedeId: clave,
            disponibles: previo.disponibles + disponibles,
            ocupados: previo.ocupados + Math.max(0, total - disponibles),
            retenidos: previo.retenidos + (Array.isArray(sedeInfo.locks) ? sedeInfo.locks.length : 0),
            bloqueados: previo.bloqueados + (sedeInfo.estado === 'bloqueado' ? 1 : 0),
            celdas: previo.celdas + 1,
          });
        }
      }
    }

    const ordenCatalogo = new Map((sedes || []).map((sede, indice) => [String(sede.id), indice]));
    const ordenarPorCatalogo = (a, b) => {
      const ia = ordenCatalogo.has(a) ? ordenCatalogo.get(a) : Number.MAX_SAFE_INTEGER;
      const ib = ordenCatalogo.has(b) ? ordenCatalogo.get(b) : Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return String(a).localeCompare(String(b));
    };

    const conDatos = Array.from(porSede.values()).sort((a, b) => ordenarPorCatalogo(a.sedeId, b.sedeId));
    const resumen = conDatos.filter((s) =>
      s.disponibles > 0 || s.ocupados > 0 || s.retenidos > 0 || s.bloqueados > 0
    );
    const incluidas = new Set(resumen.map((s) => s.sedeId));
    const presentes = new Set(conDatos.map((s) => s.sedeId));
    const sinRecursos = [
      ...conDatos.filter((s) => !incluidas.has(s.sedeId)).map((s) => s.sedeId),
      ...(sedes || [])
        .filter((sede) => sede.activo && !presentes.has(String(sede.id)))
        .map((sede) => String(sede.id)),
    ]
      .filter((valor, indice, lista) => lista.indexOf(valor) === indice)
      .sort(ordenarPorCatalogo);

    return { resumen, sinRecursos };
  }, [filtroSede, rango.valido, dias, bloquesActivos, matriz, sedes]);

  // T-104: la lista móvil se calcula para los 7 días (mismo `porSede`, sin consultas nuevas)
  // para que el usuario pueda elegir día y para detectar dónde sí hay sedes.
  const vistasPorDia = useMemo(() => {
    if (filtroSede || !rango.valido || dias.length === 0) return [];
    return dias.map((fecha) => agregarSedesDia({
      fecha,
      bloques: bloquesActivos,
      matriz,
      sedes,
    }));
  }, [filtroSede, rango.valido, dias, bloquesActivos, matriz, sedes]);

  // La selección guarda la ventana: si cambian los `dias`, vuelve al día por defecto.
  const ventanaClave = dias[0] || '';
  const [seleccionDia, setSeleccionDia] = useState({ ventana: '', fecha: '' });
  const fechaElegida = seleccionDia.ventana === ventanaClave && seleccionDia.fecha
    ? seleccionDia.fecha
    : null;

  const indicePorDefecto = useMemo(() => indiceDiaConSedes(vistasPorDia), [vistasPorDia]);

  const indiceDiaSeleccionado = useMemo(() => {
    const indice = fechaElegida ? dias.indexOf(fechaElegida) : -1;
    return indice >= 0 ? indice : indicePorDefecto;
  }, [fechaElegida, dias, indicePorDefecto]);

  const vistaDiaSede = vistasPorDia[indiceDiaSeleccionado] || [];
  const fechaDiaSeleccionado = dias[indiceDiaSeleccionado] || '';
  const indiceSiguienteConSedes = vistaDiaSede.length === 0
    ? siguienteDiaConSedes(vistasPorDia, indiceDiaSeleccionado)
    : -1;

  const elegirDia = useCallback((fecha) => {
    setSeleccionDia({ ventana: ventanaClave, fecha: fecha || '' });
  }, [ventanaClave]);

  const obtenerInfoSede = (sedeId) => (fecha, bloqueId) => {
    const info = matriz[fecha]?.[bloqueId];
    const lista = Array.isArray(info?.porSede) ? info.porSede : [];
    return lista.find((sedeInfo) => String(sedeInfo.sedeId) === String(sedeId)) || null;
  };

  const manejarCambioFiltro = useCallback((campoId, valor) => {
    if (campoId === 'fechaInicio') {
      setFechaInicio(valor ?? '');
      return;
    }
    // ERR-038: conserva el campo cambiado y limpia dependientes imposibles.
    const limpio = limpiarSeleccionesOcupacion({
      cursos: cursos || [],
      instructores: instructores || [],
      motos: motos || [],
      seleccion: {
        filtroSede,
        filtroCurso,
        filtroInstructor,
        filtroMoto,
        [campoId]: valor ?? '',
      },
      campoCambiado: campoId,
    });
    setFiltroSede(limpio.filtroSede);
    setFiltroCurso(limpio.filtroCurso);
    setFiltroInstructor(limpio.filtroInstructor);
    setFiltroMoto(limpio.filtroMoto);
  }, [cursos, instructores, motos, filtroSede, filtroCurso, filtroInstructor, filtroMoto]);

  const valoresFiltros = useMemo(() => ({
    fechaInicio,
    filtroSede,
    filtroCurso,
    filtroInstructor,
    filtroMoto,
  }), [fechaInicio, filtroSede, filtroCurso, filtroInstructor, filtroMoto]);

  // Opciones dependientes con las demás selecciones aplicadas (sin ciclos).
  const opcionesDependientes = useMemo(() => opcionesFiltrosOcupacion({
    cursos: cursos || [],
    instructores: instructores || [],
    motos: motos || [],
    seleccion: valoresFiltros,
  }), [cursos, instructores, motos, valoresFiltros]);

  const camposFiltros = useMemo(() => {
    const sedesActivas = (sedes || []).filter((sede) => sede.activo);
    const rangoTexto = rango.valido
      ? `Ventana de 7 días: ${formatearDia(dias[0])} al ${formatearDia(fechaFin)}.`
      : 'Elige una fecha para ver 7 días.';
    const cursosDisponibles = opcionesDependientes.cursos;
    const instructoresDisponibles = opcionesDependientes.instructores;
    const motosDisponibles = opcionesDependientes.motos;
    const sinTutoresHabilitados = Boolean(filtroCurso) && instructoresDisponibles.length === 0;

    const campos = [
      {
        id: 'fechaInicio',
        etiqueta: 'Fecha de inicio',
        tipo: 'fecha',
        grupo: 'Periodo',
        defecto: fechaInicial,
        ayuda: rangoTexto,
        // La fecha no cuenta como filtro activo: define la ventana, no filtra sedes.
        esActivo: () => false,
        resumen: () => rangoTexto,
      },
      {
        id: 'filtroSede',
        etiqueta: 'Sede',
        tipo: 'select',
        grupo: 'Ubicación',
        ayuda: 'En «Todas» la ocupación se muestra separada por sede.',
        opciones: [
          { valor: '', etiqueta: 'Todas las sedes' },
          ...sedesActivas.map((sede) => ({ valor: sede.id, etiqueta: formatearSede(sede, { catalogos: catalogosSede }) })),
        ],
        resumen: (valor) => {
          const sede = sedesActivas.find((s) => String(s.id) === String(valor));
          return sede ? `Sede ${formatearSede(sede, { catalogos: catalogosSede })}` : 'Sede';
        },
      },
      {
        id: 'filtroCurso',
        etiqueta: 'Curso',
        tipo: 'select',
        grupo: 'Ubicación',
        ayuda: 'Solo cursos disponibles para la sede y los recursos seleccionados.',
        opciones: [
          { valor: '', etiqueta: 'Todos los cursos' },
          ...cursosDisponibles.map((curso) => ({ valor: curso.id, etiqueta: curso.nombre })),
        ],
        resumen: (valor) => (cursos || []).find((curso) => String(curso.id) === String(valor))?.nombre || 'Curso',
      },
      {
        id: 'filtroInstructor',
        etiqueta: 'Instructor',
        tipo: 'select',
        grupo: 'Recursos',
        ayuda: sinTutoresHabilitados
          ? 'Sin tutores disponibles para la sede y el curso seleccionados.'
          : 'Solo tutores activos de la sede permitidos por el curso.',
        opciones: [
          { valor: '', etiqueta: 'Todos los instructores' },
          ...instructoresDisponibles.map((instructor) => ({ valor: instructor.id, etiqueta: instructor.nombre })),
        ],
        resumen: (valor) => (instructores || []).find((i) => String(i.id) === String(valor))?.nombre || 'Instructor',
      },
    ];

    // Curso sin moto: el filtro de moto se oculta (no aplica inventario).
    if (opcionesDependientes.motoHabilitada) {
      campos.push({
        id: 'filtroMoto',
        etiqueta: 'Moto',
        tipo: 'select',
        grupo: 'Recursos',
        ayuda: Boolean(filtroCurso) && motosDisponibles.length === 0
          ? 'No hay motos compatibles con el curso en la sede.'
          : 'Solo motos activas de la sede compatibles con el curso.',
        opciones: [
          { valor: '', etiqueta: 'Todas las motos' },
          ...motosDisponibles.map((moto) => ({ valor: moto.id, etiqueta: etiquetaMoto(moto) })),
        ],
        resumen: (valor) => {
          if (!valor) return 'Moto';
          const moto = (motos || []).find((m) => String(m.id) === String(valor));
          return moto ? etiquetaMoto(moto) : `Moto #${String(valor).slice(-6)}`;
        },
      });
    }

    return campos;
  }, [sedes, cursos, instructores, motos, rango.valido, dias, fechaFin, fechaInicial, opcionesDependientes, filtroCurso, catalogosSede]);

  const valoresIniciales = useMemo(() => ({ fechaInicio: fechaInicial }), [fechaInicial]);

  // Al aplicar el sheet móvil se valida el borrador completo antes de fijarlo.
  const manejarAplicarFiltros = useCallback((borrador = {}) => {
    if (borrador.fechaInicio !== undefined) setFechaInicio(borrador.fechaInicio ?? '');
    const limpio = limpiarSeleccionesOcupacion({
      cursos: cursos || [],
      instructores: instructores || [],
      motos: motos || [],
      seleccion: {
        filtroSede: borrador.filtroSede ?? filtroSede,
        filtroCurso: borrador.filtroCurso ?? filtroCurso,
        filtroInstructor: borrador.filtroInstructor ?? filtroInstructor,
        filtroMoto: borrador.filtroMoto ?? filtroMoto,
      },
    });
    setFiltroSede(limpio.filtroSede);
    setFiltroCurso(limpio.filtroCurso);
    setFiltroInstructor(limpio.filtroInstructor);
    setFiltroMoto(limpio.filtroMoto);
  }, [cursos, instructores, motos, filtroSede, filtroCurso, filtroInstructor, filtroMoto]);

  // Resumen compacto de la barra: primero la ventana de 7 días, luego filtros activos.
  const resumenBarra = useMemo(() => {
    const partes = [];
    if (rango.valido) partes.push(`${formatearDia(dias[0])}–${formatearDia(fechaFin)}`);
    const activos = construirResumenActivo(camposFiltros, valoresFiltros, valoresIniciales);
    return [...partes, ...activos];
  }, [rango.valido, dias, fechaFin, camposFiltros, valoresFiltros, valoresIniciales]);

  useEffect(() => {
    if (!celdaSeleccionada) return undefined;
    const alEscape = (evento) => {
      if (evento.key === 'Escape') setCeldaSeleccionada(null);
    };
    window.addEventListener('keydown', alEscape);
    return () => window.removeEventListener('keydown', alEscape);
  }, [celdaSeleccionada]);

  const handlePurgarLocks = useCallback(async () => {
    if (!dias.length) return showToast('No hay fechas para purgar', 'error');
    if (!window.confirm('¿Deseas purgar todos los locks corruptos/expirados en el rango visible (7 días)?')) return;

    setPurgandoLocks(true);
    let totalPurgados = 0;

    try {
      for (const fecha of dias) {
        const resultado = await LockService.purgarLocksCorruptos(fecha);
        if (resultado.success && resultado.purgados > 0) {
          totalPurgados += resultado.purgados;
        }
      }

      if (totalPurgados > 0) {
        showToast(`Se purgaron ${totalPurgados} locks corruptos/expirados`, 'success');
      } else {
        showToast('No se encontraron locks corruptos para purgar', 'info');
      }
    } catch (error) {
      console.error('[AdminOcupacion] Error purgando locks:', error);
      showToast('Error al purgar locks: ' + error.message, 'error');
    } finally {
      setPurgandoLocks(false);
    }
  }, [dias, showToast]);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  const { notifications } = useContext(AppContext);
  const header = <DashboardHeader title="Ocupación Diaria" onBack={() => navigate('/dashboard')} onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="ocupacion"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  // Leyenda compacta en una sola fila; el scroll queda dentro de la fila.
  const leyenda = (
    <div role="group" aria-label="Leyenda de estados" className="min-w-0 overflow-x-auto overscroll-x-contain">
      <div className="flex w-max min-w-full items-center gap-x-3">
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-gray-600">Estados</span>
        {LEYENDA_ESTADOS.map(({ label, color, icon: Icono }) => (
          <span key={label} className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-gray-700">
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${color}`}>
              {Icono ? <Icono size={8} aria-hidden="true" /> : null}
            </span>
            {label}
          </span>
        ))}
      </div>
    </div>
  );

  const nombreSedeFiltrada = filtroSede ? nombreSede(filtroSede) : '';

  let contenido;
  if (!rango.valido) {
    contenido = <MensajeEstado>Selecciona una fecha válida para ver la ocupación.</MensajeEstado>;
  } else if (errorOcupacion) {
    contenido = (
      <MensajeEstado tono="error">
        No se pudo cargar la ocupación (espejo/locks). La matriz no se muestra para evitar un falso "libre".
      </MensajeEstado>
    );
  } else if (cargandoOcupacion) {
    contenido = <MensajeEstado>Cargando ocupación…</MensajeEstado>;
  } else if (!bloquesActivos.length) {
    contenido = <MensajeEstado>No hay bloques activos para mostrar.</MensajeEstado>;
  } else if (filtroSede) {
    contenido = (
      <section
        aria-label={`Ocupación de ${nombreSedeFiltrada}`}
        className="min-w-0 rounded-2xl border border-gray-100 bg-white p-2.5 sm:p-3"
      >
        <div className="mb-1 flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setFiltroSede('')}
            aria-label="Volver a la lista de sedes"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 lg:hidden"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <h2 className="m-0 flex min-w-0 items-center gap-1.5 text-[12.5px] font-extrabold text-gray-900">
            <MapPin size={13} aria-hidden="true" className="shrink-0 text-gray-400" />
            <span className="truncate" title={nombreSedeFiltrada}>{nombreSedeFiltrada}</span>
          </h2>
        </div>
        <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
          <p className="m-0 text-[10px] font-semibold text-gray-500">
            {formatearDia(dias[0])} al {formatearDia(fechaFin)} · 7 días
          </p>
          <AccionPurgarLocks onClick={handlePurgarLocks} purgando={purgandoLocks} />
        </div>
        <MatrizOcupacion
          dias={dias}
          bloques={bloquesActivos}
          obtenerInfo={(fecha, bloqueId) => matriz[fecha]?.[bloqueId] || null}
          onSeleccionar={setCeldaSeleccionada}
          sedeNombre={nombreSedeFiltrada}
          ariaLabel={`Ocupación de ${nombreSedeFiltrada}`}
        />
        <p className="m-0 mt-1.5 text-[10px] font-semibold text-gray-500 lg:hidden">
          Desliza la matriz horizontalmente para ver los 7 días.
        </p>
      </section>
    );
  } else if (vistaPorSede.resumen.length === 0) {
    contenido = (
      <MensajeEstado>
        Sin recursos para estos filtros en la ventana seleccionada. Prueba otra semana o limpia los filtros.
      </MensajeEstado>
    );
  } else {
    contenido = (
      <div className="min-w-0">
        {/* Móvil: selector de los 7 días + lista de sedes del día elegido. */}
        <div className="min-w-0 lg:hidden">
          <div className="mb-1.5 min-w-0">
            <div
              role="group"
              aria-label="Día de la ventana de 7 días"
              className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain px-1 py-1"
            >
              {dias.map((fecha, indice) => {
                const activo = indice === indiceDiaSeleccionado;
                const conSedes = (vistasPorDia[indice]?.length || 0) > 0;
                return (
                  <button
                    key={fecha}
                    type="button"
                    onClick={() => elegirDia(fecha)}
                    aria-pressed={activo}
                    aria-label={`Ver ocupación del ${formatearDia(fecha)}${conSedes ? ', con sedes' : ', sin sedes'}`}
                    className={`flex min-h-11 min-w-[48px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-extrabold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${activo ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span>{formatearDia(fecha)}</span>
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${conSedes ? 'bg-green-500' : 'bg-gray-300'}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          {vistaDiaSede.length === 0 ? (
            <div className="rounded-xl bg-white p-4 text-center">
              <p className="m-0 text-xs font-bold text-gray-500">
                Sin sedes con cupo para el {formatearDia(fechaDiaSeleccionado)}.
                {indiceSiguienteConSedes >= 0
                  ? ` Hay sedes el ${formatearDia(dias[indiceSiguienteConSedes])}.`
                  : ''}
              </p>
              {indiceSiguienteConSedes >= 0 ? (
                <button
                  type="button"
                  onClick={() => elegirDia(dias[indiceSiguienteConSedes])}
                  className="mt-2 inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[11.5px] font-extrabold text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
                >
                  Ver el {formatearDia(dias[indiceSiguienteConSedes])}
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <h2 className="sr-only">
                Ocupación por sede del {formatearDia(fechaDiaSeleccionado)}
              </h2>
              <ul role="list" className="m-0 list-none space-y-2 p-0">
                {vistaDiaSede.map((sede) => {
                  const nombre = nombreSede(sede.sedeId);
                  return (
                    <li key={sede.sedeId} className="min-w-0">
                      <FilaSedeDia
                        nombre={nombre}
                        datos={sede}
                        fecha={fechaDiaSeleccionado}
                        onAbrir={() => setFiltroSede(sede.sedeId)}
                      />
                    </li>
                  );
                })}
              </ul>
              {vistaPorSede.sinRecursos.length > 0 ? (
                <p className="m-0 mt-2 text-[10px] font-semibold leading-snug text-gray-500">
                  Sin recursos con estos filtros: {vistaPorSede.sinRecursos.map(nombreSede).join(', ')}.
                </p>
              ) : null}
            </>
          )}
        </div>

        {/* Escritorio: se conserva el layout ancho (resumen + matriz por sede). */}
        <div className="hidden min-w-0 space-y-3 lg:block">
          <section aria-labelledby="ocupacion-resumen-sedes" className="min-w-0">
            <div className="mb-1.5 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <h2 id="ocupacion-resumen-sedes" className="m-0 text-[11px] font-extrabold uppercase tracking-wide text-gray-700">
                Resumen por sede
              </h2>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-0">
                <p className="m-0 text-[10px] font-semibold text-gray-500">
                  Sedes separadas, sin sumar recursos · ocupados incluye locks retenidos
                </p>
                <AccionPurgarLocks onClick={handlePurgarLocks} purgando={purgandoLocks} />
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
              {vistaPorSede.resumen.map((sede) => (
                <ResumenSede key={sede.sedeId} nombre={nombreSede(sede.sedeId)} datos={sede} />
              ))}
            </div>
            {vistaPorSede.sinRecursos.length > 0 ? (
              <p className="m-0 mt-2 text-[10px] font-semibold leading-snug text-gray-500">
                Sin recursos con estos filtros: {vistaPorSede.sinRecursos.map(nombreSede).join(', ')}.
              </p>
            ) : null}
          </section>

          <section aria-label="Detalle de ocupación por sede" className="min-w-0 space-y-2.5">
            {vistaPorSede.resumen.map((sede) => (
              <div key={sede.sedeId} className="min-w-0 rounded-2xl border border-gray-100 bg-white p-2.5 sm:p-3">
                <h3 className="m-0 mb-2 flex min-w-0 items-center gap-1.5 text-[12.5px] font-extrabold text-gray-900">
                  <MapPin size={13} aria-hidden="true" className="shrink-0 text-gray-400" />
                  <span className="truncate">{nombreSede(sede.sedeId)}</span>
                </h3>
                <MatrizOcupacion
                  dias={dias}
                  bloques={bloquesActivos}
                  obtenerInfo={obtenerInfoSede(sede.sedeId)}
                  onSeleccionar={setCeldaSeleccionada}
                  sedeNombre={nombreSede(sede.sedeId)}
                  ariaLabel={`Ocupación de ${nombreSede(sede.sedeId)}`}
                />
              </div>
            ))}
          </section>
        </div>
      </div>
    );
  }

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-6xl">
      <div className="min-w-0 p-3 sm:p-4">
        <FiltrosSistema
          id="admin-ocupacion"
          titulo="Filtros de ocupación"
          descripcion="Fecha de inicio, sede, curso, instructor y moto. La fecha define la ventana de 7 días."
          campos={camposFiltros}
          valores={valoresFiltros}
          valoresIniciales={valoresIniciales}
          resumenActivo={resumenBarra}
          abierto={sheetAbierto}
          onAbrir={() => setSheetAbierto(true)}
          onCerrar={() => setSheetAbierto(false)}
          onChange={manejarCambioFiltro}
          onAplicar={manejarAplicarFiltros}
          aplicarAlInstante={false}
        >
          <div className="min-w-0 space-y-3">
            {leyenda}
            {contenido}
          </div>
        </FiltrosSistema>
      </div>

      {/* Modal de detalle */}
      {celdaSeleccionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setCeldaSeleccionada(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-ocupacion-titulo"
            className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
              <h3 id="detalle-ocupacion-titulo" className="m-0 min-w-0 break-words font-black text-gray-900">
                {celdaSeleccionada.bloque.label} — {celdaSeleccionada.fecha}
              </h3>
              <button
                onClick={() => setCeldaSeleccionada(null)}
                aria-label="Cerrar detalle"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
              {celdaSeleccionada.sedeNombre || celdaSeleccionada.info.sedeId ? (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Sede:</span>
                  <span className="min-w-0 truncate font-bold text-right">
                    {celdaSeleccionada.sedeNombre || nombreSede(celdaSeleccionada.info.sedeId)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <span className="text-gray-600">Estado:</span>
                <span className="font-bold">{celdaSeleccionada.info.estado.toUpperCase()}</span>
              </div>
              {!['bloqueado', 'cerrado'].includes(celdaSeleccionada.info.estado) && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Cupo:</span>
                  <span className="font-bold">{celdaSeleccionada.info.disponibles}/{celdaSeleccionada.info.total}</span>
                </div>
              )}
              {!['bloqueado', 'cerrado'].includes(celdaSeleccionada.info.estado) && celdaSeleccionada.info.instructores?.total > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Tutores:</span>
                  <span className="font-bold">
                    {celdaSeleccionada.info.instructores.disponibles}/{celdaSeleccionada.info.instructores.total}
                  </span>
                </div>
              )}
              {!['bloqueado', 'cerrado'].includes(celdaSeleccionada.info.estado) && celdaSeleccionada.info.motos?.requerida && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Motos:</span>
                  <span className="font-bold">
                    {celdaSeleccionada.info.motos.disponibles}/{celdaSeleccionada.info.motos.total}
                  </span>
                </div>
              )}
              {['bloqueado', 'cerrado'].includes(celdaSeleccionada.info.estado) && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Motivo:</span>
                  <span className="font-bold">{celdaSeleccionada.info.motivo}</span>
                </div>
              )}
              {celdaSeleccionada.info.reservas?.length > 0 && (
                <div>
                  <div className="text-gray-600 mb-1 mt-2">Reservas:</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {celdaSeleccionada.info.reservas.map(r => (
                      <div key={r.id} className="bg-gray-50 p-2 rounded text-xs">
                        <span className="font-bold">{r.nombre || 'Sin nombre'}</span> — {r.horaId}
                        {r.estadoPago && (
                          <span className="ml-1 text-[10px] text-gray-500">({r.estadoPago})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {celdaSeleccionada.info.locks?.length > 0 && (
                <div>
                  <div className="text-blue-700 mb-1 mt-2 font-bold">Retenidos (locks activos):</div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {celdaSeleccionada.info.locks.map(l => (
                      <div key={l.id} className="bg-blue-50 p-2 rounded text-xs text-blue-800">
                        Retenido temporalmente — {l.horaId}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
});

export default AdminOcupacion;
