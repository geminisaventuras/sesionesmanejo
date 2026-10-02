// Archivo: src/modules/inscripcion/services/ReservaService.js
// @build: 2026-07-21 | id: SERV-PROGRESO-INSCRIPCION | desc: Nuevos métodos para progreso de inscripción

import { db, auth } from '../../shared/firebase/firebase';
import { collection, doc, runTransaction, updateDoc, getDocs, getDoc, setDoc, deleteDoc, Timestamp, query, where, writeBatch } from 'firebase/firestore';
import { validarInscripcionCompleta } from '../../shared/schemas/validations';
import { cumplePrerequisito } from '../../../constants/cursoSecuencia';
const appId = 'motoescuela-pro-v1';

const CAMPOS_OBLIGATORIOS = ['userId', 'cedula', 'fecha', 'horaId', 'cursoId'];
export const ReservaService = {
  // -------------------------------------------------
  // PROGRESO DE INSCRIPCIÓN
  // -------------------------------------------------
  _correoKey(correo) {
    return correo.replace(/[@.]/g, '_');
  },

   async guardarProgreso(userId, paso, datosFormulario, correo) {
    if (!correo) return { success: false, error: { code: 'missing-email' } };
    const correoKey = this._correoKey(correo);
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'progresoInscripcion', correoKey);
    try {
      const snapExistente = await getDoc(ref);
      const existente = snapExistente.exists() ? snapExistente.data() : {};

      const pinExistente = existente.pin || '';
      const pinNuevo = datosFormulario.pin;
      let pinFinal = pinExistente;
      if (pinNuevo && String(pinNuevo).trim() !== '') {
        pinFinal = String(pinNuevo).trim();
      }

      const datosActualizados = {
        userId,
        correo,
        pin: pinFinal,
        paso: Number(paso),
        datosFormulario: {
          ...(existente.datosFormulario || {}),
          ...datosFormulario,
          pin: pinFinal
        },
        updatedAt: Timestamp.now(),
        createdAt: existente.createdAt || Timestamp.now()
      };

      await setDoc(ref, datosActualizados, { merge: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async buscarProgresoPorCorreo(correo) {
    if (!correo) return { success: false, error: { code: 'missing-email' } };
    const correoKey = this._correoKey(correo);
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'progresoInscripcion', correoKey);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return { success: true, data: snap.data() };
      }
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async limpiarProgreso(correo) {
    if (!correo) return { success: false, error: { code: 'missing-email' } };
    const correoKey = this._correoKey(correo);
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'progresoInscripcion', correoKey);
    try {
      await deleteDoc(ref);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  // -------------------------------------------------
  // RESERVAS (existente sin cambios)
  // -------------------------------------------------
  async crearReserva(reservaData, lockId) {
    if (!reservaData || !lockId)
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos de la reserva o lockId' } };

     for (const campo of CAMPOS_OBLIGATORIOS)
      if (reservaData[campo] === undefined || reservaData[campo] === null)
        return { success: false, error: { code: 'missing-field', message: `Campo obligatorio faltante: ${campo}` } };

    // FIX-034: Freno tactico de identidad
    const usuarioActual = auth.currentUser;
    if (usuarioActual && reservaData.correo && reservaData.correo.toLowerCase() !== usuarioActual.email.toLowerCase()) {
      return { success: false, error: { code: 'identity-mismatch', message: 'El correo no coincide con tu sesión. Cierra sesión e intenta de nuevo.' } };
    }

        const { esRecompra: _uiFlag, ...reservaLimpia } = reservaData;
       const validacion = validarInscripcionCompleta(reservaLimpia);
    if (!validacion.success) {
      const primerError = Object.values(validacion.errores)[0] || 'Datos inválidos';
      return { success: false, error: { code: 'invalid-data', message: primerError } };
    }

    // ✅ NUEVO (FIX-PREREQ-BYPASS): Validación de prerequisitos (defensa en profundidad).
      let cursoData = null;
    try {
      const cursoRef = doc(db, 'artifacts', appId, 'public', 'data', 'cursos', reservaData.cursoId);
      const cursoSnap = await getDoc(cursoRef);
      if (cursoSnap.exists()) {
                cursoData = { id: cursoSnap.id, ...cursoSnap.data() };
        const esBasico = cursoData.tipoCurso === 'basico_auto' || cursoData.tipoCurso === 'basico_sincro';

        if (!esBasico) {
          const reservasUsuarioRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
          const qReservas = query(
            reservasUsuarioRef,
            where('userId', '==', reservaData.userId),
            where('estadoPago', '==', 'Aprobado')
          );
          const reservasSnap = await getDocs(qReservas);
          const reservasAprobadas = reservasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          const cursosRef = collection(db, 'artifacts', appId, 'public', 'data', 'cursos');
          const cursosSnap = await getDocs(cursosRef);
          const cursos = cursosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          const cumple = cumplePrerequisito(
            cursoData.tipoCurso,
            reservasAprobadas,
            cursoData,
            cursos
          );

          if (!cumple) {
            return {
              success: false,
              error: {
                code: 'invalid-prereqs',
                message: 'Este curso requiere que apruebes un curso previo primero.'
              }
            };
          }
        }
      }
    } catch (err) {
      console.error('[crearReserva] Error validando prereqs:', err);
    }

    const reservasRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
    const reservaDoc = doc(reservasRef);
    const lockRef = doc(db, 'locks', lockId);
    const ocupacionConfirmadaRef = doc(db, 'ocupacionConfirmada', reservaDoc.id);

    try {
      await runTransaction(db, async (transaction) => {
             const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists()) throw new Error('El horario ya no está disponible');

        const lockData = lockSnap.data();

        // ✅ Validación robusta de expiración e integridad
        const lockExpirado = !lockData.expiresAt || lockData.expiresAt.toMillis() <= Date.now();
        const lockCorrupto = !lockData.userId || !lockData.instructorId || !lockData.fecha || !lockData.horaId;

        if (!lockExpirado && !lockCorrupto && lockData.userId !== reservaData.userId) {
          throw new Error('El horario está bloqueado por otro usuario');
        }

        // Si el lock está expirado o corrupto, se ignora y se eliminará al final de la transacción
        if (lockExpirado || lockCorrupto) {
          console.log(`[ReservaService] Lock ${lockId} ignorado (expirado: ${lockExpirado}, corrupto: ${lockCorrupto})`);
        }

        const datosReserva = {
          ...validacion.data,
          userId: reservaData.userId,
          cursoId: reservaData.cursoId,
          tipoCurso: typeof reservaData.tipoCurso === 'string' ? reservaData.tipoCurso.trim() : null,          sedeId: reservaData.sedeId,
          tipoMoto: reservaData.tipoMoto,
          fecha: reservaData.fecha,
          fecha2: reservaData.fecha2 || null,
          horaId: reservaData.horaId,
          instructorId: reservaData.instructorId,
                    motoAsignadaId: (cursoData?.motoIncluida === false) ? null : (reservaData.motoAsignadaId || null),
          
          traeMoto: reservaData.traeMoto,
          sabeBicicleta: reservaData.sabeBicicleta,
          fechaNacimiento: reservaData.fechaNacimiento,
          pagoTotalMoneda: reservaData.pagoTotalMoneda,
          pagoTotalVES: reservaData.pagoTotalVES,
          pagoBanco: reservaData.pagoBanco,
          pagoTelefono: reservaData.pagoTelefono,
          pagoCedula: reservaData.pagoCedula,
          pagoRef: reservaData.pagoRef,
          id: reservaDoc.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Pendiente',
          estadoCurso: 'Pendiente',
          precio: reservaData.pagoTotalMoneda,
                proveedorId: reservaData.proveedorId || null,
          pin: reservaData.pin || null,
                 comisionInstructor: typeof reservaData.comisionInstructor === 'number' ? reservaData.comisionInstructor : 0,
          comisionProveedor: typeof reservaData.comisionProveedor === 'number' ? reservaData.comisionProveedor : 0,
          origenReinscripcion: reservaData.origenReinscripcion || 'nueva'
        };

        transaction.set(reservaDoc, datosReserva);
              transaction.set(ocupacionConfirmadaRef, {
          userId: datosReserva.userId,
          fecha: datosReserva.fecha,
          fecha2: datosReserva.fecha2,
          horaId: datosReserva.horaId,
          instructorId: datosReserva.instructorId,
          tipoCurso: datosReserva.tipoCurso || null,
          motoAsignadaId: datosReserva.motoAsignadaId,
          traeMoto: datosReserva.traeMoto,
          sedeId: datosReserva.sedeId,          
          estadoPago: 'Pendiente',
          proveedorId: datosReserva.proveedorId || null
        });

        // ✅ Purga atómica de la colección viva (ocupacionTemporal)
        const temporalRef = doc(db, 'ocupacionTemporal', lockId);
        transaction.delete(temporalRef);

        // ✅ Purga de la colección legacy (locks)
        transaction.delete(lockRef);
      });
        return { success: true, data: { id: reservaDoc.id } };
    } catch (error) {
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — Fase 3.7b
  // Crea reserva MAESTRA + reserva CHILD (primer curso) en una transacción atómica.
  // -------------------------------------------------
  async crearReservaPack(packData, lockId) {
    if (!packData || !lockId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del pack o lockId' } };
    }
    if (!packData.packId) {
      return { success: false, error: { code: 'missing-pack-id', message: 'Falta packId' } };
    }

    const usuarioActual = auth.currentUser;
    if (!usuarioActual) {
      return { success: false, error: { code: 'no-auth', message: 'Sesión no encontrada' } };
    }
    if (packData.userId && packData.userId !== usuarioActual.uid) {
      return { success: false, error: { code: 'identity-mismatch', message: 'El userId no coincide con tu sesión' } };
    }

    const packRef = doc(db, 'artifacts', appId, 'public', 'data', 'packs', packData.packId);
    const maestraRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'reservasPack'));
    const childRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'reservas'));
    const lockRef = doc(db, 'locks', lockId);
    const temporalRef = doc(db, 'ocupacionTemporal', lockId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childRef.id);

    try {
      let childIdFinal = null;
      let maestraIdFinal = null;

      await runTransaction(db, async (transaction) => {
        // 1. Leer y validar pack
        const packSnap = await transaction.get(packRef);
        if (!packSnap.exists()) {
          throw new Error('El pack ya no existe');
        }
        const pack = packSnap.data();
        if (pack.activo !== true) {
          throw new Error('El pack ya no está disponible');
        }

        // 2. Leer y validar lock
        const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists()) {
          throw new Error('El horario ya no está disponible');
        }
        const lockData = lockSnap.data();
        const lockExpirado = !lockData.expiresAt || lockData.expiresAt.toMillis() <= Date.now();
        const lockCorrupto = !lockData.userId || !lockData.instructorId || !lockData.fecha || !lockData.horaId;
        if (!lockExpirado && !lockCorrupto && lockData.userId !== usuarioActual.uid) {
          throw new Error('El horario está bloqueado por otro usuario');
        }

        // 3. Resolver cursos del pack
        const cursosPack = (pack.cursoIds || []).map(cid => {
          // Los cursos no se leen dentro de la transacción (sería costoso).
          // El cliente ya los tiene en packData.cursoSnapshot.
          return packData.cursoSnapshot?.find(c => String(c.id) === String(cid)) || null;
        }).filter(Boolean);

        if (cursosPack.length === 0) {
          throw new Error('Pack sin cursos válidos');
        }

        const cursoEq = cursosPack[0];
        const sumaBase = cursosPack.reduce((acc, c) => acc + (Number(c.precioBase) || 0), 0);
        const precioPack = Number(packData.pagoTotalMoneda) || 0;
        const descuentoMonto = Number(pack.descuentoTipo === 'porcentaje'
          ? (sumaBase * (Number(pack.descuentoValor) || 0)) / 100
          : (Number(pack.descuentoValor) || 0));

        // 4. Prorrateo del primer curso (Equilibrio)
        const precioEqBase = Number(cursoEq.precioBase) || 0;
        const precioEqProrrateado = sumaBase > 0
          ? Number(((precioEqBase / sumaBase) * precioPack).toFixed(2))
          : 0;
        const descuentoEqAplicado = Number((precioEqBase - precioEqProrrateado).toFixed(2));

        // 5. Comisiones híbridas (completas del curso, negocio absorbe déficit)
        const comisionInstructorEq = Number(cursoEq.comisionInstructor) || 0;
        const comisionProveedorEq = Number(cursoEq.comisionProveedor) || 0;
        const totalComisionesEq = comisionInstructorEq + comisionProveedorEq;
        const deficitEq = Number((totalComisionesEq - precioEqProrrateado).toFixed(2));

        // 6. Vencimiento congelado
        const vencimientoDias = Number(pack.vencimientoDias) || 60;
        const ahora = Date.now();
        const vencimientoMs = ahora + (vencimientoDias * 24 * 60 * 60 * 1000);

        // 7. Sub-reservas (metadata): índice 0 activo, resto bloqueado
        const subReservas = cursosPack.map((c, idx) => ({
          cursoId: String(c.id),
          cursoNombre: c.nombre || '',
          estado: idx === 0 ? 'activo' : 'bloqueado',
          reservaId: idx === 0 ? childRef.id : null
        }));

        // 8. Datos de la MAESTRA
        const datosMaestra = {
          userId: usuarioActual.uid,
          packId: String(pack.id),
          packNombre: pack.nombre || 'Pack',
          packSnapshot: {
            cursoIds: pack.cursoIds || [],
            sedesPermitidas: pack.sedesPermitidas || [],
            descuentoTipo: pack.descuentoTipo || 'porcentaje',
            descuentoValor: Number(pack.descuentoValor) || 0,
            vencimientoDias
          },
          precioBaseCongelado: sumaBase,
          descuentoCongelado: {
            tipo: pack.descuentoTipo || 'porcentaje',
            valor: Number(pack.descuentoValor) || 0,
            monto: Number(descuentoMonto.toFixed(2))
          },
          precioTotalCongelado: Number(precioPack.toFixed(2)),
          fechaCompra: Timestamp.now(),
          vencimiento: Timestamp.fromMillis(vencimientoMs),
          estado: 'activo',
          estadoPago: 'Pendiente',
          cursoActual: 0,
          cursoReservaId: childRef.id,
          sedeId: packData.sedeId || null,
          tipoMoto: packData.tipoMoto || null,
          traeMotoPorCurso: packData.traeMotoPorCurso || {},
          pagoTotalMoneda: Number(precioPack.toFixed(2)),
          pagoTotalVES: Number(packData.pagoTotalVES) || 0,
          pagoBanco: packData.pagoBanco || null,
          pagoTelefono: packData.pagoTelefono || null,
          pagoCedula: packData.pagoCedula || null,
          pagoRef: packData.pagoRef || null,
          subReservas,
          origen: packData.origen || 'pack-publico',
          createdAt: Timestamp.now()
        };

        transaction.set(maestraRef, datosMaestra);

        // 9. Datos de la CHILD (Equilibrio)
        const datosChild = {
          userId: usuarioActual.uid,
          cedula: packData.cedula || null,
          nombre: packData.nombre || null,
          apellido: packData.apellido || null,
          correo: packData.correo || null,
          telefono: packData.telefono || null,
          contactoEmergencia: packData.contactoEmergencia || null,
          fechaNacimiento: packData.fechaNacimiento || null,
          sexo: packData.sexo || null,
          estado: packData.estado || null,
          zona: packData.zona || null,
          condicionMedica: packData.condicionMedica || null,
          detalleCondicion: packData.detalleCondicion || null,
          cursoId: String(cursoEq.id),
          tipoCurso: typeof cursoEq.tipoCurso === 'string' ? cursoEq.tipoCurso.trim() : null,
          sedeId: packData.sedeId || null,
          tipoMoto: packData.tipoMoto || null,
          fecha: packData.fecha || null,
          fecha2: packData.fecha2 || null,
          horaId: packData.horaId || null,
          instructorId: packData.instructorId || null,
          motoAsignadaId: packData.motoAsignadaId || null,
          traeMoto: 'No', // Equilibrio siempre con moto escuela
          sabeBicicleta: 'No', // implícito por pack
          proveedorId: packData.proveedorId || null,
          pagoTotalMoneda: precioEqProrrateado,
          pagoTotalVES: Number(packData.pagoTotalVES) || 0,
          pagoBanco: packData.pagoBanco || null,
          pagoTelefono: packData.pagoTelefono || null,
          pagoCedula: packData.pagoCedula || null,
          pagoRef: packData.pagoRef || null,
          id: childRef.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Pendiente',
          estadoCurso: 'Pendiente',
          precio: precioEqProrrateado,
          precioBaseOriginal: precioEqBase,
          descuentoAplicado: descuentoEqAplicado,
          comisionInstructor: comisionInstructorEq,
          comisionProveedor: comisionProveedorEq,
          deficitComision: deficitEq,
          comisionAbsorbidaPorNegocio: deficitEq,
          pin: packData.pin || null,
          terminosAceptados: packData.terminosAceptados === true,
          fechaAceptacionTerminos: packData.fechaAceptacionTerminos || null,
          // Campos de diferenciación
          packReservaId: maestraRef.id,
          tipoReserva: 'pack_sub',
          packCursoIndex: 0,
          packNombre: pack.nombre || 'Pack',
          origenReinscripcion: 'nueva'
        };

        transaction.set(childRef, datosChild);

        // 10. Espejo en ocupacionConfirmada (solo para la child)
        transaction.set(espejoRef, {
          userId: datosChild.userId,
          fecha: datosChild.fecha,
          fecha2: datosChild.fecha2,
          horaId: datosChild.horaId,
          instructorId: datosChild.instructorId,
          tipoCurso: datosChild.tipoCurso,
          motoAsignadaId: datosChild.motoAsignadaId,
          traeMoto: datosChild.traeMoto,
          sedeId: datosChild.sedeId,
          estadoPago: 'Pendiente',
          proveedorId: datosChild.proveedorId || null
        });

        // 11. Purga de locks
        transaction.delete(temporalRef);
        transaction.delete(lockRef);

        childIdFinal = childRef.id;
        maestraIdFinal = maestraRef.id;
      });

      return {
        success: true,
        data: { id: childIdFinal, packReservaId: maestraIdFinal }
      };
    } catch (error) {
      console.error('[crearReservaPack] Error:', {
        userId: packData.userId,
        packId: packData.packId,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });
         return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — Fase 5.3
  // Agenda el siguiente curso del pack. El estudiante ya pagó el pack completo,
  // así que el nuevo child nace con estadoPago: 'Aprobado'.
  //
  // Caller: página /mi-pack/:id/agendar.
  // Escrituras: 5 (child, espejo, maestra, lock, ocupacionTemporal).
  // -------------------------------------------------
  async agendarSiguienteCursoPack(packData, lockId) {
    if (!packData || !lockId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos o lockId' } };
    }
    if (!packData.packReservaId) {
      return { success: false, error: { code: 'missing-pack-id', message: 'Falta packReservaId' } };
    }

    const usuarioActual = auth.currentUser;
    if (!usuarioActual) {
      return { success: false, error: { code: 'no-auth', message: 'Sesión no encontrada' } };
    }

    const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packData.packReservaId);
    const childRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'reservas'));
    const lockRef = doc(db, 'locks', lockId);
    const temporalRef = doc(db, 'ocupacionTemporal', lockId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childRef.id);

    try {
      let childIdFinal = null;

      await runTransaction(db, async (transaction) => {
        // 1. Leer y validar maestra
        const maestraSnap = await transaction.get(maestraRef);
        if (!maestraSnap.exists()) {
          throw new Error('El pack no existe');
        }
        const maestra = maestraSnap.data();

        if (maestra.userId !== usuarioActual.uid) {
          throw new Error('No tienes permiso sobre este pack');
        }
        if (maestra.estado !== 'activo') {
          throw new Error('El pack no está activo');
        }

                if (maestra.estadoPago !== 'Aprobado') {
          throw new Error('El pack no tiene el pago aprobado.');
        }

        const vencimientoMs = maestra.vencimiento?.toMillis?.() || 0;
        if (vencimientoMs > 0 && vencimientoMs < Date.now()) {
          throw new Error('El pack está vencido. Contacta al administrador.');
        }

        // 2. Validar que el curso actual no tenga ya una reserva agendada
        const cursoActual = maestra.cursoActual ?? 0;
        const subReservas = [...(maestra.subReservas || [])];
        const subActual = subReservas[cursoActual];
        if (!subActual) {
          throw new Error('Índice de curso inválido');
        }
        if (subActual.estado !== 'activo') {
          throw new Error('El curso actual no está disponible para agendar');
        }
        if (subActual.reservaId) {
          throw new Error('Este curso ya tiene una fecha agendada');
        }

        // 3. Validar que el curso a agendar coincide con el subReservas[cursoActual]
        const cursoData = packData.cursoSnapshot;
        if (!cursoData || String(cursoData.id) !== String(subActual.cursoId)) {
          throw new Error('El curso a agendar no coincide con el curso actual del pack');
        }

        // 4. Leer y validar lock
        const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists()) {
          throw new Error('El horario ya no está disponible');
        }
        const lockData = lockSnap.data();
        const lockExpirado = !lockData.expiresAt || lockData.expiresAt.toMillis() <= Date.now();
        const lockCorrupto = !lockData.userId || !lockData.instructorId || !lockData.fecha || !lockData.horaId;
        if (!lockExpirado && !lockCorrupto && lockData.userId !== usuarioActual.uid) {
          throw new Error('El horario está bloqueado por otro usuario');
        }

        // 5. Prorrateo del curso actual
        const sumaBase = Number(maestra.precioBaseCongelado) || 0;
        const precioPack = Number(maestra.precioTotalCongelado) || 0;
        const precioBaseCurso = Number(cursoData.precioBase) || 0;
        const precioProrrateado = sumaBase > 0
          ? Number(((precioBaseCurso / sumaBase) * precioPack).toFixed(2))
          : 0;
        const descuentoAplicado = Number((precioBaseCurso - precioProrrateado).toFixed(2));

        // 6. Comisiones híbridas (completas, negocio absorbe déficit)
        const comisionInstructor = Number(cursoData.comisionInstructor) || 0;
        const comisionProveedor = Number(cursoData.comisionProveedor) || 0;
        const totalComisiones = comisionInstructor + comisionProveedor;
        const deficit = Number((totalComisiones - precioProrrateado).toFixed(2));

        // 7. traeMoto desde el mapa
        const traeMoto = (maestra.traeMotoPorCurso || {})[String(cursoData.id)] || 'No';

        // 8. Datos de la CHILD
        const datosChild = {
          userId: usuarioActual.uid,
          cedula: packData.cedula || null,
          nombre: packData.nombre || null,
          apellido: packData.apellido || null,
          correo: packData.correo || null,
          telefono: packData.telefono || null,
          contactoEmergencia: packData.contactoEmergencia || null,
          fechaNacimiento: packData.fechaNacimiento || null,
          sexo: packData.sexo || null,
          estado: packData.estado || null,
          zona: packData.zona || null,
          condicionMedica: packData.condicionMedica || null,
          detalleCondicion: packData.detalleCondicion || null,
          cursoId: String(cursoData.id),
          tipoCurso: typeof cursoData.tipoCurso === 'string' ? cursoData.tipoCurso.trim() : null,
          sedeId: packData.sedeId || maestra.sedeId || null,
          tipoMoto: packData.tipoMoto || maestra.tipoMoto || null,
          fecha: packData.fecha || null,
          fecha2: packData.fecha2 || null,
          horaId: packData.horaId || null,
          instructorId: packData.instructorId || null,
          motoAsignadaId: packData.motoAsignadaId || null,
          traeMoto,
          sabeBicicleta: 'Sí', // implícito por pack (ya completó Equilibrio)
          proveedorId: packData.proveedorId || null,
          pagoTotalMoneda: precioProrrateado,
          pagoTotalVES: Number(maestra.pagoTotalVES) || 0,
          pagoBanco: maestra.pagoBanco || null,
          pagoTelefono: maestra.pagoTelefono || null,
          pagoCedula: maestra.pagoCedula || null,
          pagoRef: maestra.pagoRef || null,
          id: childRef.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Aprobado', // ya pagó el pack
          estadoCurso: 'Pendiente',
          precio: precioProrrateado,
          precioBaseOriginal: precioBaseCurso,
          descuentoAplicado,
          comisionInstructor,
          comisionProveedor,
          deficitComision: deficit,
          comisionAbsorbidaPorNegocio: deficit,
          pin: null,
          terminosAceptados: true,
          fechaAceptacionTerminos: new Date().toISOString(),
          // Campos de diferenciación
          packReservaId: maestraRef.id,
          tipoReserva: 'pack_sub',
          packCursoIndex: cursoActual,
          packNombre: maestra.packNombre || 'Pack',
          origenReinscripcion: 'nueva'
        };

        transaction.set(childRef, datosChild);

        // 9. Actualizar maestra: reservaId del curso actual + cursoReservaId
        subReservas[cursoActual] = {
          ...subActual,
          reservaId: childRef.id
        };

        transaction.update(maestraRef, {
          subReservas,
          cursoReservaId: childRef.id
        });

        // 10. Espejo en ocupacionConfirmada
        transaction.set(espejoRef, {
          userId: datosChild.userId,
          fecha: datosChild.fecha,
          fecha2: datosChild.fecha2,
          horaId: datosChild.horaId,
          instructorId: datosChild.instructorId,
          tipoCurso: datosChild.tipoCurso,
          motoAsignadaId: datosChild.motoAsignadaId,
          traeMoto: datosChild.traeMoto,
          sedeId: datosChild.sedeId,
          estadoPago: 'Aprobado',
          proveedorId: datosChild.proveedorId || null
        });

        // 11. Purga de locks
        transaction.delete(temporalRef);
        transaction.delete(lockRef);

        childIdFinal = childRef.id;
      });

      return {
        success: true,
        data: { id: childIdFinal }
      };
    } catch (error) {
      console.error('[agendarSiguienteCursoPack] Error:', {
        userId: packData.userId,
        packReservaId: packData.packReservaId,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — 3.8b
  // Aprueba la maestra + child en cascada. Transacción atómica.
  // -------------------------------------------------
  async aprobarReservaPack(packReservaId, childReservaId) {
    if (!packReservaId || !childReservaId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan IDs' } };
    }

    const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packReservaId);
    const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', childReservaId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childReservaId);

    try {
      await runTransaction(db, async (transaction) => {
        const maestraSnap = await transaction.get(maestraRef);
        if (!maestraSnap.exists()) throw new Error('Pack no encontrado');

        const childSnap = await transaction.get(childRef);
        if (!childSnap.exists()) throw new Error('Reserva del pack no encontrada');

        // 1. Maestra → Aprobado
        transaction.update(maestraRef, {
          estadoPago: 'Aprobado',
          aprobadoEn: Timestamp.now()
        });

        // 2. Child → Aprobado + En Curso
        transaction.update(childRef, {
          estadoPago: 'Aprobado',
          estadoCurso: 'En Curso',
          aprobadoEn: Timestamp.now()
        });

        // 3. Espejo → Aprobado
        transaction.set(espejoRef, {
          userId: childSnap.data().userId,
          fecha: childSnap.data().fecha,
          fecha2: childSnap.data().fecha2,
          horaId: childSnap.data().horaId,
          instructorId: childSnap.data().instructorId,
          tipoCurso: childSnap.data().tipoCurso,
          motoAsignadaId: childSnap.data().motoAsignadaId,
          traeMoto: childSnap.data().traeMoto,
          sedeId: childSnap.data().sedeId,
          estadoPago: 'Aprobado',
          proveedorId: childSnap.data().proveedorId || null
        }, { merge: true });
      });

      return { success: true };
    } catch (error) {
      console.error('[aprobarReservaPack] Error:', error);
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — 3.8b
  // Rechaza la maestra + child (permite corregir).
  // -------------------------------------------------
  async rechazarReservaPack(packReservaId, childReservaId) {
    if (!packReservaId || !childReservaId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan IDs' } };
    }

    const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packReservaId);
    const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', childReservaId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childReservaId);

    try {
      await runTransaction(db, async (transaction) => {
        transaction.update(maestraRef, {
          estadoPago: 'Rechazado',
          rechazadoEn: Timestamp.now()
        });

        transaction.update(childRef, {
          estadoPago: 'Rechazado',
          rechazadoEn: Timestamp.now()
        });

        // Espejo queda con estado Pendiente (sigue bloqueando el horario)
        transaction.set(espejoRef, { estadoPago: 'Pendiente' }, { merge: true });
      });

      return { success: true };
    } catch (error) {
      console.error('[rechazarReservaPack] Error:', error);
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — 3.8b
  // Cancela definitivamente (libera el horario).
  // -------------------------------------------------
  async cancelarReservaPack(packReservaId, childReservaId) {
    if (!packReservaId || !childReservaId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan IDs' } };
    }

    const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packReservaId);
    const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', childReservaId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childReservaId);

    try {
      await runTransaction(db, async (transaction) => {
        transaction.update(maestraRef, {
          estadoPago: 'Cancelado',
          estado: 'cancelado',
          canceladoEn: Timestamp.now()
        });

        transaction.update(childRef, {
          estadoPago: 'Cancelado',
          estadoCurso: 'Cancelado',
          canceladoEn: Timestamp.now()
        });

        // Espejo se elimina → libera el horario
        transaction.delete(espejoRef);
      });

      return { success: true };
    } catch (error) {
      console.error('[cancelarReservaPack] Error:', error);
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  async obtenerReservaPorUsuario(uid) {
    if (!uid) return { success: false, error: { code: 'missing-uid', message: 'Falta el UID del usuario' } };
    try {
      const reservasRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
      const q = query(reservasRef, where('userId', '==', String(uid)));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        return { success: true, data: { id: snap.docs[0].id, ...data } };
      }
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

    async obtenerReservasPorUsuario(uid) {
    if (!uid) return { success: false, error: { code: 'missing-uid', message: 'Falta el UID del usuario' } };
    try {
      const reservasRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
      const q = query(reservasRef, where('userId', '==', String(uid)));
      const snap = await getDocs(q);
      const reservas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      reservas.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      return { success: true, data: reservas };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async obtenerReservaAprobadaReciente(uid) {
    const resultado = await this.obtenerReservasPorUsuario(uid);
    if (!resultado.success) return resultado;

    const aprobada = (resultado.data || []).find(r => r.estadoPago === 'Aprobado');
    return {
      success: true,
      data: aprobada || null
    };
  },

   async obtenerReservasAprobadas(uid) {
    const resultado = await this.obtenerReservasPorUsuario(uid);
    if (!resultado.success) return resultado;

    return {
      success: true,
      data: (resultado.data || []).filter(r => r.estadoPago === 'Aprobado')
    };
  },

  // A2.6: reservas canceladas (por pago no coincidente). Ya vienen ordenadas
  // por createdAt desc desde obtenerReservasPorUsuario. La primera es la más reciente.
  async obtenerReservasCanceladas(uid) {
    const resultado = await this.obtenerReservasPorUsuario(uid);
    if (!resultado.success) return resultado;

    return {
      success: true,
      data: (resultado.data || []).filter(r => r.estadoPago === 'Cancelado')
    };
  },

  async obtenerUltimoBasicoAprobado(uid) {
    const resultado = await this.obtenerReservasAprobadas(uid);
    if (!resultado.success) return resultado;

    const basicos = (resultado.data || [])
      .filter(r =>
        r.tipoCurso === 'basico_auto' ||
        r.tipoCurso === 'basico_sincro'
      )
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });

    return {
      success: true,
      data: basicos[0] || null
    };
  },

   async corregirReferenciaPago(reservaId, nuevaRef) {
    if (!reservaId || !nuevaRef || nuevaRef.length !== 4) {
      return { success: false, error: { code: 'invalid-args', message: 'Referencia inválida' } };
    }
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', reservaId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return { success: false, error: { code: 'not-found', message: 'Reserva no encontrada' } };
      }
      const data = snap.data();

      // Si es una child de pack, actualizar también la maestra (mismo pago)
      if (data.tipoReserva === 'pack_sub' && data.packReservaId) {
        const batch = writeBatch(db);
        batch.update(ref, {
          pagoRef: nuevaRef,
          estadoPago: 'Pendiente'
        });
        const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', data.packReservaId);
        batch.update(maestraRef, {
          pagoRef: nuevaRef,
          estadoPago: 'Pendiente',
          rechazadoEn: null
        });
        await batch.commit();
      } else {
        // Reserva individual normal
        await updateDoc(ref, {
          pagoRef: nuevaRef,
          estadoPago: 'Pendiente'
        });
      }
       return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — Fase 5.2
  // Avanza la maestra cuando el curso actual del pack se completa.
  // Idempotente. Lo llaman instructor (fire-and-forget) y estudiante (reparación).
  // -------------------------------------------------
  async avanzarPackTrasCompletarCurso(packReservaId, childId, cursoActualIndex) {
    if (!packReservaId || !childId || cursoActualIndex === undefined || cursoActualIndex === null) {
      return { success: false, error: { code: 'invalid-args', message: 'Faltan argumentos' } };
    }

    try {
      const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packReservaId);
      const maestraSnap = await getDoc(maestraRef);
      if (!maestraSnap.exists()) {
        return { success: false, error: { code: 'not-found', message: 'Pack no encontrado' } };
      }
      const maestra = maestraSnap.data();
      // Bloqueo por estadoPago (allowlist).
      // El rechazo es reversible (ver Test B), pero hasta que el admin re-apruebe
      // no se debe avanzar el pack. Corta temprano para no ensuciar logs.
      if (maestra.estadoPago !== 'Aprobado') {
        console.log('[avanzarPack] omitido: estadoPago no aprobado →', maestra.estadoPago);
        return { success: true, skipped: true, reason: 'estadoPago-no-aprobado' };
      }

      // Idempotencia 1: cursoActual desactualizado → no-op
      if (maestra.cursoActual !== cursoActualIndex) {
        console.log('[avanzarPack] omitido: cursoActual desactualizado');
        return { success: true, skipped: true, reason: 'cursoActual-desactualizado' };
      }

      // Idempotencia 2: la subReserva actual debe apuntar a la child recibida
      const subActual = (maestra.subReservas || [])[cursoActualIndex];
      if (!subActual || String(subActual.reservaId) !== String(childId)) {
        console.log('[avanzarPack] omitido: childId no coincide con subReservas[actual]');
        return { success: true, skipped: true, reason: 'childId-no-coincide' };
      }

      // Idempotencia 3: la subReserva ya fue avanzada
      if (subActual.estado === 'completado') {
        console.log('[avanzarPack] omitido: subReserva ya completada');
        return { success: true, skipped: true, reason: 'ya-completado' };
      }

      // Validar que la child esté Aprobada
      const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', childId);
      const childSnap = await getDoc(childRef);
      if (!childSnap.exists()) {
        return { success: false, error: { code: 'child-not-found' } };
      }
      if (childSnap.data().estadoCurso !== 'Aprobado') {
        return { success: false, error: { code: 'child-no-aprobado', message: 'La reserva hija no está Aprobada' } };
      }

      // Pack vencido: no avanzar, marcar como vencido
      const vencimientoMs = maestra.vencimiento?.toMillis?.() || 0;
      if (vencimientoMs > 0 && vencimientoMs < Date.now()) {
        await updateDoc(maestraRef, { estado: 'vencido' });
        console.log('[avanzarPack] pack vencido, marcado como vencido');
        return { success: true, skipped: true, reason: 'pack-vencido' };
      }

      // Construir subReservas actualizado
      const subReservas = [...(maestra.subReservas || [])];
      subReservas[cursoActualIndex] = {
        ...subReservas[cursoActualIndex],
        estado: 'completado'
      };

      const esUltimoCurso = cursoActualIndex >= subReservas.length - 1;

      if (esUltimoCurso) {
        await updateDoc(maestraRef, {
          subReservas,
          estado: 'completado'
        });
        console.log('[avanzarPack] pack completado al 100%');
        return { success: true, completado: true };
      }

      // Activar el siguiente curso
      subReservas[cursoActualIndex + 1] = {
        ...subReservas[cursoActualIndex + 1],
        estado: 'activo'
      };

      await updateDoc(maestraRef, {
        subReservas,
        cursoActual: cursoActualIndex + 1
      });
      console.log('[avanzarPack] pack avanzado al curso', cursoActualIndex + 1);
      return { success: true, nuevoCursoActual: cursoActualIndex + 1 };
    } catch (error) {
      console.error('[avanzarPackTrasCompletarCurso] Error:', error);
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },
};