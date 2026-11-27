// @build: 2026-11-27 | id: MOVILIDAD-SOLICITUD-SHARED | desc: Bloque compartido de solicitud de movilidad (mapa, pin, distancia, tarifa y autorización) para inscripción individual y pack.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import SelectorUbicacionMapa from '../../shared/components/SelectorUbicacionMapa';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { calcularTarifaMovilidad, calcularMontoVESMovilidad, construirSnapshotMovilidad } from '../utils/movilidadPricing';
import { distanciaMovilidadKm, MOVILIDAD_AUTORIZACION_TEXTO } from '../utils/movilidadHelpers';
import { resolverTasaFXVigente } from '../utils/precioIndividual';

/**
 * FT-058 / FT-090: captura y cotización de movilidad.
 * Reutilizable por el flujo individual y por la primera sesión del pack.
 * No modifica el precio del curso: la movilidad se paga directo al prestador.
 */
export function MovilidadSolicitud({
  form,
  updateForm,
  sedes = [],
  config = null,
  esCursoDosDias = false,
  fecha2Calc = null,
  mapaRef = null,
  // El pack puede ofrecer movilidad para su primera sesión aunque la moto
  // venga incluida; el flujo individual mantiene el gate de "traigo mi moto".
  permitirSinTraeMoto = false,
  titulo = '¿Quieres que te busquemos en tu ubicación?',
  ayuda = 'Un prestador conduce tu moto hasta la sede y te devuelve al terminar. El costo se paga directo al prestador.',
  etiquetaD2 = 'Solicitar movilidad también para el segundo día',
}) {
  const movilidadCfg = useMemo(() => config?.movilidad || {}, [config]);
  const [sheetMovilidad, setSheetMovilidad] = useState(false);
  // Se activa al marcar la casilla: la hoja abre con el aviso de ubicación y,
  // si el permiso ya está concedido, intenta ubicar de inmediato.
  const [pistaUbicacion, setPistaUbicacion] = useState(false);
  const [verCondiciones, setVerCondiciones] = useState(false);
  const sheetRef = useRef(null);

  const sedeSeleccionada = useMemo(
    () => (sedes || []).find(s => String(s.id) === String(form.sedeId)) || null,
    [sedes, form.sedeId]
  );
  const distanciaMovilidad = useMemo(
    () => distanciaMovilidadKm(form.movilidadPin, sedeSeleccionada),
    [form.movilidadPin, sedeSeleccionada]
  );
  const tarifaMovilidad = useMemo(
    () => (distanciaMovilidad
      ? calcularTarifaMovilidad({ config: movilidadCfg, distanciaKm: distanciaMovilidad })
      : null),
    [distanciaMovilidad, movilidadCfg]
  );
  const tasaFXMovilidad = useMemo(() => resolverTasaFXVigente(config || {}), [config]);

  const limpiarMovilidad = useCallback(() => updateForm({
    movilidadSolicitada: false,
    movilidadD2Solicitada: false,
    movilidadPin: null,
    movilidadDireccion: '',
    movilidadDistanciaKm: null,
    movilidadMontoUSD: null,
    movilidadMontoVES: null,
    movilidadSnapshot: null,
    movilidadAutorizacion: false,
  }), [updateForm]);

  const cerrarSheet = useCallback(() => {
    setSheetMovilidad(false);
    // Al volver del mapa, deja visible la configuración (bici/moto/sede) en vez
    // de quedar al final del paso 2.
    if (typeof window === 'undefined') return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      mapaRef?.current?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
    }));
  }, [mapaRef]);
  useFocusTrap(sheetRef, cerrarSheet);

  // El scroller real del wizard es el contenedor de AppShell, no el body:
  // se bloquea mientras la hoja está abierta para que el fondo no se mueva.
  useEffect(() => {
    if (!sheetMovilidad) return undefined;
    const scroller = mapaRef?.current?.closest('.overflow-y-auto') || null;
    const overflowPrevio = scroller?.style.overflow || '';
    if (scroller) scroller.style.overflow = 'hidden';
    return () => {
      if (scroller) scroller.style.overflow = overflowPrevio;
    };
  }, [sheetMovilidad, mapaRef]);

  useEffect(() => {
    if (!sheetMovilidad) return undefined;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [sheetMovilidad]);

  useEffect(() => {
    if (permitirSinTraeMoto || form.traeMoto === 'Sí') return;
    if (!form.movilidadSolicitada && !form.movilidadPin && !form.movilidadAutorizacion) return;
    limpiarMovilidad();
  }, [permitirSinTraeMoto, form.traeMoto, form.movilidadSolicitada, form.movilidadPin, form.movilidadAutorizacion, limpiarMovilidad]);

  useEffect(() => {
    if (form.movilidadSolicitada !== true) return;
    const snapshot = tarifaMovilidad?.disponible
      ? construirSnapshotMovilidad({
          config: movilidadCfg,
          distanciaKm: distanciaMovilidad,
          tasaFX: tasaFXMovilidad,
          calculadoPor: 'cliente',
        })
      : null;
    const monto = snapshot?.montoUSD ?? null;
    const montoVES = snapshot?.montoVES ?? null;
    const distancia = distanciaMovilidad ?? null;
    if (
      form.movilidadDistanciaKm === distancia &&
      form.movilidadMontoUSD === monto &&
      form.movilidadMontoVES === montoVES &&
      form.movilidadSnapshot
    ) return;
    updateForm({
      movilidadDistanciaKm: distancia,
      movilidadMontoUSD: monto,
      movilidadMontoVES: montoVES,
      movilidadSnapshot: snapshot,
    });
  }, [
    form.movilidadSolicitada,
    form.movilidadDistanciaKm,
    form.movilidadMontoUSD,
    form.movilidadMontoVES,
    distanciaMovilidad,
    tarifaMovilidad,
    tasaFXMovilidad,
    movilidadCfg,
    form.movilidadSnapshot,
    updateForm,
  ]);

  if (!permitirSinTraeMoto && form.traeMoto !== 'Sí') return null;
  if (movilidadCfg.activo !== true) return null;

  return (
    <>
      <div ref={mapaRef} className="scroll-mt-24 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-3">
        <label className="flex items-start gap-2 text-sm font-bold text-gray-800">
          <input
            type="checkbox"
            checked={form.movilidadSolicitada === true}
            onChange={e => {
              if (e.target.checked) {
                updateForm({ movilidadSolicitada: true });
                setPistaUbicacion(true);
                setSheetMovilidad(true);
              } else {
                limpiarMovilidad();
                setPistaUbicacion(false);
                setSheetMovilidad(false);
              }
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            {titulo}
            <span className="block text-[11px] font-normal text-gray-600 mt-0.5">
              {ayuda}
            </span>
          </span>
        </label>

        {form.movilidadSolicitada === true && (
          <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 text-xs font-bold text-gray-800">
                  {form.movilidadPin ? 'Ubicación de recogida marcada' : 'Falta marcar tu ubicación'}
                </p>
                {form.movilidadDireccion && (
                  <p className="m-0 truncate text-[11px] text-gray-600">{form.movilidadDireccion}</p>
                )}
                {tarifaMovilidad?.disponible && (
                  <p className="m-0 mt-1 text-[11px] font-bold text-blue-800">
                    ${tarifaMovilidad.montoUSD.toFixed(2)} · {distanciaMovilidad.toFixed(1)} km
                  </p>
                )}
                {!form.movilidadAutorizacion && (
                  <p className="m-0 mt-1 text-[11px] font-semibold text-amber-700">
                    Falta aceptar las condiciones del traslado.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSheetMovilidad(true)}
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                {form.movilidadPin ? 'Ajustar' : 'Marcar'}
              </button>
            </div>
          </div>
        )}

        {/* FT-090: D1 y D2 son fechas distintas; el segundo día se pide aparte. */}
        {form.movilidadSolicitada === true && esCursoDosDias && fecha2Calc && (
          <label className="mt-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-white p-2 text-[11px] leading-snug text-gray-700">
            <input
              type="checkbox"
              checked={form.movilidadD2Solicitada === true}
              onChange={e => updateForm({ movilidadD2Solicitada: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              {etiquetaD2} (D2: {fecha2Calc}).
              <span className="block text-gray-500">Misma ubicación de recogida; se calcula una solicitud por día.</span>
            </span>
          </label>
        )}
      </div>

      {sheetMovilidad && form.movilidadSolicitada === true && (
        <div className="fixed inset-0 z-50 flex">
          <section
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="movilidad-sheet-titulo"
            className="relative flex h-dvh w-full flex-col bg-white"
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 pb-2 pt-[calc(10px_+_env(safe-area-inset-top))]">
              <h2 id="movilidad-sheet-titulo" className="m-0 text-base font-extrabold leading-tight text-gray-900">
                Ubicación de recogida
              </h2>
              <button
                type="button"
                onClick={cerrarSheet}
                aria-label="Cerrar mapa de movilidad"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-3 pt-2">
              {!sedeSeleccionada && (
                <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  Selecciona primero la sede para calcular la distancia.
                </p>
              )}

              <SelectorUbicacionMapa
                latitud={form.movilidadPin?.lat}
                longitud={form.movilidadPin?.lng}
                centro={sedeSeleccionada?.coordenadas}
                onChange={(pin) => updateForm({ movilidadPin: pin })}
                onDireccion={({ direccion, lat, lng }) => updateForm({
                  movilidadPin: { lat, lng },
                  movilidadDireccion: direccion || form.movilidadDireccion || '',
                })}
                etiqueta="Tu ubicación de recogida"
                ayuda="Escribe tu dirección, usa tu ubicación o toca el mapa."
                ariaLabel="Mapa para marcar tu ubicación de recogida"
                permitirBuscarDireccion
                permitirGeolocalizacion
                variante="hoja"
                autoUbicar={pistaUbicacion}
              />

              {form.movilidadPin && !sedeSeleccionada?.coordenadas && (
                <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  La sede no tiene ubicación configurada; no podemos calcular la distancia.
                </p>
              )}

              {tarifaMovilidad?.disponible && (
                <div className="rounded-xl bg-white border border-blue-200 p-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-bold text-gray-600">
                      {tarifaMovilidad.modalidad === 'plana' ? 'Tarifa plana' : 'Tarifa por km'} · {distanciaMovilidad.toFixed(1)} km
                    </span>
                    <span className="text-base font-black text-gray-900">
                      ${tarifaMovilidad.montoUSD.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-blue-800 mt-0.5">
                    Bs {calcularMontoVESMovilidad(tarifaMovilidad.montoUSD, tasaFXMovilidad).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Un solo monto por viaje ida y vuelta. Pago directo al prestador, no se suma al pago del curso.
                  </p>
                </div>
              )}

              {tarifaMovilidad && !tarifaMovilidad.disponible && (
                <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                  {tarifaMovilidad.motivo === 'fuera-cobertura'
                    ? `Tu ubicación está fuera de la cobertura (${tarifaMovilidad.kmTope} km).`
                    : 'No pudimos cotizar la movilidad para esta ubicación.'}
                </p>
              )}

              <div>
                <label className="flex items-start gap-2 text-[11px] leading-snug text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.movilidadAutorizacion === true}
                    onChange={e => updateForm({ movilidadAutorizacion: e.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Acepto las condiciones del traslado.</span>
                </label>
                <button
                  type="button"
                  onClick={() => setVerCondiciones(v => !v)}
                  className="ml-6 mt-0.5 text-[10.5px] font-bold text-blue-700 underline underline-offset-2"
                >
                  {verCondiciones ? 'Ocultar condiciones' : 'Ver condiciones'}
                </button>
                {verCondiciones && (
                  <p className="mt-1 rounded-lg bg-gray-50 px-2 py-1.5 text-[10.5px] leading-snug text-gray-600">
                    {MOVILIDAD_AUTORIZACION_TEXTO}
                  </p>
                )}
              </div>
            </div>

            <footer className="grid shrink-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2 border-t border-gray-100 px-4 pb-[calc(11px_+_env(safe-area-inset-bottom))] pt-2.5">
              <button
                type="button"
                onClick={() => {
                  limpiarMovilidad();
                  cerrarSheet();
                }}
                className="min-h-12 rounded-xl border border-gray-200 bg-white px-3 text-[12.5px] font-bold text-gray-800 hover:bg-gray-50"
              >
                Quitar solicitud
              </button>
              <button
                type="button"
                onClick={cerrarSheet}
                className="min-h-12 rounded-xl bg-blue-600 px-3 text-[12.5px] font-bold text-white hover:bg-blue-700"
              >
                Listo
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

export default MovilidadSolicitud;
