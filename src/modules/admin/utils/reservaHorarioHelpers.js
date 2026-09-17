// @build: 2026-08-28.16-00-00 | id: BXX-BYY | backup: reservaHorarioHelpers.js.backup-20260828-160000 | desc: Utilidades para validación de cambio de horario
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

/**
 * Obtiene locks activos para una fecha y horario
 */
export async function obtenerLocksActivos(fecha, horaId) {
  try {
    const q = query(
      collection(db, 'locks'),
      where('fecha', '==', fecha),
      where('horaId', '==', horaId)
    );
    
    const snapshot = await getDocs(q);
    const ahora = Date.now();
    
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(lock => lock.expiresAt?.toMillis?.() > ahora);
  } catch (error) {
    console.error('[obtenerLocksActivos] Error:', error);
    return [];
  }
}

/**
 * Verifica disponibilidad del instructor en un horario
 */
export function verificarDisponibilidadInstructor(
  instructorId, 
  fecha, 
  fecha2, 
  horaId, 
  ocupacionConfirmada,
  excluirReservaId
) {
  if (!instructorId) return true;
  
  const conflictos = (ocupacionConfirmada || []).filter(r => {
    if (r.id === excluirReservaId) return false;
    if (r.instructorId !== instructorId) return false;
    if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;
    if (r.horaId !== horaId) return false;
    
    return r.fecha === fecha || r.fecha === fecha2 || 
           r.fecha2 === fecha || r.fecha2 === fecha2;
  });
  
  return conflictos.length === 0;
}

/**
 * Verifica disponibilidad de la moto en un horario
 */
export function verificarDisponibilidadMoto(
  motoId, 
  fecha, 
  fecha2, 
  horaId, 
  ocupacionConfirmada,
  excluirReservaId
) {
  if (!motoId) return true;
  
  const conflictos = (ocupacionConfirmada || []).filter(r => {
    if (r.id === excluirReservaId) return false;
    if (r.motoAsignadaId !== motoId) return false;
    if (r.traeMoto === 'Sí') return false;
    if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;
    if (r.horaId !== horaId) return false;
    
    return r.fecha === fecha || r.fecha === fecha2 || 
           r.fecha2 === fecha || r.fecha2 === fecha2;
  });
  
  return conflictos.length === 0;
}