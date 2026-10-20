// @build: 2026-10-10 | id: VISTA-PACKS | desc: Packs disponibles para comprar desde el panel del cliente
import { useContext, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { Package, Sparkles, ChevronRight, GraduationCap, AlertCircle } from 'lucide-react';

const APP_ID = 'motoescuela-pro-v1';

export function VistaPacks() {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();
  const { packs, cursos, fbUser } = ctx;

  const [tienePackSesionesActivo, setTienePackSesionesActivo] = useState(false);

  useEffect(() => {
    if (!fbUser?.uid) { setTienePackSesionesActivo(false); return; }
    let activo = true;
    (async () => {
      try {
        const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservasPack');
        const q = query(ref, where('userId', '==', fbUser.uid));
        const snap = await getDocs(q);
        const tiene = snap.docs.some(d => {
          const p = d.data();
          const estado = p.estadoPago;
          const cursoIds = p.packSnapshot?.cursoIds || [];
          // FIX-VISTAPACKS-COMPLETADO: un pack completado/vencido/cancelado NO debe bloquear.
          // Mismo criterio que PacksPublicosView y ReservaService.crearReservaPack.
          return (estado === 'Aprobado' || estado === 'Pendiente')
            && (p.estado === 'activo' || p.estado === undefined)
            && cursoIds.length > 0;
        });
        if (activo) setTienePackSesionesActivo(tiene);
      } catch (err) {
        console.warn('[VistaPacks] Error verificando packs:', err);
        if (activo) setTienePackSesionesActivo(false);
      }
    })();
    return () => { activo = false; };
  }, [fbUser?.uid]);

  const packsDisponibles = useMemo(() => {
    return (packs || [])
      .filter(p => p.activo !== false)
      .sort((a, b) => (a.orden || 99) - (b.orden || 99));
  }, [packs]);

  const calcularPrecio = (pack) => {
    const cursoIds = pack.cursoIds || [];
    const sumaBaseCursos = cursoIds.reduce((acc, cid) => {
      const c = (cursos || []).find(x => String(x.id) === String(cid));
      return acc + (Number(c?.precioBase) || 0);
    }, 0);
    const sumaBaseTeoricos = pack.sumarTeoricosAlPrecio
      ? (pack.cursosTeoricosIncluidos || []).reduce((acc, ctId) => {
          const ct = (ctx.cursosTeoricos || []).find(x => String(x.id) === String(ctId));
          return acc + (Number(ct?.precio) || 0);
        }, 0)
      : 0;
    const sumaBase = sumaBaseCursos + sumaBaseTeoricos;
    const desc = pack.descuentoTipo === 'porcentaje'
      ? (sumaBase * (Number(pack.descuentoValor) || 0)) / 100
      : (Number(pack.descuentoValor) || 0);
    return {
      base: sumaBase,
      descuento: Number(desc.toFixed(2)),
      final: Number((sumaBase - desc).toFixed(2))
    };
  };

  const handleComprar = (pack) => {
    navigate('/inscripcion', {
      state: {
        esPack: true,
        packId: pack.id,
        origen: 'panel-estudiante'
      }
    });
  };

  if (packsDisponibles.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
        <Package size={48} className="text-gray-300 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900 mb-1">Sin packs disponibles</h3>
        <p className="text-xs text-gray-500">Vuelve pronto para ver nuevos combos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider px-1">
        Packs disponibles ({packsDisponibles.length})
      </h2>
      {packsDisponibles.map(pack => {
        const precios = calcularPrecio(pack);
        const cursosPack = (pack.cursoIds || [])
          .map(cid => (cursos || []).find(c => String(c.id) === String(cid)))
          .filter(Boolean);
        return (
          <div key={pack.id} className="bg-white rounded-2xl border-2 border-indigo-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Package size={20} className="text-indigo-600" />
              <h3 className="font-black text-base text-gray-900 flex-1">{pack.nombre || 'Pack'}</h3>
            </div>
            {pack.descripcion && (
              <p className="text-xs text-gray-600 mb-3">{pack.descripcion}</p>
            )}
            <div className="space-y-1 mb-3">
              {cursosPack.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate">{c.nombre}</span>
                </div>
              ))}

              {(pack.cursosTeoricosIncluidos || []).length > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed border-indigo-100">
                  <p className="text-[10px] font-black text-teal-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <GraduationCap size={12} /> Módulos formativos incluidos
                  </p>
                  {(pack.cursosTeoricosIncluidos || []).map(ctId => {
                    const ct = (ctx.cursosTeoricos || []).find(x => String(x.id) === String(ctId));
                    return (
                      <div key={ctId} className="flex items-center gap-2 text-[11px] text-teal-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                        <span className="truncate">{ct?.nombre || ctId}</span>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
            <div className="flex items-center justify-between mb-3 pt-2 border-t border-gray-100">
              <div>
                <p className="text-[10px] text-gray-500 line-through">${precios.base} USD</p>
                <p className="text-[10px] font-bold text-green-600">Ahorras ${precios.descuento}</p>
              </div>
              <p className="text-xl font-black text-indigo-700">${precios.final} <span className="text-xs">USD</span></p>
            </div>
            {(() => {
              const tieneCursoIds = (pack.cursoIds || []).length > 0;
              const bloqueado = tieneCursoIds && tienePackSesionesActivo;
              if (bloqueado) {
                return (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-800">
                      Ya tienes un pack de sesiones activo. Termínalo antes de comprar otro.
                    </p>
                  </div>
                );
              }
              return (
                <button
                  onClick={() => handleComprar(pack)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                >
                  <Sparkles size={16} /> Comprar este Pack <ChevronRight size={14} />
                </button>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

export default VistaPacks;
