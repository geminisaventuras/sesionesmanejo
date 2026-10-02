// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-PACKS | desc: Terminología legal - sesiones, desarrollo. Se agrega LegalFooter.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Package, Clock, ChevronLeft, GraduationCap, Sparkles } from 'lucide-react';
import LegalFooter from '../../shared/components/LegalFooter';

const APP_ID = 'motoescuela-pro-v1';

export default function PacksPublicosView() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const packsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'packs');
    const q = query(packsRef, where('activo', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      setPacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const cursosRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'cursos');
    const q = query(cursosRef, where('activo', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const calcularPrecio = (pack) => {
    const cursosPack = (pack.cursoIds || [])
      .map(id => cursos.find(c => String(c.id) === String(id)))
      .filter(Boolean);
    const base = cursosPack.reduce((acc, c) => acc + (Number(c.precioBase) || 0), 0);
    const desc = pack.descuentoTipo === 'porcentaje'
      ? (base * (Number(pack.descuentoValor) || 0)) / 100
      : (Number(pack.descuentoValor) || 0);
    const final = Math.max(0, base - desc);
    return { base, final, cursosPack, ahorro: base - final };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando packs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-40 bg-black/30 backdrop-blur rounded-full p-2 text-white hover:bg-black/40 transition-colors"
        aria-label="Volver"
      >
        <ChevronLeft size={24} />
      </button>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Packs de Desarrollo Completo</h1>
          <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
            Ahorra tiempo y dinero. Nuestros packs incluyen toda la ruta desde cero hasta la práctica supervisada.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {packs.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay packs disponibles por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {packs.map(pack => {
              const { base, final, cursosPack, ahorro } = calcularPrecio(pack);
              return (
                <div key={pack.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border-2 border-indigo-100">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 border-b border-indigo-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{pack.nombre}</h2>
                        {pack.descripcion && (
                          <p className="text-sm text-gray-600">{pack.descripcion}</p>
                        )}
                      </div>
                      <Package size={32} className="text-indigo-500 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                        Incluye {cursosPack.length} sesiones:
                      </h3>
                      <div className="space-y-2">
                        {cursosPack.map((c, i) => (
                          <div key={c.id} className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900">{c.nombre}</p>
                              <p className="text-xs text-gray-500">
                                ${c.precioBase} · {Math.round((c.duracionTotal || 0) / 60)}h
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {pack.vencimientoDias > 0 && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                        <Clock size={14} />
                        <span>Vigencia: <strong>{pack.vencimientoDias} días</strong> desde la compra</span>
                      </div>
                    )}

                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs text-gray-600">Suma de sesiones:</span>
                        <span className="text-sm text-gray-500 line-through">${base.toFixed(2)}</span>
                      </div>
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-xs text-green-700 font-bold">Ahorras:</span>
                        <span className="text-sm text-green-700 font-bold">${ahorro.toFixed(2)}</span>
                      </div>
                      <div className="flex items-baseline justify-between border-t border-indigo-300 pt-2">
                        <span className="text-sm font-bold text-gray-800">Precio final:</span>
                        <span className="text-3xl font-black text-indigo-700">${final.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                                          onClick={() => {
                        navigate('/inscripcion', {
                          state: {
                            esPack: true,
                            packId: pack.id,
                            origen: 'pack-publico'
                          }
                        });
                      }}
                      className="w-full bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-bold text-base flex items-center justify-center gap-2"
                    >
                      <Sparkles size={18} />
                      Quiero este Pack
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <GraduationCap size={40} className="text-indigo-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-3">¿Prefieres una sesión individual?</h2>
          <p className="text-gray-600 mb-6">
            También puedes tomar cada sesión por separado según tu nivel actual.
          </p>
          <button
            onClick={() => navigate('/sesiones')}
            className="text-indigo-600 hover:text-indigo-700 font-bold underline"
          >
            Ver sesiones individuales →
          </button>
        </div>
      </div>

      <LegalFooter />
    </div>
  );
}