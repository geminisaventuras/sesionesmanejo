// @build: 2026-11-24 | id: GEOGRAFIA-HIERARQUIA | desc: Helpers puros para jerarquía estado → municipio → ciudad y ubicación de sedes.
//
// No accede a Firestore ni muta los objetos recibidos. Los IDs de catálogo son
// slugs ASCII inmutables; una vez creado un documento se conserva su `id`.

export const TIPOS_CATALOGO = Object.freeze({
  estados: { coleccion: 'estados', padre: null, campoPadre: null },
  municipios: { coleccion: 'municipios', padre: 'estados', campoPadre: 'estadoId' },
  ciudades: { coleccion: 'ciudades', padre: 'municipios', campoPadre: 'municipioId' },
});

const esLista = (valor) => (Array.isArray(valor) ? valor : []);

export function normalizarTexto(valor) {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Slug ASCII estable: "Distrito Capital" → "distrito-capital".
export function slugificar(valor) {
  return normalizarTexto(valor)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function construirIdCatalogo(nombre, existentes = []) {
  const base = slugificar(nombre);
  if (!base) throw new Error('El nombre no genera un ID válido.');

  const ids = new Set(esLista(existentes).map((item) => String(item?.id ?? item)));
  if (!ids.has(base)) return base;

  let sufijo = 2;
  while (ids.has(`${base}-${sufijo}`)) sufijo += 1;
  return `${base}-${sufijo}`;
}

export function normalizarCatalogos(catalogos = {}) {
  return {
    estados: esLista(catalogos?.estados),
    municipios: esLista(catalogos?.municipios),
    ciudades: esLista(catalogos?.ciudades),
  };
}

function buscarPorId(lista, id) {
  if (id == null || id === '') return null;
  return esLista(lista).find((item) => String(item?.id) === String(id)) || null;
}

export function obtenerPadreCatalogo(tipo, datos = {}, catalogos = {}) {
  const def = TIPOS_CATALOGO[tipo];
  const norm = normalizarCatalogos(catalogos);
  if (!def || !def.padre) return null;
  return buscarPorId(norm[def.padre], datos?.[def.campoPadre]);
}

export function hijosActivos(tipo, id, catalogos = {}) {
  const norm = normalizarCatalogos(catalogos);
  if (tipo === 'estados') {
    return norm.municipios.filter(
      (municipio) => String(municipio?.estadoId) === String(id) && municipio?.activo !== false
    );
  }
  if (tipo === 'municipios') {
    return norm.ciudades.filter(
      (ciudad) => String(ciudad?.municipioId) === String(id) && ciudad?.activo !== false
    );
  }
  return [];
}

export function validarCatalogo({ tipo, datos = {}, catalogos = {}, itemActual = null }) {
  const def = TIPOS_CATALOGO[tipo];
  if (!def) return { ok: false, errores: ['Tipo de catálogo inválido.'] };

  const norm = normalizarCatalogos(catalogos);
  const errores = [];
  const nombre = String(datos?.nombre ?? '').trim();
  if (!nombre) errores.push('El nombre es obligatorio.');

  const idActual = itemActual?.id ?? datos?.id;
  const nombreNormalizado = normalizarTexto(nombre);
  if (nombre) {
    // Unicidad por hermanos: dos "Caracas" pueden existir en municipios
    // distintos (Sucre, Chacao, Baruta, El Hatillo y Libertador), pero no dos
    // en el mismo padre. Estados (sin padre) siguen siendo únicos.
    const padreActual = def.padre ? String(datos?.[def.campoPadre] ?? '') : '';
    const duplicado = norm[tipo].some(
      (item) => {
        if (String(item?.id) === String(idActual ?? '')) return false;
        if (normalizarTexto(item?.nombre) !== nombreNormalizado) return false;
        if (!def.campoPadre) return true;
        return String(item?.[def.campoPadre] ?? '') === padreActual;
      }
    );
    if (duplicado) errores.push('Ya existe un registro con ese nombre en el mismo nivel.');
  }

  if (def.padre) {
    const padreId = datos?.[def.campoPadre];
    const padre = obtenerPadreCatalogo(tipo, datos, norm);
    if (padreId == null || padreId === '') errores.push('El registro padre es obligatorio.');
    else if (!padre) errores.push('El registro padre no existe.');
    else {
      if (padre.activo === false) errores.push('El registro padre está inactivo.');
      if (nombre && normalizarTexto(padre.nombre) === nombreNormalizado) {
        errores.push('El nombre no puede repetir el del registro padre.');
      }
    }
  }

  return { ok: errores.length === 0, errores };
}

export function resolverCadenaSede(sede, catalogos = {}) {
  const norm = normalizarCatalogos(catalogos);
  const ciudad = buscarPorId(norm.ciudades, sede?.ciudadId);
  const municipio = buscarPorId(norm.municipios, ciudad?.municipioId);
  const estado = buscarPorId(norm.estados, municipio?.estadoId);
  return { estado, municipio, ciudad };
}

// "Ciudad Universitaria (Caracas, Libertador, Distrito Capital)".
export function etiquetaUbicacionSede(sede, catalogos = {}) {
  if (!sede || typeof sede !== 'object') return '';

  const { estado, municipio, ciudad } = resolverCadenaSede(sede, catalogos);
  const zona = String(sede.zona ?? '').trim();
  const ubicacion = [ciudad?.nombre, municipio?.nombre, estado?.nombre]
    .filter(Boolean)
    .join(', ');

  if (zona && ubicacion) return `${zona} (${ubicacion})`;
  if (zona) return zona;
  return ubicacion;
}

export function agruparSedesPorCiudad(sedes = [], catalogos = {}) {
  const norm = normalizarCatalogos(catalogos);
  const grupos = new Map();

  for (const sede of esLista(sedes)) {
    const cadena = resolverCadenaSede(sede, norm);
    const key = cadena.ciudad?.id ? String(cadena.ciudad.id) : '__sin_ciudad__';

    if (!grupos.has(key)) {
      const etiqueta = [cadena.ciudad?.nombre, cadena.municipio?.nombre, cadena.estado?.nombre]
        .filter(Boolean)
        .join(', ');
      grupos.set(key, {
        ciudadId: cadena.ciudad?.id ? String(cadena.ciudad.id) : '',
        etiqueta: etiqueta || 'Sin ciudad',
        ciudad: cadena.ciudad,
        municipio: cadena.municipio,
        estado: cadena.estado,
        sedes: [],
      });
    }
    grupos.get(key).sedes.push(sede);
  }

  return Array.from(grupos.values()).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

// Opciones activas y ordenadas para los selects de inscripción.
// `padreId` es obligatorio para municipios/ciudades: sin padre no se listan.
export function opcionesCatalogo(tipo, catalogos = {}, padreId = '') {
  const norm = normalizarCatalogos(catalogos);
  const def = TIPOS_CATALOGO[tipo];
  if (!def) return [];

  const lista = tipo === 'estados' ? norm.estados : tipo === 'municipios' ? norm.municipios : norm.ciudades;
  return esLista(lista)
    .filter((item) => item?.activo !== false)
    .filter((item) => {
      if (!def.campoPadre) return true;
      if (padreId == null || padreId === '') return false;
      return String(item?.[def.campoPadre]) === String(padreId);
    })
    .map((item) => ({ id: String(item.id), nombre: String(item.nombre ?? '').trim() }))
    .filter((item) => item.id && item.nombre)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function buscarCatalogoPorNombre(tipo, nombre, catalogos = {}, padreId = '') {
  const objetivo = normalizarTexto(nombre);
  const def = TIPOS_CATALOGO[tipo];
  if (!objetivo || !def) return null;

  const norm = normalizarCatalogos(catalogos);
  const lista = tipo === 'estados' ? norm.estados : tipo === 'municipios' ? norm.municipios : norm.ciudades;
  return (
    esLista(lista).find(
      (item) =>
        normalizarTexto(item?.nombre) === objetivo &&
        (!def.campoPadre ||
          padreId == null ||
          padreId === '' ||
          String(item?.[def.campoPadre]) === String(padreId))
    ) || null
  );
}

// Resuelve la dirección de la inscripción. Los IDs mandan; si el registro es
// legacy (solo nombres de texto) reconstruye la cadena por nombre normalizado
// sin mezclar jerarquías distintas. Nunca inventa datos: devuelve '' si no hay
// coincidencia y el formulario debe pedir la selección.
export function resolverUbicacionInscripcion(datos = {}, catalogos = {}) {
  const norm = normalizarCatalogos(catalogos);

  let estado = buscarPorId(norm.estados, datos.estadoId);
  if (!estado && datos.estado) estado = buscarCatalogoPorNombre('estados', datos.estado, norm);

  let municipio = estado ? buscarPorId(norm.municipios, datos.municipioId) : null;
  if (municipio && String(municipio.estadoId) !== String(estado.id)) municipio = null;
  if (!municipio && estado && datos.municipio) {
    municipio = buscarCatalogoPorNombre('municipios', datos.municipio, norm, estado.id);
  }

  let ciudad = municipio ? buscarPorId(norm.ciudades, datos.ciudadId) : null;
  if (ciudad && String(ciudad.municipioId) !== String(municipio.id)) ciudad = null;
  if (!ciudad && municipio && datos.ciudad) {
    ciudad = buscarCatalogoPorNombre('ciudades', datos.ciudad, norm, municipio.id);
  }

  return {
    estadoId: estado?.id ? String(estado.id) : '',
    estado: String(estado?.nombre ?? datos.estado ?? '').trim(),
    municipioId: municipio?.id ? String(municipio.id) : '',
    municipio: String(municipio?.nombre ?? datos.municipio ?? '').trim(),
    ciudadId: ciudad?.id ? String(ciudad.id) : '',
    ciudad: String(ciudad?.nombre ?? datos.ciudad ?? '').trim(),
    zona: String(datos.zona ?? '').trim(),
  };
}

export function validarCoordenadas(valor) {
  if (valor == null || valor === '') return { ok: true, coordenadas: null };
  if (typeof valor !== 'object') {
    return { ok: false, error: 'Las coordenadas deben ser un objeto {lat, lng}.' };
  }

  const latVacia = valor.lat === '' || valor.lat == null;
  const lngVacia = valor.lng === '' || valor.lng == null;
  if (latVacia && lngVacia) return { ok: true, coordenadas: null };
  if (latVacia || lngVacia) {
    return { ok: false, error: 'Latitud y longitud deben completarse juntas.' };
  }

  const lat = Number(valor.lat);
  const lng = Number(valor.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'Latitud y longitud deben ser numéricas.' };
  }
  if (lat < -90 || lat > 90) return { ok: false, error: 'La latitud debe estar entre -90 y 90.' };
  if (lng < -180 || lng > 180) return { ok: false, error: 'La longitud debe estar entre -180 y 180.' };

  return { ok: true, coordenadas: { lat, lng } };
}

// Enlace de mapa para la sede. Prioriza coordenadas válidas; si no hay,
// arma búsqueda textual con dirección, zona, ciudad y estado. Nunca expone
// números de lat/lng como texto: solo viajan dentro de la URL.
export function urlMapaSede(sede, catalogos = {}) {
  if (!sede || typeof sede !== 'object') return '';

  const coordenadas = validarCoordenadas(sede.coordenadas);
  if (coordenadas.ok && coordenadas.coordenadas) {
    const { lat, lng } = coordenadas.coordenadas;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const { estado, ciudad } = resolverCadenaSede(sede, catalogos);
  const partes = [
    sede.direccion,
    sede.zona,
    ciudad?.nombre ?? sede.ciudad,
    estado?.nombre ?? sede.estado,
  ]
    .map((valor) => String(valor == null ? '' : valor).trim())
    .filter(Boolean);

  if (partes.length === 0) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(', '))}`;
}

export function requiereZona(sede, sedes = []) {
  const ciudadId = sede?.ciudadId;
  if (ciudadId == null || ciudadId === '') return false;

  return esLista(sedes).some(
    (otra) =>
      String(otra?.ciudadId) === String(ciudadId) &&
      String(otra?.id ?? '') !== String(sede?.id ?? '')
  );
}

export function validarSedeGeografia({ sede, sedes = [], catalogos = {} }) {
  const errores = [];

  if (!String(sede?.nombre ?? '').trim()) errores.push('El nombre de la sede es obligatorio.');
  if (!String(sede?.direccion ?? '').trim()) errores.push('La dirección es obligatoria.');
  if (String(sede?.ciudadId ?? '').trim() === '') {
    errores.push('La ciudad es obligatoria.');
  } else {
    const { estado, municipio, ciudad } = resolverCadenaSede(sede, catalogos);
    if (!ciudad) errores.push('La ciudad seleccionada no existe.');
    else if (!municipio) errores.push('La ciudad no tiene municipio válido.');
    else if (!estado) errores.push('El municipio no tiene estado válido.');
    else if (ciudad.activo === false || municipio.activo === false || estado.activo === false) {
      errores.push('La jerarquía seleccionada está inactiva.');
    }
  }

  if (requiereZona(sede, sedes) && !String(sede?.zona ?? '').trim()) {
    errores.push('La zona es obligatoria porque la ciudad ya tiene otra sede.');
  }

  const coordenadas = validarCoordenadas(sede?.coordenadas);
  if (!coordenadas.ok) errores.push(coordenadas.error);

  return { ok: errores.length === 0, errores };
}

// Distancia aproximada (haversine) en km entre dos pares {lat,lng}.
// Devuelve null si algún par no es válido: el llamador decide el fallback.
export function distanciaKmEntreCoordenadas(a, b) {
  const ca = validarCoordenadas(a);
  const cb = validarCoordenadas(b);
  if (!ca.ok || !cb.ok || !ca.coordenadas || !cb.coordenadas) return null;

  const rad = (v) => (v * Math.PI) / 180;
  const dLat = rad(cb.coordenadas.lat - ca.coordenadas.lat);
  const dLng = rad(cb.coordenadas.lng - ca.coordenadas.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(ca.coordenadas.lat)) * Math.cos(rad(cb.coordenadas.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, h)));
}

// Identidad de ciudad para búsquedas: un grupo explícito permite que Caracas
// (Sucre/Chacao/Baruta/El Hatillo y Libertador) sea la misma ciudad aunque
// cuelgue de estados distintos. Sin grupo, la ciudad es su propio grupo.
export function grupoCiudadId(ciudad) {
  const grupo = String(ciudad?.grupoCiudad ?? '').trim();
  return grupo || String(ciudad?.id ?? '');
}

// Filtra las sedes (ya restringidas por curso/activo) por la ubicación del paso 1.
// Base: grupo de ciudad -> ciudad -> municipio -> estado -> todas. Nunca devuelve
// una lista vacía si recibió sedes: ocultar una sede vendible por falta de datos
// rompe la venta. Las sedes legacy sin jerarquía se conservan. `incluirCercanas`
// agrega sedes de cualquier estado a <= radioKm usando como origen el centro de la
// ciudad elegida (o una sede del resultado si la ciudad no tiene coordenadas).
// `cercanasDisponibles` se calcula siempre para que la UI pueda avisar cuántas hay.
export function filtrarSedesPorUbicacion(sedes = [], opciones = {}) {
  const lista = esLista(sedes) ? sedes.filter(Boolean) : [];
  const {
    ciudadId = '',
    estadoId = '',
    catalogos = {},
    incluirCercanas = false,
    radioKm = 50,
  } = opciones;
  const norm = normalizarCatalogos(catalogos);
  const ciudad = (norm.ciudades || []).find(c => String(c.id) === String(ciudadId)) || null;
  const estado = (norm.estados || []).find(e => String(e.id) === String(estadoId)) || null;
  const municipio = ciudad
    ? (norm.municipios || []).find(m => String(m.id) === String(ciudad.municipioId)) || null
    : null;

  const conCadena = lista.map(sede => ({ sede, cadena: resolverCadenaSede(sede, norm) }));
  const grupoSel = ciudad ? grupoCiudadId(ciudad) : '';
  const deCiudad = ciudadId
    ? conCadena.filter(x => x.cadena.ciudad && String(x.cadena.ciudad.id) === String(ciudadId))
    : [];
  const deGrupo = grupoSel
    ? conCadena.filter(x => x.cadena.ciudad && grupoCiudadId(x.cadena.ciudad) === grupoSel)
    : [];
  const deMunicipio = municipio
    ? conCadena.filter(x => x.cadena.municipio && String(x.cadena.municipio.id) === String(municipio.id))
    : [];
  const deEstado = estadoId
    ? conCadena.filter(x => x.cadena.estado && String(x.cadena.estado.id) === String(estadoId))
    : [];
  const sinUbicacion = conCadena.filter(x => !x.cadena.ciudad && !x.cadena.estado);

  const ciudadesDelGrupo = grupoSel
    ? (norm.ciudades || []).filter(c => grupoCiudadId(c) === grupoSel)
    : [];
  const estadosDelGrupo = new Set(
    ciudadesDelGrupo
      .map(c => (norm.municipios || []).find(m => String(m.id) === String(c.municipioId))?.estadoId)
      .filter(Boolean)
      .map(String)
  );
  const grupoCompartido = estadosDelGrupo.size > 1;

  let base = [];
  let alcance = 'sin-filtro';
  let aviso = '';

  if (deGrupo.length > 0) {
    base = deGrupo;
    alcance = grupoCompartido ? 'grupo' : 'ciudad';
  } else if (deCiudad.length > 0) {
    base = deCiudad;
    alcance = 'ciudad';
  } else if (deMunicipio.length > 0) {
    base = deMunicipio;
    alcance = 'municipio';
    aviso = ciudad
      ? `No hay sedes en ${ciudad.nombre}. Mostramos las de ${municipio?.nombre || 'tu municipio'}.`
      : 'No hay sedes en tu ciudad. Mostramos las de tu municipio.';
  } else if (deEstado.length > 0) {
    base = deEstado;
    alcance = 'estado';
    aviso = ciudad
      ? `No hay sedes en ${ciudad.nombre}${municipio ? ` ni en ${municipio.nombre}` : ''}. Mostramos las de ${estado?.nombre || 'tu estado'}.`
      : 'No hay sedes en tu ciudad. Mostramos las de tu estado.';
  } else if (ciudadId || estadoId) {
    base = conCadena.slice();
    alcance = 'todas';
    aviso = 'No hay sedes en tu ciudad, municipio ni estado. Mostramos todas las disponibles.';
  }

  if (alcance !== 'todas' && sinUbicacion.length > 0) {
    const ids = new Set(base.map(x => x.sede.id));
    base = base.concat(sinUbicacion.filter(x => !ids.has(x.sede.id)));
  }

  // Origen de cercanía: centro de la ciudad elegida (preferido) o una sede del
  // resultado. Así Los Teques/Charallave pueden ver Caracas sin depender de que
  // la sede primaria (La Villa) esté cerca del usuario.
  let origen = null;
  if (ciudad) {
    const c = validarCoordenadas(ciudad.coordenadas);
    if (c.ok && c.coordenadas) origen = c.coordenadas;
  }
  if (!origen) {
    for (const x of base) {
      const c = validarCoordenadas(x.sede.coordenadas);
      if (c.ok && c.coordenadas) { origen = c.coordenadas; break; }
    }
  }

  const idsBase = new Set(base.map(x => x.sede.id));
  const cercanas = [];
  if (origen) {
    for (const x of conCadena) {
      if (idsBase.has(x.sede.id)) continue;
      const km = distanciaKmEntreCoordenadas(origen, x.sede.coordenadas);
      if (km != null && km <= radioKm) cercanas.push({ sede: x.sede, km });
    }
    cercanas.sort((a, b) => a.km - b.km);
  }

  let cercanasAgregadas = 0;
  if (incluirCercanas) {
    if (!origen) {
      const nota = 'No hay coordenadas para calcular sedes cercanas.';
      aviso = aviso ? `${aviso} ${nota}` : nota;
    } else if (cercanas.length > 0) {
      const porId = new Map(conCadena.map(x => [String(x.sede.id), x]));
      for (const item of cercanas) {
        const x = porId.get(String(item.sede.id));
        if (x) base.push(x);
      }
      cercanasAgregadas = cercanas.length;
    }
  }

  return {
    sedes: base.map(x => x.sede),
    aviso,
    alcance,
    cercanasAgregadas,
    cercanasDisponibles: cercanas.map(x => x.sede),
  };
}
