// @build: 2026-10-02 | id: TEORICO-PUBLICO-VIEW | desc: Vista pública de Módulos Formativos (formación educativa no formal)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { BookOpen, Clock, ChevronLeft, GraduationCap, BookMarked, Sparkles } from 'lucide-react';
import ModalDetalleTeorico from '../components/ModalDetalleTeorico';
import LegalFooter from '../../shared/components/LegalFooter';

const APP_ID = 'motoescuela-pro-v1';

const formatearDuracionAcceso = (duracion) => {
  if (!duracion || duracion === 'vida') return 'Acceso de por vida';
  return `Acceso por ${duracion} días`;
};

export default function TeoricoPublicoView() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'cursosTeoricos');
    const q = query(ref, where('activo', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const activos = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
      setModulos(activos);
      setLoading(false);
    }, (err) => {
      console.warn('[TeoricoPublicoView] Error cargando módulos:', err.code);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando formación educativa...</p>
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

      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Formación Educativa</h1>
          <p className="text-xl text-teal-100 max-w-3xl mx-auto">
            Contenido educativo no formal. Aprende a tu ritmo con módulos interactivos, videos y retos.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {modulos.length === 0 ? (
          <div className="text-center py-12">
            <BookMarked size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay módulos formativos disponibles por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulos.map(modulo => {
              const precio = Number(modulo.precio) || 0;
              const esGratis = precio === 0;
              return (
                <div
                  key={modulo.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow flex flex-col"
                >
                  <div className="bg-teal-50 p-4 border-b border-teal-100">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-xl font-bold text-gray-900 flex-1">{modulo.nombre}</h2>
                      <BookOpen size={24} className="text-teal-600 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="p-4 space-y-4 flex-1 flex flex-col">
                    {modulo.descripcion && (
                      <p className="text-gray-700 text-sm line-clamp-3">{modulo.descripcion}</p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatearDuracionAcceso(modulo.duracionAcceso)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <BookMarked className="w-4 h-4" />
                        <span>
                          {modulo.totalModulos || 0} módulos · {modulo.totalQuizzes || 0} retos
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4">
                      <div className="flex items-baseline gap-2 mb-3">
                        {esGratis ? (
                          <span className="text-2xl font-black text-teal-600">Gratis</span>
                        ) : (
                          <>
                            <span className="text-2xl font-black text-teal-600">
                              ${precio}
                            </span>
                            <span className="text-gray-500 text-sm">{modulo.moneda || 'USD'}</span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setDetalle(modulo)}
                          className="w-full border-2 border-teal-600 text-teal-600 px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors font-medium text-sm"
                        >
                          Leer más
                        </button>
                        <button
                          onClick={() => setDetalle(modulo)}
                          className="w-full bg-teal-600 text-white px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <Sparkles size={16} />
                          {esGratis ? 'Comenzar' : 'Ver detalle'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detalle && (
        <ModalDetalleTeorico
          modulo={detalle}
          onClose={() => setDetalle(null)}
        />
      )}

      <LegalFooter />
    </div>
  );
}