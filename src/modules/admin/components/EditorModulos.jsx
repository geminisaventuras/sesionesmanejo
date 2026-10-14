// @build: 2026-10-01 | id: EDITOR-MODULOS | desc: CRUD inline de módulos y quizzes dentro de un curso teórico
import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash2, Video, BookOpen, HelpCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { ModuloTeoricoService } from '../services/ModuloTeoricoService';
import { useToast } from '../../shared/components/ToastProvider';
import { Button } from '../../../components/UI';
import FormModuloTeorico from '../forms/FormModuloTeorico';

const ICONOS_TIPO = {
  leccion: BookOpen,
  quiz: HelpCircle,
  video: Video
};

const ETIQUETAS_TIPO = {
  leccion: 'Lección',
  quiz: 'Quiz',
  video: 'Video'
};

const EditorModulos = ({ cursoId, onChangeContadores }) => {
  const { showToast } = useToast();
  const [modulos, setModulos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(null); // null | {} (nuevo) | { modulo }
  const onChangeRef = useRef(onChangeContadores);
  useEffect(() => { onChangeRef.current = onChangeContadores; }, [onChangeContadores]);
    const cargar = useCallback(async () => {
    if (!cursoId) { setModulos([]); return; }
    setCargando(true);
    const res = await ModuloTeoricoService.obtenerModulosPorCurso(cursoId);
    if (res.success) {
      setModulos(res.data);
      if (onChangeRef.current) {
        const totalQuizzes = res.data.filter(m => m.tipo === 'quiz').length;
        onChangeRef.current({ totalModulos: res.data.length, totalQuizzes });
      }
    } else {
      showToast('Error al cargar módulos', 'error');
    }
    setCargando(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardarModulo = async (modulo) => {
    const payload = {
      ...modulo,
      cursoId,
      orden: modulo.orden || (modulos.length + 1)
    };
    const res = await ModuloTeoricoService.guardarModulo(payload);
    if (res.success) {
      showToast('Módulo guardado', 'success');
      setEditando(null);
      await cargar();
    } else {
      showToast('Error al guardar: ' + res.error, 'error');
    }
  };

  const handleEliminar = async (modulo) => {
    if (!window.confirm(`¿Eliminar el módulo "${modulo.titulo}"? Esta acción no se puede deshacer.`)) return;
    const res = await ModuloTeoricoService.eliminarModulo(modulo.id);
    if (res.success) {
      showToast('Módulo eliminado', 'success');
      await cargar();
    } else {
      showToast('Error al eliminar: ' + res.error, 'error');
    }
  };

  const handleMover = async (modulo, dir) => {
    const idx = modulos.findIndex(m => m.id === modulo.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= modulos.length) return;
    const otros = modulos[newIdx];
    await ModuloTeoricoService.guardarModulo({ ...modulo, orden: otros.orden });
    await ModuloTeoricoService.guardarModulo({ ...otros, orden: modulo.orden });
    await cargar();
  };

  if (!cursoId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-sm text-yellow-800">
        Guarda primero el curso para poder agregar módulos.
      </div>
    );
  }

  if (editando !== null) {
    return (
      <FormModuloTeorico
        item={editando}
        cursoId={cursoId}
        totalModulos={modulos.length}
        onSave={handleGuardarModulo}
        onCancel={() => setEditando(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-700">Módulos del curso</h4>
        <button
          type="button"
          onClick={() => setEditando({ orden: modulos.length + 1 })}
          className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800"
        >
          <Plus size={14} /> Añadir módulo
        </button>
      </div>

      {cargando && <p className="text-xs text-gray-500 text-center py-2">Cargando módulos...</p>}

      {!cargando && modulos.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-xs text-gray-500">
          No hay módulos. Empieza creando la primera lección, video o quiz.
        </div>
      )}

      {!cargando && modulos.length > 0 && (
        <div className="space-y-2">
          {modulos.map((m, i) => {
            const Icono = ICONOS_TIPO[m.tipo] || BookOpen;
            return (
              <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2">
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold shrink-0">
                  {m.orden}
                </span>
                <Icono size={16} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{m.titulo}</p>
                  <p className="text-[10px] text-gray-500">
                    {ETIQUETAS_TIPO[m.tipo] || m.tipo} · {m.duracionMin || 0} min
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {i > 0 && (
                    <button type="button" onClick={() => handleMover(m, -1)} className="p-1.5 text-gray-400 hover:text-gray-700">
                      <ArrowUp size={14} />
                    </button>
                  )}
                  {i < modulos.length - 1 && (
                    <button type="button" onClick={() => handleMover(m, 1)} className="p-1.5 text-gray-400 hover:text-gray-700">
                      <ArrowDown size={14} />
                    </button>
                  )}
                  <button type="button" onClick={() => setEditando(m)} className="p-1.5 text-gray-500 hover:text-blue-600">
                    <Edit size={14} />
                  </button>
                  <button type="button" onClick={() => handleEliminar(m)} className="p-1.5 text-gray-500 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EditorModulos;