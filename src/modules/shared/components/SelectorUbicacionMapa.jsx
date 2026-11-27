// @build: 2026-11-24 | id: SELECTOR-UBICACION-MAPA | desc: Mapa OSM con marcador arrastrable; nunca muestra lat/lng en el DOM.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Crosshair } from 'lucide-react';

const CENTRO_DEFECTO = [10.4806, -66.9036];

const ICONO_MARCADOR = L.divIcon({
  className: '',
  html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="#1d4ed8" stroke="#ffffff" stroke-width="2"/>
    <circle cx="16" cy="15.5" r="5.5" fill="#ffffff"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

const esNumero = (valor) => (
  valor !== '' && valor != null && String(valor).trim() !== '' && Number.isFinite(Number(valor))
);

const normalizarCentro = (centro) => {
  if (Array.isArray(centro) && centro.length >= 2 && esNumero(centro[0]) && esNumero(centro[1])) {
    const lat = Number(centro[0]);
    const lng = Number(centro[1]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return [lat, lng];
  }
  if (centro && typeof centro === 'object' && esNumero(centro.lat) && esNumero(centro.lng)) {
    const lat = Number(centro.lat);
    const lng = Number(centro.lng);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return [lat, lng];
  }
  return null;
};

const SelectorUbicacionMapa = ({
  latitud,
  longitud,
  centro,
  onChange,
  etiqueta = 'Ubicación en el mapa (opcional)',
  ayuda = 'Toca el mapa o arrastra el marcador para fijar la ubicación. Es opcional: sin mapa puedes guardar la sede con la dirección escrita.',
  altura = 260,
  ariaLabel = 'Mapa para elegir la ubicación de la sede',
  permitirBuscarDireccion = false,
  permitirGeolocalizacion = false,
  paisCodigo = 've',
  onDireccion,
  variante = 'completo',
  autoUbicar = false,
}) => {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const marcadorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const busquedaAbortRef = useRef(null);
  const autoUbicarHechoRef = useRef(false);
  const [errorTiles, setErrorTiles] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [ubicandome, setUbicandome] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState('');
  onChangeRef.current = onChange;
  const enHoja = variante === 'hoja';

  const tienePunto = esNumero(latitud) && esNumero(longitud);
  const centroNormalizado = normalizarCentro(centro);
  const centroLat = centroNormalizado?.[0] ?? null;
  const centroLng = centroNormalizado?.[1] ?? null;

  const ponerMarcador = (latlng, notificar) => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    if (!marcadorRef.current) {
      const marcador = L.marker(latlng, { draggable: true, icon: ICONO_MARCADOR }).addTo(mapa);
      marcador.on('dragend', () => {
        const punto = marcador.getLatLng();
        onChangeRef.current?.({ lat: punto.lat, lng: punto.lng });
      });
      marcadorRef.current = marcador;
    } else {
      marcadorRef.current.setLatLng(latlng);
    }

    if (notificar) onChangeRef.current?.({ lat: latlng.lat, lng: latlng.lng });
  };

  const irA = (lat, lng) => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const destino = L.latLng(lat, lng);
    ponerMarcador(destino, true);
    mapa.setView(destino, 16);
  };

  const recortarDireccion = (texto) => String(texto || '').trim().slice(0, 180);

  // Nominatim (OSM): búsqueda solo por acción del usuario, sin autocompletar,
  // para respetar la política de uso justo (1 req/s). El navegador envía el
  // Referer del sitio; no se envía ningún dato personal adicional.
  const buscarNominatim = async (q, signal) => {
    const url = 'https://nominatim.openstreetmap.org/search'
      + `?format=jsonv2&addressdetails=1&limit=5&accept-language=es`
      + `&countrycodes=${encodeURIComponent(paisCodigo || 've')}`
      + `&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    if (!res.ok) throw new Error('nominatim');
    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .map((x) => ({
        direccion: recortarDireccion(x.display_name),
        lat: Number(x.lat),
        lng: Number(x.lon),
      }))
      .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
  };

  // Respaldo cuando Nominatim no responde (bloqueo/cuota): Photon usa datos OSM,
  // expone CORS y no recibe datos personales, solo el texto buscado.
  const buscarPhoton = async (q, signal) => {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    if (!res.ok) throw new Error('photon');
    const data = await res.json();
    const items = (Array.isArray(data?.features) ? data.features : [])
      .map((f) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates || [];
        const lat = Number(coords[1]);
        const lng = Number(coords[0]);
        const partes = [...new Set([p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean))];
        return { direccion: recortarDireccion(partes.join(', ')), lat, lng, pais: p.countrycode };
      })
      .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
    const deVenezuela = items.filter((x) => String(x.pais || '').toUpperCase() === 'VE');
    return (deVenezuela.length > 0 ? deVenezuela : items).map(({ pais, ...resto }) => resto);
  };

  const buscarDireccion = async () => {
    const q = busqueda.trim();
    if (q.length < 3) {
      setErrorBusqueda('Escribe al menos 3 caracteres de la dirección.');
      return;
    }
    busquedaAbortRef.current?.abort();
    const ctrl = new AbortController();
    busquedaAbortRef.current = ctrl;
    setBuscando(true);
    setErrorBusqueda('');
    setResultados([]);
    try {
      let items = [];
      try {
        items = await buscarNominatim(q, ctrl.signal);
      } catch (e) {
        if (e.name === 'AbortError') throw e;
      }
      if (items.length === 0) {
        try {
          items = await buscarPhoton(q, ctrl.signal);
        } catch (e) {
          if (e.name === 'AbortError') throw e;
        }
      }
      setResultados(items);
      if (items.length === 0) setErrorBusqueda('Sin resultados. Prueba con la ciudad o una referencia.');
    } catch (e) {
      if (e.name !== 'AbortError') {
        setErrorBusqueda('No pudimos buscar la dirección ahora. Usa tu ubicación actual, marca el pin o intenta de nuevo.');
      }
    } finally {
      setBuscando(false);
    }
  };

  const seleccionarResultado = (r) => {
    irA(r.lat, r.lng);
    onDireccion?.({ direccion: r.direccion, lat: r.lat, lng: r.lng });
    setResultados([]);
    setErrorBusqueda('');
  };

  const usarMiUbicacion = () => {
    setErrorUbicacion('');
    if (!navigator.geolocation) {
      setErrorUbicacion('Tu navegador no permite obtener la ubicación. Escribe la dirección o marca el pin.');
      return;
    }
    if (!window.isSecureContext) {
      setErrorUbicacion('La ubicación solo funciona en conexión segura (HTTPS). Escribe la dirección o marca el pin.');
      return;
    }
    setUbicandome(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        irA(lat, lng);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`,
            { headers: { Accept: 'application/json' } }
          );
          const data = res.ok ? await res.json() : null;
          const direccion = recortarDireccion(data?.display_name || '');
          if (direccion) onDireccion?.({ direccion, lat, lng });
        } catch {
          // El pin ya quedó fijado; la dirección se puede completar a mano.
        }
        setUbicandome(false);
      },
      (err) => {
        setUbicandome(false);
        const mensajes = {
          1: 'Permiso de ubicación denegado. Puedes escribir la dirección o marcar el pin.',
          2: 'Tu ubicación no está disponible ahora. Escribe la dirección o marca el pin.',
          3: 'La ubicación tardó demasiado. Intenta de nuevo o marca el pin.',
        };
        setErrorUbicacion(mensajes[err.code] || 'No pudimos obtener tu ubicación. Marca el pin.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // En la hoja de movilidad, al abrir se intenta ubicar directo si el permiso
  // ya está concedido; con permiso pendiente se espera el toque del usuario.
  useEffect(() => {
    if (!enHoja || !autoUbicar || autoUbicarHechoRef.current) return undefined;
    if (!permitirGeolocalizacion || tienePunto) return undefined;
    autoUbicarHechoRef.current = true;
    let cancelado = false;
    const intentar = async () => {
      try {
        const permiso = await navigator.permissions?.query?.({ name: 'geolocation' });
        if (!cancelado && permiso?.state === 'granted') usarMiUbicacion();
      } catch {
        // Sin Permissions API: el mensaje queda visible para que el usuario toque.
      }
    };
    intentar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enHoja, autoUbicar, permitirGeolocalizacion, tienePunto]);

  useEffect(() => {
    if (!contenedorRef.current || mapaRef.current) return;

    const inicial = normalizarCentro([centroLat, centroLng]) || CENTRO_DEFECTO;
    const mapa = L.map(contenedorRef.current, {
      center: inicial,
      zoom: tienePunto ? 16 : 13,
      scrollWheelZoom: false,
    });

    const capa = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    });
    capa.on('tileerror', () => setErrorTiles(true));
    capa.addTo(mapa);

    mapa.on('click', (evento) => ponerMarcador(evento.latlng, true));
    mapaRef.current = mapa;

    if (tienePunto) ponerMarcador(L.latLng(Number(latitud), Number(longitud)), false);

    const timer = setTimeout(() => {
      if (mapaRef.current) mapa.invalidateSize();
    }, 0);

    return () => {
      clearTimeout(timer);
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
    // El mapa se crea una sola vez; los cambios de punto se sincronizan abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    if (tienePunto) {
      const destino = L.latLng(Number(latitud), Number(longitud));
      ponerMarcador(destino, false);
      mapa.panTo(destino);
    } else if (marcadorRef.current) {
      marcadorRef.current.remove();
      marcadorRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitud, longitud, tienePunto]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || tienePunto) return;
    const destino = normalizarCentro([centroLat, centroLng]);
    if (destino) mapa.setView(destino, 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroLat, centroLng, tienePunto]);

  const quitarUbicacion = () => {
    if (marcadorRef.current) {
      marcadorRef.current.remove();
      marcadorRef.current = null;
    }
    onChangeRef.current?.(null);
  };

  return (
    <div className={enHoja ? 'w-full space-y-2' : 'w-full'}>
      {!enHoja && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-gray-700">{etiqueta}</label>
          <button
            type="button"
            onClick={quitarUbicacion}
            disabled={!tienePunto}
            className="text-xs font-bold text-red-600 disabled:opacity-40"
          >
            Quitar ubicación
          </button>
        </div>
      )}

      {permitirGeolocalizacion && !enHoja && (
        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={ubicandome}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-800 text-xs font-black disabled:opacity-50"
        >
          <Crosshair size={16} /> {ubicandome ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}
        </button>
      )}      {permitirBuscarDireccion && (
        <div className={enHoja ? '' : 'mb-2'}>
          {enHoja ? (
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarDireccion(); } }}
                placeholder="Escribe tu dirección (calle, edificio, ciudad)"
                aria-label="Buscar dirección"
                className="min-w-0 flex-1 bg-white border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2 px-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={buscarDireccion}
                disabled={buscando || busqueda.trim().length < 3}
                aria-label="Buscar dirección"
                title="Buscar dirección"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-white disabled:opacity-40"
              >
                <Search size={16} />
              </button>
              {permitirGeolocalizacion && (
                <button
                  type="button"
                  onClick={usarMiUbicacion}
                  disabled={ubicandome}
                  aria-label="Usar mi ubicación actual"
                  title="Usar mi ubicación actual"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Crosshair size={16} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarDireccion(); } }}
                placeholder="Escribe tu dirección (calle, edificio, ciudad)"
                aria-label="Buscar dirección"
                className="flex-1 min-w-0 bg-white border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={buscarDireccion}
                disabled={buscando || busqueda.trim().length < 3}
                className="inline-flex items-center gap-1 px-3 py-2.5 min-h-[44px] rounded-xl bg-slate-900 text-white text-xs font-black disabled:opacity-40"
              >
                <Search size={15} /> {buscando ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          )}

          {resultados.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-xl bg-white divide-y divide-gray-100 overflow-hidden">
              {resultados.map((r, i) => (
                <button
                  key={`${r.lat}-${r.lng}-${i}`}
                  type="button"
                  onClick={() => seleccionarResultado(r)}
                  className="w-full text-left px-3 py-2.5 min-h-[44px] text-xs text-gray-700 hover:bg-blue-50"
                >
                  {r.direccion}
                </button>
              ))}
            </div>
          )}

          {errorBusqueda && <p className="text-[11px] font-semibold text-red-700 mt-1">{errorBusqueda}</p>}
          {!enHoja && (
            <p className="text-[11px] text-gray-500 mt-1">
              La dirección se envía al servicio de mapas solo para ubicarla.
            </p>
          )}
        </div>
      )}

      <div
        ref={contenedorRef}
        role="application"
        aria-label={ariaLabel}
        aria-describedby="ayuda-mapa-ubicacion"
        className="w-full overflow-hidden rounded-xl border border-gray-200"
        style={{ height: enHoja ? 'clamp(200px, 34dvh, 360px)' : altura }}
      />

      {enHoja ? (
        <span id="ayuda-mapa-ubicacion" className="sr-only">{ayuda}</span>
      ) : (
        <p id="ayuda-mapa-ubicacion" className="text-[11px] text-gray-500 mt-1 ml-1">
          {ayuda}
        </p>
      )}

      {permitirGeolocalizacion && !enHoja && (
        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={ubicandome}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-800 text-xs font-black disabled:opacity-50"
        >
          <Crosshair size={16} /> {ubicandome ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}
        </button>
      )}
      {errorUbicacion && <p className="text-[11px] font-semibold text-red-700 mt-1">{errorUbicacion}</p>}

      {errorTiles && (
        <p className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-2 mt-2">
          No se pudieron cargar las imágenes del mapa. Puedes continuar con la dirección escrita.
        </p>
      )}
    </div>
  );
};

export default SelectorUbicacionMapa;
