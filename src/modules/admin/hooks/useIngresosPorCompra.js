// @build: 2026-11-23 | id: T-065 / ERR-033 / ERR-050 | desc: Consulta de compras por fecha real (createdAt/fechaCompra) en una ventana VET, compartida por el Home y el gráfico de Métricas.
//
// Fuente única del KPI: no se deriva del listener de reservas ordenado por fecha de
// curso. `desde` acota la ventana (por defecto, el mes VET en curso); el gráfico de 7
// días pasa el inicio de su ventana para que ambos lean la misma fecha de compra.
import { useEffect, useState } from 'react';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { inicioMesVenezuela } from '../../shared/utils/zonahoraria';

const APP_ID = 'motoescuela-pro-v1';

const docsDe = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

const inicioMesISO = () => new Date(`${inicioMesVenezuela()}T00:00:00-04:00`);

export function useIngresosPorCompra({ desde = null } = {}) {
  const [reservas, setReservas] = useState([]);
  const [packs, setPacks] = useState([]);
  const [listos, setListos] = useState({ reservas: false, packs: false });
  const [errorReservas, setErrorReservas] = useState(null);
  const [errorPacks, setErrorPacks] = useState(null);

  useEffect(() => {
    const inicio = desde ? new Date(desde) : inicioMesISO();
    const base = ['artifacts', APP_ID, 'public', 'data'];

    const qReservas = query(
      collection(db, ...base, 'reservas'),
      where('createdAt', '>=', inicio),
      limit(500)
    );
    const qPacks = query(
      collection(db, ...base, 'reservasPack'),
      where('fechaCompra', '>=', inicio),
      limit(200)
    );

    const unsubReservas = onSnapshot(
      qReservas,
      (snap) => {
        setReservas(docsDe(snap));
        setListos((previo) => ({ ...previo, reservas: true }));
        setErrorReservas(null);
      },
      (err) => {
        console.error('[useIngresosPorCompra] Error reservas:', err);
        setErrorReservas(err);
        setListos((previo) => ({ ...previo, reservas: true }));
      }
    );

    const unsubPacks = onSnapshot(
      qPacks,
      (snap) => {
        setPacks(docsDe(snap));
        setListos((previo) => ({ ...previo, packs: true }));
        setErrorPacks(null);
      },
      (err) => {
        console.error('[useIngresosPorCompra] Error packs:', err);
        setErrorPacks(err);
        setListos((previo) => ({ ...previo, packs: true }));
      }
    );

    return () => {
      unsubReservas();
      unsubPacks();
    };
  }, [desde]);

  return {
    reservas,
    packs,
    cargando: !listos.reservas || !listos.packs,
    error: errorReservas || errorPacks,
  };
}
