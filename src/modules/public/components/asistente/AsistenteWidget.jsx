import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageCircle, Send, X } from 'lucide-react';
import { preguntarAsistente } from '../../utils/asistente';
import { segmentarEnlacesAsistente } from '../../utils/enlacesAsistente';
import { crearInteresado } from '../../services/InteresadosCRMService';
import { crearConversacion, guardarMensaje, registrarTurno } from '../../services/ConversacionesIAService';
import { CONSENTIMIENTO_VERSION, normalizarInteresado, primerNombre } from '../../utils/crmHelpers';
import PasoIdentidad from './PasoIdentidad';

const CHIPS = ['Packs y precios', 'Sedes y horarios', 'Requisitos para empezar', 'Clinica de equilibrio'];
const CLAVE_IDENTIDAD = 'motoapp.chat.identidad';
const GATE_VACIO = { nombre: '', telefono: '', consentimiento: false };

function saludo(nombre) {
  const corto = primerNombre(nombre);
  return `Hola${corto ? `, ${corto}` : ''}. Soy el asistente de Motoapp. Puedo ayudarte con packs, precios, sedes, requisitos y como son las sesiones de manejo. Que quieres saber?`;
}

// Solo se guarda la referencia, nunca el telefono ni la transcripcion.
// Si el consentimiento es de una version anterior, se vuelve a pedir.
function leerIdentidad() {
  try {
    const dato = JSON.parse(window.sessionStorage.getItem(CLAVE_IDENTIDAD) || 'null');
    return dato?.interesadoId && dato.consentimientoVersion === CONSENTIMIENTO_VERSION ? dato : null;
  } catch {
    return null;
  }
}

function guardarIdentidad(dato) {
  try {
    window.sessionStorage.setItem(CLAVE_IDENTIDAD, JSON.stringify(dato));
  } catch {
    // sessionStorage bloqueado: la conversacion sigue, solo no se recuerda al reabrir.
  }
}

