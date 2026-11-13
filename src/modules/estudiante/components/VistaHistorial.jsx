// @build: 2026-11-13 | id: VISTA-HISTORIAL-V4 | desc: Enterprise - Tasa histórica, fecha/hora/sede, cálculo forzado
import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { Clock, BookOpen, GraduationCap, Package, Receipt, DollarSign, X } from 'lucide-react';

const APP_ID = 'motoescuela-pro-v1';

const ESTADO_LABEL = {
  completados: { label: 'Completado', color: 'bg-green-100 text-green-700' },
  cancelados: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700' },
  rechazados: { label: 'Rechazado', color: 'bg-red-100 text-red-700' },
  Aprobado: { label: 'Aprobado', color: 'bg-green-100 text-green-700' },
  Pendiente: { label: 'Pendiente', color: 'bg-orange-100 text-orange-700' },
  Cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700' },
  Rechazado: { label: 'Rechazado', color: 'bg-red-100 text-red-700' },
};

export function VistaHistorial() {
  const ctx = useContext(AppContext);
  const [reservas, setReservas] = useState([]);
  const [accesos, setAccesos] = useState([]);
  const [packs, setPacks] = useState([]);
  const [vista, setVista] = useState('actividad'); // 'actividad' | 'compras'
  const [packDetalle, setPackDetalle] = useState(null);
  
  const cursos = ctx.cursos || [];
  const cursosTeoricos = ctx.cursosTeoricos || [];
  const uid = ctx.fbUser?.uid;

  const cargar = useCallback(async () => {
    if (!uid) return;
    try {
      const base = ['artifacts', APP_ID, 'public', 'data'];
      const [rSnap, aSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, ...base, 'reservas'), where('userId', '==', uid))),
        getDocs(query(collection(db, ...base, 'accesosTeoricos'), where('userId', '==', uid))),
        getDocs(query(collection(db, ...base, 'reservasPack'), where('userId', '==', uid)))
      ]);
      setReservas(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAccesos(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPacks(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('[VistaHistorial] Error cargando datos:', err);
    }
  }, [uid]);

  useEffect(() => { cargar(); }, [cargar]);

  // --- LÓGICA PARA ACTIVIDAD ACADÉMICA ---
  const itemsActividad = useMemo(() => {
    const timeline = [];

    reservas.forEach(r => {
      const curso = cursos.find(c => String(c.id) === String(r.cursoId));
      let estado = null;
      if (r.estadoPago === 'Cancelado') estado = 'cancelados';
      else if (r.estadoPago === 'Rechazado') estado = 'rechazados';
      else if (r.estadoCurso === 'Aprobado' || r.estadoCurso === 'Completado') estado = 'completados';
      
      if (estado) timeline.push({
        tipo: r.tipoReserva === 'pack_sub' ? 'pack' : 'sesion',
        id: r.id,
        titulo: r.tipoReserva === 'pack_sub'
          ? `${curso?.nombre || 'Sesión'} (Pack)`
          : (curso?.nombre || 'Sesión de práctica'),
        estado,
        fecha: r.createdAt?.toDate?.() || new Date()
      });
    });

    accesos.forEach(a => {
      const curso = cursosTeoricos.find(c => String(c.id) === String(a.cursoTeoricoId));
      let estado = null;
      if (a.estadoPago === 'Cancelado') estado = 'cancelados';
      else if (a.estadoPago === 'Rechazado') estado = 'rechazados';
      if (estado) timeline.push({
        tipo: 'teorico',
        id: a.id,
        titulo: curso?.nombre || 'Módulo formativo',
        estado,
        fecha: a.fechaCompra?.toDate?.() || new Date()
      });
    });

    packs.forEach(p => {
      let estado = null;
      if (p.estadoPago === 'Cancelado' || p.estado === 'cancelado') estado = 'cancelados';
      else if (p.estado === 'completado') estado = 'completados';
      if (estado) timeline.push({
        tipo: 'pack',
        id: p.id,
        titulo: p.packNombre || 'Pack',
        estado,
        fecha: p.fechaCompra?.toDate?.() || new Date()
      });
    });

    return timeline.sort((a, b) => b.fecha - a.fecha);
  }, [reservas, accesos, packs, cursos, cursosTeoricos]);

  // --- LÓGICA PARA HISTORIAL DE COMPRAS ---
  const itemsCompras = useMemo(() => {
    const lista = [];

    reservas.forEach(r => {
      // 1. EXCLUIR SUB-RESERVAS DE PACK PARA NO DUPLICAR
      if (r.tipoReserva === 'pack_sub') return;

      const curso = cursos.find(c => String(c.id) === String(r.cursoId));
      const horario = (ctx.horarios || []).find(h => String(h.id) === String(r.horaId));
      const sede = (ctx.sedes || []).find(s => String(s.id) === String(r.sedeId));
      
      lista.push({
        tipo: 'sesion',
        id: r.id,
        titulo: curso?.nombre || 'Sesión',
        estado: r.estadoPago || 'Pendiente',
        fecha: r.createdAt?.toDate?.() || new Date(),
        montoUSD: Number(r.pagoTotalMoneda || r.precio || 0),
        montoVES: Number(r.pagoTotalVES || 0),
        pagoRef: r.pagoRef,
        pagoBanco: r.pagoBanco,
        // Datos extra de la sesión
        fechaSesion: r.fecha,
        horaLabel: horario?.label || r.horaId,
        sedeNombre: sede?.nombre || ''
      });
    });

    accesos.forEach(a => {
      // Ignorar teóricos que vienen incluidos en un pack
      if (String(a.id).startsWith('pack_')) return;

      const curso = cursosTeoricos.find(c => String(c.id) === String(a.cursoTeoricoId));
      lista.push({
        tipo: 'teorico',
        id: a.id,
        titulo: curso?.nombre || 'Módulo formativo',
        estado: a.estadoPago || 'Pendiente',
        fecha: a.fechaCompra?.toDate?.() || new Date(),
        montoUSD: Number(a.precio || a.pagoTotalMoneda || 0),
        montoVES: Number(a.pagoTotalVES || 0),
        pagoRef: a.pagoRef,
        pagoBanco: a.pagoBanco
      });
    });

    packs.forEach(p => {
      const base = Number(p.precioBaseCongelado || 0);
      const desc = Number(p.descuentoCongelado?.monto || 0);
      
      let finalUSD = Number(p.precioTotalCongelado || p.pagoTotalMoneda || 0);
      let finalVES = Number(p.pagoTotalVES || 0);
      
      // Forzamos la resta correcta si hay base y descuento
      if (base > 0 && desc > 0) {
        finalUSD = base - desc;
        // Recalculamos los bolívares con la tasa que se usó originalmente
        if (p.pagoTotalVES && p.precioTotalCongelado) {
          const tasa = p.pagoTotalVES / p.precioTotalCongelado;
          finalVES = finalUSD * tasa;
        }
      }

      lista.push({
        tipo: 'pack',
        id: p.id,
        titulo: p.packNombre || 'Pack',
        estado: p.estadoPago || 'Pendiente',
        fecha: p.fechaCompra?.toDate?.() || new Date(),
        montoUSD: finalUSD,
        montoVES: finalVES,
        pagoRef: p.pagoRef,
        pagoBanco: p.pagoBanco,
        subReservas: p.subReservas || [],
        baseUSD: base,
        descuentoUSD: desc,
        teoricosIncluidos: p.packSnapshot?.cursosTeoricosIncluidos || p.cursosTeoricosIncluidos || []
      });
    });

    return lista.sort((a, b) => b.fecha - a.fecha);
  }, [reservas, accesos, packs, cursos, cursosTeoricos, ctx.horarios, ctx.sedes]);

  return (
    <div className="space-y-4">
      {/* Toggle (Pestañas) */}
      <div className="flex bg-gray-200 p-1 rounded-xl">
        <button
          onClick={() => setVista('actividad')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${vista === 'actividad' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          Actividad Académica
        </button>
        <button
          onClick={() => setVista('compras')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${vista === 'compras' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          Historial de Compras
        </button>
      </div>

      {/* VISTA: ACTIVIDAD ACADÉMICA */}
      {vista === 'actividad' && (
        <div className="space-y-2">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider px-1">Historial ({itemsActividad.length})</h2>
          {itemsActividad.length === 0 && <p className="text-xs text-gray-500 px-1">Sin historial académico.</p>}
          {itemsActividad.map(item => {
            const cfg = ESTADO_LABEL[item.estado] || { label: item.estado, color: 'bg-gray-100 text-gray-700' };
            const Icono = item.tipo === 'sesion' ? BookOpen : item.tipo === 'teorico' ? GraduationCap : Package;
            return (
              <div key={item.tipo + item.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icono size={18} className="text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{item.titulo}</p>
                  <p className="text-[10px] text-gray-500">
                    {item.fecha.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA: HISTORIAL DE COMPRAS */}
      {vista === 'compras' && (
        <div className="space-y-2">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider px-1">Compras ({itemsCompras.length})</h2>
          {itemsCompras.length === 0 && <p className="text-xs text-gray-500 px-1">No has realizado compras aún.</p>}
          {itemsCompras.map(item => {
            const cfg = ESTADO_LABEL[item.estado] || { label: item.estado, color: 'bg-gray-100 text-gray-700' };
            
            // Si es un pack, lo hacemos clickeable
            const esPack = item.tipo === 'pack';
            
            return (
              <div 
                key={item.tipo + item.id} 
                className={`bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2 transition-all ${esPack ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md' : ''}`}
                onClick={() => esPack && setPackDetalle(item)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${esPack ? 'bg-purple-50' : 'bg-indigo-50'}`}>
                    {esPack ? <Package size={18} className="text-purple-600" /> : <Receipt size={18} className="text-indigo-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{item.titulo}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      Compra: {item.fecha.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {esPack && <span className="text-purple-600 font-bold ml-1 text-[9px] bg-purple-50 px-1.5 py-0.5 rounded-full">Ver detalle</span>}
                    </p>
                    {!esPack && item.fechaSesion && (
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                        📅 Sesión: {item.fechaSesion.split('-').reverse().join('/')} · {item.horaLabel} · {item.sedeNombre}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                
                {/* Detalles del pago (solo si hay datos) */}
                {(item.montoUSD > 0 || item.montoVES > 0 || item.pagoRef) && (
                  <div className="bg-gray-50 rounded-lg p-2 flex justify-between items-center text-xs mt-1">
                    <div>
                      {item.montoUSD > 0 && <p className="font-bold text-gray-800">${item.montoUSD.toFixed(2)}</p>}
                      {item.montoVES > 0 && <p className="text-gray-500">Bs. {item.montoVES.toFixed(2)}</p>}
                      {item.pagoRef && <p className="text-[10px] text-gray-500">Ref: {item.pagoRef}</p>}
                    </div>
                    <DollarSign size={16} className="text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DETALLE DE PACK */}
      {packDetalle && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPackDetalle(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">{packDetalle.titulo}</h3>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-1">
                  Desglose de la compra
                </p>
              </div>
              <button onClick={() => setPackDetalle(null)} className="p-1 bg-gray-100 rounded-full hover:bg-gray-200">
                <X size={18} className="text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {/* Lista de cursos */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Sesiones incluidas</h4>
                <div className="space-y-2">
                  {packDetalle.subReservas?.map((sub, idx) => {
                    const cursoObj = cursos.find(c => String(c.id) === String(sub.cursoId));
                    const precioBase = cursoObj?.precioBase || sub.precio || 0;
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600">{idx + 1}</span>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{sub.cursoNombre || sub.cursoId}</span>
                            <span className="text-[10px] text-gray-400">{sub.estado === 'completado' ? 'Completado' : sub.estado === 'activo' ? 'En curso' : 'Bloqueado'}</span>
                          </div>
                        </div>
                        <span className="font-bold text-gray-700">${Number(precioBase).toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {(!packDetalle.subReservas || packDetalle.subReservas.length === 0) && (
                    <p className="text-xs text-gray-500">Sin desglose disponible.</p>
                  )}
                </div>
              </div>

              {/* Módulos Formativos (Bonos) */}
              {packDetalle.teoricosIncluidos?.length > 0 && (
                <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                  <h4 className="text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <GraduationCap size={14} /> Módulos Formativos (Bono)
                  </h4>
                  <div className="space-y-2">
                    {packDetalle.teoricosIncluidos.map((ctId, idx) => {
                      const ctObj = cursosTeoricos.find(c => String(c.id) === String(ctId));
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-teal-100 pb-2 last:border-0 last:pb-0">
                          <span className="font-medium text-teal-900">{ctObj?.nombre || 'Módulo Formativo'}</span>
                          <span className="font-bold text-teal-700 bg-teal-100/50 px-2 py-0.5 rounded text-[10px]">Incluido</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Desglose de precio */}
              <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                <h4 className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider mb-2">Resumen financiero</h4>
                {packDetalle.baseUSD > 0 && (
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Suma de sesiones:</span>
                    <span className="line-through">${packDetalle.baseUSD.toFixed(2)}</span>
                  </div>
                )}
                {packDetalle.descuentoUSD > 0 && (
                  <div className="flex justify-between text-xs text-green-700 mb-1">
                    <span>Ahorro (Pack):</span>
                    <span>-${packDetalle.descuentoUSD.toFixed(2)}</span>
                  </div>
                )}
                
                {/* CALCULO FORZADO Y TASA HISTÓRICA */}
                {(() => {
                  const totalReal = Math.max(0, packDetalle.baseUSD - packDetalle.descuentoUSD) || packDetalle.montoUSD;
                  const tasa = packDetalle.montoVES > 0 && packDetalle.montoUSD > 0 
                    ? (packDetalle.montoVES / packDetalle.montoUSD) 
                    : 0;
                  const totalVESReal = totalReal * tasa;

                  return (
                    <>
                      <div className="flex justify-between text-sm font-black text-indigo-900 border-t border-indigo-200 pt-2 mt-1">
                        <span>Total pagado:</span>
                        <span>${totalReal.toFixed(2)}</span>
                      </div>
                      {totalVESReal > 0 && (
                        <div className="flex flex-col gap-0.5 mt-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Equivalente Bs:</span>
                            <span>Bs. {totalVESReal.toFixed(2)}</span>
                          </div>
                          {packDetalle.montoUSD > 0 && (
                            <div className="flex justify-between text-[10px] text-gray-400">
                              <span>Tasa aplicada (histórica):</span>
                              <span>Bs. {(packDetalle.montoVES / packDetalle.montoUSD).toFixed(2)} / $</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <button 
              onClick={() => setPackDetalle(null)}
              className="w-full mt-4 bg-gray-800 text-white font-bold py-2.5 rounded-xl hover:bg-gray-900 transition-colors flex-shrink-0"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VistaHistorial;