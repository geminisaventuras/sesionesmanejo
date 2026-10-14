// @build: 2026-10-09 | id: QUIZ-RENDERER | desc: Renderer del quiz teórico con validación y puntaje
import { useState } from 'react';
import { Check, X, AlertCircle, RefreshCw } from 'lucide-react';

export default function QuizRenderer({ preguntas = [], onCompletar }) {
  const [respuestas, setRespuestas] = useState({});
  const [enviado, setEnviado] = useState(false);

  const totalPreguntas = preguntas.length;
  const respondidas = Object.keys(respuestas).length;
  const todasRespondidas = respondidas === totalPreguntas;

  const handleSeleccionar = (pIdx, oIdx) => {
    if (enviado) return;
    setRespuestas(prev => ({ ...prev, [pIdx]: oIdx }));
  };

  const calcularPuntaje = () => {
    let correctas = 0;
    preguntas.forEach((p, i) => {
      if (respuestas[i] === p.correcta) correctas++;
    });
    return Math.round((correctas / totalPreguntas) * 100);
  };

  const handleEnviar = () => {
    if (!todasRespondidas || enviado) return;
    setEnviado(true);
    const puntaje = calcularPuntaje();
    if (onCompletar) onCompletar(puntaje);
  };

  const handleReintentar = () => {
    setRespuestas({});
    setEnviado(false);
  };

  if (totalPreguntas === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Este reto no tiene preguntas configuradas.
      </div>
    );
  }

  const puntaje = enviado ? calcularPuntaje() : 0;

  return (
    <div className="space-y-6">
      {!enviado && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-900">
            Respondidas: {respondidas}/{totalPreguntas}
          </span>
          <div className="flex-1 mx-3 bg-blue-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(respondidas / totalPreguntas) * 100}%` }}
            />
          </div>
        </div>
      )}

      {preguntas.map((p, pIdx) => {
        const seleccion = respuestas[pIdx];
        const correcta = p.correcta;

        return (
          <div key={pIdx} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                {pIdx + 1}
              </span>
              <p className="font-bold text-sm text-gray-900 flex-1 pt-0.5">{p.texto}</p>
            </div>

            <div className="space-y-2 ml-9">
              {p.opciones.map((op, oIdx) => {
                const esSeleccionada = seleccion === oIdx;
                const esCorrecta = oIdx === correcta;

                let estilo = 'border-gray-200 bg-white hover:border-teal-300';
                if (enviado) {
                  if (esCorrecta) estilo = 'border-green-400 bg-green-50';
                  else if (esSeleccionada && !esCorrecta) estilo = 'border-red-400 bg-red-50';
                  else estilo = 'border-gray-200 bg-gray-50 opacity-60';
                } else if (esSeleccionada) {
                  estilo = 'border-teal-500 bg-teal-50';
                }

                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSeleccionar(pIdx, oIdx)}
                    disabled={enviado}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${estilo} ${!enviado ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      esSeleccionada && !enviado ? 'border-teal-500 bg-teal-500' :
                      enviado && esCorrecta ? 'border-green-500 bg-green-500' :
                      enviado && esSeleccionada && !esCorrecta ? 'border-red-500 bg-red-500' :
                      'border-gray-300'
                    }`}>
                      {esSeleccionada && !enviado && <Check size={14} className="text-white" />}
                      {enviado && esCorrecta && <Check size={14} className="text-white" />}
                      {enviado && esSeleccionada && !esCorrecta && <X size={14} className="text-white" />}
                    </div>
                    <span className="text-sm text-gray-800 flex-1">{op}</span>
                  </button>
                );
              })}
            </div>

            {enviado && p.explicacion && (
              <div className={`ml-9 mt-3 p-3 rounded-xl border ${seleccion === correcta ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-2">
                  {seleccion === correcta
                    ? <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    : <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />}
                  <p className={`text-xs leading-relaxed ${seleccion === correcta ? 'text-green-800' : 'text-amber-800'}`}>
                    {p.explicacion}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {enviado && (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-6 text-center">
          <p className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">Puntaje</p>
          <p className="text-5xl font-black text-teal-700 mb-2">{puntaje}%</p>
          <p className="text-sm text-teal-800">
            {puntaje === 100 ? '¡Perfecto!' : puntaje >= 60 ? '¡Buen trabajo!' : 'Puedes reintentar cuando quieras.'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {!enviado && (
          <button
            type="button"
            onClick={handleEnviar}
            disabled={!todasRespondidas}
            className={`w-full py-3 rounded-xl font-bold transition-all ${
              todasRespondidas
                ? 'bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {todasRespondidas ? 'Ver resultado' : `Responde ${totalPreguntas - respondidas} pregunta${totalPreguntas - respondidas !== 1 ? 's' : ''} más`}
          </button>
        )}

        {enviado && (
          <button
            type="button"
            onClick={handleReintentar}
            className="w-full py-3 rounded-xl font-bold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
