// @build: 2026-11-24 | id: SELECTOR-UBICACION-MAPA | desc: Mapa OSM con marcador arrastrable; nunca muestra lat/lng en el DOM.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const SelectorUbicacionMapa = ({ latitud, longitud, centro, onChange }) => {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const marcadorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [errorTiles, setErrorTiles] = useState(false);
  onChangeRef.current = onChange;

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
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold text-gray-700">Ubicación en el mapa (opcional)</label>
        <button
          type="button"
          onClick={quitarUbicacion}
          disabled={!tienePunto}
          className="text-xs font-bold text-red-600 disabled:opacity-40"
        >
          Quitar ubicación
        </button>
      </div>

      <div
        ref={contenedorRef}
        role="application"
        aria-label="Mapa para elegir la ubicación de la sede"
        aria-describedby="ayuda-mapa-sede"
        className="w-full rounded-xl overflow-hidden border border-gray-200"
        style={{ height: 260 }}
      />

      <p id="ayuda-mapa-sede" className="text-[11px] text-gray-500 mt-1 ml-1">
        Toca el mapa o arrastra el marcador para fijar la ubicación. Es opcional: sin mapa puedes guardar la sede con la dirección escrita.
      </p>

      {errorTiles && (
        <p className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-2 mt-2">
          No se pudieron cargar las imágenes del mapa. La sede se puede guardar igual con la dirección escrita.
        </p>
      )}
    </div>
  );
};

export default SelectorUbicacionMapa;
