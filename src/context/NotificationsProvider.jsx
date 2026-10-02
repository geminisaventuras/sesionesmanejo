// @build: 2026-06-21.FASE3 | id: NOTIFICATIONS-PROVIDER | desc: Lógica de notificaciones con protección try/catch
import { useEffect, useRef } from 'react';

export function useNotificationsProvider(reservas, isAdmin, fbUser, instructores, saveNotificacion, prevReservasRef) {
  const bootstrapDoneRef = useRef(false);

  useEffect(() => {
    if (!reservas || !isAdmin || !fbUser) return;

    // Bootstrap silencioso: la primera carga con reservas reales NO genera notificaciones.
    // Solo guarda el snapshot base para comparar cambios futuros dentro de esta sesión.
    if (!bootstrapDoneRef.current && reservas.length > 0) {
      prevReservasRef.current = reservas;
      bootstrapDoneRef.current = true;
      return;
    }

    const guardar = async (notif) => {
      try {
        await saveNotificacion(notif);
      } catch (e) {
        // Silencioso – permisos o red
      }
    };

    const prevReservas = prevReservasRef.current;
    const nuevasReservas = reservas.filter(r => !prevReservas.some(pr => pr.id === r.id));

    for (const r of nuevasReservas) {
      guardar({
        id: 'nueva_' + r.id,
        userId: 'admin',
        tipo: 'nueva_reserva',
        mensaje: `Nueva reserva: ${r.nombre} ${r.apellido} (CI: ${r.cedula})`,
        reservaId: r.id,
        emisorId: 'sistema',
        leida: false,
        createdAt: new Date()
      });
    }

    for (const r of reservas) {
      const prev = prevReservas.find(pr => pr.id === r.id);
      if (!prev) continue;

      if (prev.estadoPago !== 'Aprobado' && r.estadoPago === 'Aprobado') {
        guardar({
          id: 'aprobado_' + r.id,
          userId: r.userId,
          tipo: 'pago_aprobado',
          mensaje: 'Tu pago ha sido aprobado. ¡Ya puedes entrar al Aula Virtual!',
          reservaId: r.id,
          emisorId: 'sistema',
          leida: false,
          createdAt: new Date()
        });
      }

      if (prev.estadoPago !== 'Rechazado' && r.estadoPago === 'Rechazado') {
        guardar({
          id: 'rechazado_' + r.id,
          userId: r.userId,
          tipo: 'pago_rechazado',
          mensaje: 'Tu pago fue rechazado. Corrige la referencia para continuar.',
          reservaId: r.id,
          emisorId: 'sistema',
          leida: false,
          createdAt: new Date()
        });
      }

      if (!prev.moduloEnProgreso && r.moduloEnProgreso) {
        const inst = instructores.find(i => String(i.id) === String(r.instructorId));
        guardar({
          userId: 'admin',
          tipo: 'sesion_iniciada',
          mensaje: `El instructor ${inst?.nombre || 'N/A'} inició sesión con ${r.nombre} ${r.apellido}`,
          reservaId: r.id,
          emisorId: 'sistema',
          leida: false,
          createdAt: new Date()
        });
      }

      if (!prev.pausaActiva && r.pausaActiva) {
        const inst = instructores.find(i => String(i.id) === String(r.instructorId));
        guardar({
          userId: 'admin',
          tipo: 'sesion_pausada',
          mensaje: `El instructor ${inst?.nombre || 'N/A'} pausó la sesión con ${r.nombre} ${r.apellido}. Motivo: ${r.pausaActiva.motivo || 'N/A'}`,
          reservaId: r.id,
          emisorId: 'sistema',
          leida: false,
          createdAt: new Date()
        });
      }

      if (prev.estadoCurso !== 'Aprobado' && r.estadoCurso === 'Aprobado') {
        const inst = instructores.find(i => String(i.id) === String(r.instructorId));
        guardar({
          id: 'finalizada_' + r.id,
          userId: 'admin',
          tipo: 'sesion_finalizada',
          mensaje: `El instructor ${inst?.nombre || 'N/A'} finalizó el curso de ${r.nombre} ${r.apellido}`,
          reservaId: r.id,
          emisorId: 'sistema',
          leida: false,
          createdAt: new Date()
        });
      }
    }

    prevReservasRef.current = reservas;
  }, [reservas, isAdmin, fbUser, instructores, saveNotificacion, prevReservasRef]);
}