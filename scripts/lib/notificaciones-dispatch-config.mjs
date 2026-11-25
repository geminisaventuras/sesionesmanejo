// Resolución de configuración del dispatcher de notificaciones.
//
// Reglas:
// - DEV por defecto (`motoescuela-dev`, `sa-dev.json`).
// - PROD (`motoescuelapp`) solo con `--prod` Y `NOTIFICACIONES_PROD_OK=true`.
// - El service account puede venir en `NOTIFICACIONES_SA_JSON` (secreto de CI)
//   o en `sa-dev.json` / `sa-prod.json` para ejecución local.
// - El `project_id` del service account debe coincidir con el proyecto pedido.

export const PROYECTO_DEV = 'motoescuela-dev';
export const PROYECTO_PROD = 'motoescuelapp';

export function esProdAutorizado(env = {}) {
  return String(env.NOTIFICACIONES_PROD_OK || '').trim().toLowerCase() === 'true';
}

export function resolverServiceAccount({ prod = false, env = {}, existeArchivo = () => false, leerArchivo = () => '' } = {}) {
  if (prod && !esProdAutorizado(env)) {
    throw new Error('Bloqueado: --prod requiere NOTIFICACIONES_PROD_OK=true (autorización explícita).');
  }

  const proyecto = prod ? PROYECTO_PROD : PROYECTO_DEV;
  const desdeEnv = String(env.NOTIFICACIONES_SA_JSON || '').trim();
  let sa;
  let origen;

  if (desdeEnv) {
    try {
      sa = JSON.parse(desdeEnv);
    } catch {
      throw new Error('NOTIFICACIONES_SA_JSON no es JSON válido.');
    }
    origen = 'env';
  } else {
    const archivo = prod ? 'sa-prod.json' : 'sa-dev.json';
    if (!existeArchivo(archivo)) throw new Error(`Falta ${archivo} (service account) o la variable NOTIFICACIONES_SA_JSON.`);
    try {
      sa = JSON.parse(leerArchivo(archivo));
    } catch {
      throw new Error(`${archivo} no es JSON válido.`);
    }
    origen = archivo;
  }

  if (!sa || typeof sa !== 'object' || Array.isArray(sa)) {
    throw new Error('Service account inválido.');
  }
  if (String(sa.project_id || '') !== proyecto) {
    throw new Error(`Bloqueado: el service account es ${sa.project_id || 'desconocido'}, no ${proyecto}.`);
  }

  return { sa, proyecto, origen, prod };
}
