// Fallback de eventos para el administrador.
// No escribe notificaciones ni PII: solo encola eventos idempotentes en el
// outbox para que el dispatcher resuelva destinatarios y entregue push/inbox.
//
// Solo detecta RESERVAS NUEVAS RECIENTES. Las transiciones (pago, aula,
// reprogramación) las emiten los servicios que ejecutan la acción; así se
// evita que una recarga del panel admin re-emita eventos históricos.
import { useEffect, useRef } from 'react';
import { emitirEventosReserva } from '../modules/shared/services/NotificacionesEventos';
import { msDeFecha } from '../modules/shared/utils/notificacionesHelpers';

const VENTANA_NUEVA_MS = 15 * 60 * 1000;
const GRACIA_HIDRATACION_MS = 8000;

export function useNotificationsProvider(reservas, isAdmin, fbUser, prevReservasRef) {
  const bootstrapDoneRef = useRef(false);
  const graciaHastaRef = useRef(Date.now() + GRACIA_HIDRATACION_MS);

  useEffect(() => {
    if (!reservas || !isAdmin || !fbUser?.uid) return;

    // La primera carga no genera eventos: solo fija la base de comparación.
    if (!bootstrapDoneRef.current) {
      if (reservas.length === 0) return;
      prevReservasRef.current = reservas;
      bootstrapDoneRef.current = true;
      graciaHastaRef.current = Date.now() + GRACIA_HIDRATACION_MS;
      return;
    }

    if (Date.now() < graciaHastaRef.current) {
      prevReservasRef.current = reservas;
      return;
    }

    const previas = prevReservasRef.current || [];
    const idsPrevios = new Set(previas.map((r) => String(r.id)));
    const nuevas = reservas.filter((r) => !idsPrevios.has(String(r.id)));

    for (const r of nuevas) {
      const creadaMs = msDeFecha(r.createdAt || r.creadoEn || r.fechaCreacion);
      const reciente = creadaMs > 0 && Date.now() - creadaMs < VENTANA_NUEVA_MS;
      if (!reciente) continue;
      void emitirEventosReserva(null, r, fbUser.uid);
    }

    prevReservasRef.current = reservas;
  }, [reservas, isAdmin, fbUser?.uid, prevReservasRef]);
}
