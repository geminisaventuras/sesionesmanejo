// @build: 2026-10-01 | id: FORM-MODULO-TEORICO | desc: Editor de módulos teóricos con soporte para leccion, video y quiz
import { useState, useEffect } from 'react';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft, BookOpen, Video, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { ModuloTeoricoService } from '../services/ModuloTeoricoService';

const TIPOS = [
  { id: 'leccion', label: 'Lección', icon: BookOpen, desc: 'Texto que el usuario lee' },
  { id: 'video', label: 'Video', icon: Video, desc: 'Video embebido (YouTube/Vimeo)' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, desc: 'Preguntas con calificación automática' }
];

const FormModuloTeorico = ({ item, cursoId, totalModulos, onSave, onCancel }) => {
  const [form, setForm] = useState({
    id: item?.id || '',
    titulo: item?.titulo || '',
    tipo: item?.tipo || 'leccion',
    duracionMin: item?.duracionMin || 5,
    orden: item?.orden || (totalModulos + 1),
    // Lección
    contenido: item?.contenido || '',
    // Video
    videoUrl: item?.videoUrl || '',
    disclaimer: item?.disclaimer || 'Video con fines ilustrativos y de educación deportiva no formal. No reemplaza la formación oficial del INTT.',
    // Quiz
    quizId: item?.quizId || '',
    preguntas: []
  });

  const [cargandoQuiz, setCargandoQuiz] = useState(false);

  // Si es tipo quiz y ya tiene quizId, cargar las preguntas
  useEffect(() => {
    if (form.tipo !== 'quiz' || !form.quizId) return;
    let activo = true;
    const cargar = async () => {
      setCargandoQuiz(true);
      const res = await ModuloTeoricoService.obtenerQuizPorId(form.quizId);
      if (activo && res.success) {
        setForm(prev => ({ ...prev, preguntas: res.data.preguntas || [] }));
      }
      if (activo) setCargandoQuiz(false);
    };
    cargar();
    return () => { activo = false; };
  }, [form.tipo, form.quizId]);

  const agregarPregunta = () => {
    setForm(prev => ({
      ...prev,
      preguntas: [
        ...prev.preguntas,
        { texto: '', opciones: ['', '', '', ''], correcta: 0, explicacion: '' }
      ]
    }));
  };

  const eliminarPregunta = (idx) => {
    setForm(prev => ({ ...prev, preguntas: prev.preguntas.filter((_, i) => i !== idx) }));
  };

  const actualizarPregunta = (idx, campo, valor) => {
    setForm(prev => ({
      ...prev,
      preguntas: prev.preguntas.map((p, i) => i === idx ? { ...p, [campo]: valor } : p)
    }));
  };

  const actualizarOpcion = (pIdx, oIdx, valor) => {
    setForm(prev => ({
      ...prev,
      preguntas: prev.preguntas.map((p, i) => i === pIdx
        ? { ...p, opciones: p.opciones.map((o, j) => j === oIdx ? valor : o) }
        : p
      )
    }));
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      alert('El título del módulo es obligatorio');
      return;
    }
    if (form.tipo === 'leccion' && !form.contenido.trim()) {
      alert('La lección debe tener contenido');
      return;
    }
    if (form.tipo === 'video' && !form.videoUrl.trim()) {
      alert('El video debe tener una URL');
      return;
    }

    // Guardar quiz primero si aplica, para tener el ID
    let quizIdFinal = form.quizId;
    if (form.tipo === 'quiz') {
      if (form.preguntas.length === 0) {
        alert('El quiz debe tener al menos una pregunta');
        return;
      }
      const preguntasValidas = form.preguntas.every(p =>
        p.texto.trim() && p.opciones.every(o => o.trim())
      );
      if (!preguntasValidas) {
        alert('Completa el texto y las 4 opciones de cada pregunta');
        return;
      }
      quizIdFinal = form.quizId || `quiz_${Date.now()}`;
      const resQuiz = await ModuloTeoricoService.guardarQuiz({
        id: quizIdFinal,
        cursoId,
        moduloId: form.id || '',
        preguntas: form.preguntas
      });
      if (!resQuiz.success) {
        alert('Error guardando el quiz: ' + resQuiz.error);
        return;
      }
    }

    const payload = {
      id: form.id,
      cursoId,
      titulo: form.titulo,
      tipo: form.tipo,
      duracionMin: Number(form.duracionMin) || 0,
      orden: Number(form.orden) || 1
    };

    if (form.tipo === 'leccion') {
      payload.contenido = form.contenido;
    } else if (form.tipo === 'video') {
      payload.videoUrl = form.videoUrl;
      payload.disclaimer = form.disclaimer;
    } else if (form.tipo === 'quiz') {
      payload.quizId = quizIdFinal;
    }

    onSave(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-bold text-lg">{item?.id ? 'Editar' : 'Nuevo'} Módulo</h3>
      </div>

      <Input
        label="Título del módulo"
        value={form.titulo}
        onChange={e => setForm({ ...form, titulo: e.target.value })}
        placeholder="Ej: ¿Por qué existen las leyes de tránsito?"
      />

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de módulo</label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(t => {
            const Icono = t.icon;
            const activo = form.tipo === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm({ ...form, tipo: t.id })}
                className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center gap-1 ${
                  activo ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Icono size={20} className={activo ? 'text-blue-600' : 'text-gray-400'} />
                <span className="text-xs font-bold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Duración (min)"
          type="number"
          value={form.duracionMin}
          onChange={e => setForm({ ...form, duracionMin: Number(e.target.value) || 0 })}
        />
        <Input
          label="Orden"
          type="number"
          value={form.orden}
          onChange={e => setForm({ ...form, orden: Number(e.target.value) || 1 })}
        />
      </div>

      {/* Lección */}
      {form.tipo === 'leccion' && (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Contenido</label>
          <textarea
            value={form.contenido}
            onChange={e => setForm({ ...form, contenido: e.target.value })}
            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[200px] font-sans"
            placeholder="Texto de la lección..."
          />
        </div>
      )}

      {/* Video */}
      {form.tipo === 'video' && (
        <div className="space-y-3">
          <Input
            label="URL del video (embed)"
            value={form.videoUrl}
            onChange={e => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="https://www.youtube.com/embed/..."
          />
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Disclaimer del video</label>
            <textarea
              value={form.disclaimer}
              onChange={e => setForm({ ...form, disclaimer: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[80px]"
            />
          </div>
        </div>
      )}

      {/* Quiz */}
      {form.tipo === 'quiz' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-700">
              Preguntas ({form.preguntas.length})
            </label>
            <button
              type="button"
              onClick={agregarPregunta}
              className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800"
            >
              <Plus size={14} /> Añadir pregunta
            </button>
          </div>

          {cargandoQuiz && <p className="text-xs text-gray-500">Cargando preguntas...</p>}

          {form.preguntas.length === 0 && !cargandoQuiz && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-xs text-gray-500">
              No hay preguntas. Empieza añadiendo la primera.
            </div>
          )}

          {form.preguntas.map((p, pIdx) => (
            <div key={pIdx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-gray-500 mt-2">#{pIdx + 1}</span>
                <div className="flex-1">
                  <input
                    type="text"
                    value={p.texto}
                    onChange={e => actualizarPregunta(pIdx, 'texto', e.target.value)}
                    placeholder="Texto de la pregunta"
                    className="w-full bg-white border-2 border-gray-200 focus:border-blue-500 rounded-lg py-2 px-3 text-sm outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => eliminarPregunta(pIdx)}
                  className="p-1.5 text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-1.5 ml-6">
                {p.opciones.map((o, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correcta-${pIdx}`}
                      checked={p.correcta === oIdx}
                      onChange={() => actualizarPregunta(pIdx, 'correcta', oIdx)}
                      className="w-4 h-4"
                    />
                    <input
                      type="text"
                      value={o}
                      onChange={e => actualizarOpcion(pIdx, oIdx, e.target.value)}
                      placeholder={`Opción ${oIdx + 1}`}
                      className="flex-1 bg-white border border-gray-200 focus:border-blue-500 rounded-lg py-1.5 px-2 text-xs outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="ml-6">
                <input
                  type="text"
                  value={p.explicacion}
                  onChange={e => actualizarPregunta(pIdx, 'explicacion', e.target.value)}
                  placeholder="Explicación (aparece al responder)"
                  className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg py-1.5 px-2 text-xs outline-none"
                />
              </div>
            </div>
          ))}

          <p className="text-[10px] text-gray-500 italic">
            Marca el círculo junto a la opción que sea la respuesta correcta.
          </p>
        </div>
      )}

      <Button type="button" onClick={handleSave} variant="dark">Guardar Módulo</Button>
    </div>
  );
};

export default FormModuloTeorico;