export default function AsistenteWidget({ pantallaCompleta = false } = {}) {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(pantallaCompleta);
  const [identidad, setIdentidad] = useState(leerIdentidad);
  const [mensajes, setMensajes] = useState(() => [{ rol: 'bot', texto: saludo(leerIdentidad()?.nombre) }]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [whatsapp, setWhatsapp] = useState(null);
  const [gate, setGate] = useState(GATE_VACIO);
  const [erroresIdentidad, setErroresIdentidad] = useState([]);
  const [guardandoIdentidad, setGuardandoIdentidad] = useState(false);
  const compositorRef = useRef(null);
  const listaRef = useRef(null);

  const cerrar = () => {
    if (pantallaCompleta) navigate('/');
    else setAbierto(false);
  };

  useEffect(() => {
    if (!abierto) return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alTeclear = (evento) => {
      if (evento.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = previo;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    if (identidad) compositorRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, identidad]);

  // El compositor crece como en WhatsApp y deja visible la ultima linea escrita.
  useEffect(() => {
    const campo = compositorRef.current;
    if (!campo) return;
    campo.style.height = 'auto';
    campo.style.height = `${Math.min(campo.scrollHeight, 132)}px`;
    campo.scrollTop = campo.scrollHeight;
  }, [texto, abierto]);

  useEffect(() => {
    if (abierto && identidad) listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, abierto, cargando, identidad]);

  const bajarAlFinal = () => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
  };

  const enviar = async (valor) => {
    const pregunta = String(valor ?? texto).trim();
    if (!pregunta || cargando || !identidad) return;
    const historial = mensajes
      .slice(1)
      .slice(-6)
      .map((mensaje) => ({ rol: mensaje.rol === 'user' ? 'usuario' : 'asistente', texto: mensaje.texto }));
    setMensajes((previos) => [...previos, { rol: 'user', texto: pregunta }]);
    setTexto('');
    setCargando(true);
    if (identidad.conversacionId) {
      guardarMensaje(identidad.conversacionId, { rol: 'usuario', texto: pregunta });
    }
    const resultado = await preguntarAsistente({ mensaje: pregunta, pagina: window.location.pathname, historial });
    const textoRespuesta = resultado.respuesta || 'No pude responder ahora. Intenta de nuevo o escribenos por WhatsApp.';
    setMensajes((previos) => [...previos, { rol: 'bot', texto: textoRespuesta }]);
    if (resultado.derivarWhatsapp && resultado.whatsappUrl) setWhatsapp(resultado.whatsappUrl);
    setCargando(false);
    if (identidad.conversacionId) {
      guardarMensaje(identidad.conversacionId, {
        rol: 'asistente',
        texto: textoRespuesta,
        fuente: resultado.fuente,
        kbVersion: resultado.kbVersion,
      });
      registrarTurno(identidad.conversacionId, {
        pagina: window.location.pathname,
        derivacionWhatsapp: Boolean(resultado.derivarWhatsapp),
      });
    }
  };

  const empezar = async (evento) => {
    evento.preventDefault();
    if (guardandoIdentidad) return;
    const revision = normalizarInteresado({
      ...gate,
      canal: 'chat',
      origen: window.location.pathname,
    });
    if (!revision.ok) {
      setErroresIdentidad(revision.errores);
      return;
    }
    setErroresIdentidad([]);
    setGuardandoIdentidad(true);
    const interesado = await crearInteresado({
      ...gate,
      canal: 'chat',
      origen: window.location.pathname,
    });
    if (!interesado.ok) {
      setGuardandoIdentidad(false);
      setErroresIdentidad(interesado.errores || ['guardado']);
      return;
    }
    const conversacion = await crearConversacion({
      interesadoId: interesado.id,
      origen: window.location.pathname,
      pagina: window.location.pathname,
    });
    const nueva = {
      interesadoId: interesado.id,
      nombre: revision.datos.nombre,
      conversacionId: conversacion.ok ? conversacion.id : null,
      consentimientoVersion: CONSENTIMIENTO_VERSION,
    };
    guardarIdentidad(nueva);
    setIdentidad(nueva);
    setMensajes([{ rol: 'bot', texto: saludo(nueva.nombre) }]);
    setGate(GATE_VACIO);
    setGuardandoIdentidad(false);
  };

  const clasesPanel = pantallaCompleta
    ? 'relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white'
    : 'relative flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:mb-6 sm:mr-6 sm:h-auto sm:max-h-[70vh] sm:w-[380px] sm:rounded-3xl';

  return (
    <>
      {!pantallaCompleta && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir asistente de Motoapp"
          className="fixed right-0 top-[45%] z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-l-2xl bg-slate-900/95 text-white shadow-lg transition active:scale-95 sm:bottom-6 sm:right-4 sm:top-auto sm:h-11 sm:w-auto sm:translate-y-0 sm:rounded-full sm:px-4"
        >
          <MessageCircle size={18} />
          <span className="ml-2 hidden text-sm font-bold sm:inline">Preguntar</span>
        </button>
      )}

      {abierto && (
        <div
          className={pantallaCompleta ? 'fixed inset-0 z-50 flex flex-col bg-white' : 'fixed inset-0 z-50 flex items-end justify-center sm:items-end sm:justify-end'}
          role="presentation"
        >
          {!pantallaCompleta && (
            <div className="absolute inset-0 bg-slate-900/40 sm:hidden" onClick={cerrar} aria-hidden="true" />
          )}
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="asistente-titulo"
            className={clasesPanel}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-2">
                {pantallaCompleta && (
                  <button type="button" onClick={cerrar} aria-label="Volver al inicio" className="-ml-1 rounded-full p-2 hover:bg-white/10">
                    <ChevronLeft size={20} />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 id="asistente-titulo" className="truncate text-sm font-black">Asistente Motoapp</h2>
                  <p className="truncate text-[11px] text-slate-300">
                    {identidad ? `Hola, ${primerNombre(identidad.nombre) || 'gracias por escribir'}` : 'Cuentanos quien eres para empezar'}
                  </p>
                </div>
              </div>
              {!pantallaCompleta && (
                <button type="button" onClick={cerrar} aria-label="Cerrar asistente" className="rounded-full p-2 hover:bg-white/10">
                  <X size={18} />
                </button>
              )}
            </header>

            {!identidad ? (
              <PasoIdentidad
                nombre={gate.nombre}
                telefono={gate.telefono}
                consentimiento={gate.consentimiento}
                enviando={guardandoIdentidad}
                errores={erroresIdentidad}
                onNombre={(valor) => setGate((previo) => ({ ...previo, nombre: valor }))}
                onTelefono={(valor) => setGate((previo) => ({ ...previo, telefono: valor }))}
                onConsentimiento={(valor) => setGate((previo) => ({ ...previo, consentimiento: valor }))}
                onSubmit={empezar}
              />
            ) : (
              <>
                <div ref={listaRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4">
                  {mensajes.map((mensaje, indice) => (
                    <p
                      key={`${mensaje.rol}-${indice}`}
                      className={
                        mensaje.rol === 'user'
                          ? 'ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-slate-900 px-3 py-2 text-sm text-white'
                          : 'w-fit max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200'
                      }
                    >
                      {mensaje.rol === 'user'
                        ? mensaje.texto
                        : segmentarEnlacesAsistente(mensaje.texto).map((segmento, posicion) => (
                          segmento.tipo === 'enlace' ? (
                            <Link
                              key={`enlace-${posicion}`}
                              to={segmento.ruta}
                              onClick={cerrar}
                              className="font-bold text-sky-700 underline underline-offset-2"
                            >
                              {segmento.valor}
                            </Link>
                          ) : (
                            <Fragment key={`texto-${posicion}`}>{segmento.valor}</Fragment>
                          )
                        ))}
                    </p>
                  ))}
                  {cargando && (
                    <p className="w-fit rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                      El asistente esta escribiendo...
                    </p>
                  )}
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white">
                      Continuar por WhatsApp
                    </a>
                  )}
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
                  <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => enviar(chip)}
                        disabled={cargando}
                        className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-400 disabled:opacity-50"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={(evento) => { evento.preventDefault(); enviar(); }} className="flex items-end gap-2">
                    <textarea
                      ref={compositorRef}
                      value={texto}
                      onChange={(evento) => setTexto(evento.target.value)}
                      onFocus={bajarAlFinal}
                      rows={1}
                      maxLength={600}
                      enterKeyHint="enter"
                      placeholder="Escribe tu pregunta"
                      aria-label="Tu pregunta"
                      className="max-h-[132px] min-h-[42px] min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-slate-300 px-3 py-2.5 text-sm leading-snug outline-none focus:border-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={cargando || !texto.trim()}
                      aria-label="Enviar pregunta"
                      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition active:scale-95 disabled:opacity-40"
                    >
                      <Send size={17} />
                    </button>
                  </form>
                  <p className="mt-1.5 px-1 text-[10px] leading-snug text-slate-400">
                    Enter agrega una linea; toca el boton para enviar. Asistente virtual: confirma precios y cupos en packs o por WhatsApp.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
