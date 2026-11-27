// T-159 / FT-085: captcha real con Cloudflare Turnstile.
// Reglas: el site key es publico (bundle); el secret vive solo en el Worker.
// Sin site key + URL de verificacion se conserva la suma legada para no romper la inscripcion.

export function leerConfigCaptcha(env = {}) {
  const siteKey = String(env.VITE_TURNSTILE_SITE_KEY || '').trim();
  const verifyUrl = String(env.VITE_CAPTCHA_VERIFY_URL || '').trim();
  return {
    real: Boolean(siteKey && verifyUrl),
    siteKey,
    verifyUrl,
  };
}

export function normalizarTokenCaptcha(token) {
  if (typeof token !== 'string') return '';
  return token.trim().slice(0, 2048);
}

export function interpretarVerificacionCaptcha(payload) {
  if (!payload || typeof payload !== 'object') return { ok: false, motivo: 'sin_respuesta' };
  if (payload.success === true) return { ok: true, motivo: 'ok' };
  const codigos = Array.isArray(payload['error-codes'])
    ? payload['error-codes'].map((codigo) => String(codigo))
    : [];
  if (codigos.includes('timeout-or-duplicate')) return { ok: false, motivo: 'expirado' };
  if (codigos.includes('invalid-input-response')) return { ok: false, motivo: 'invalido' };
  if (codigos.includes('missing-input-response')) return { ok: false, motivo: 'invalido' };
  return { ok: false, motivo: 'rechazado' };
}

export function mensajeCaptcha(motivo) {
  switch (motivo) {
    case 'expirado':
      return 'La verificación de seguridad expiró. Intenta de nuevo.';
    case 'invalido':
      return 'La verificación de seguridad no es válida. Recarga e intenta de nuevo.';
    case 'sin_configuracion':
      return 'La verificación de seguridad no está configurada. Escríbenos por WhatsApp.';
    case 'red':
      return 'No pudimos validar la seguridad. Revisa tu conexión e intenta de nuevo.';
    default:
      return 'No pudimos validar la seguridad. Intenta de nuevo.';
  }
}

export async function verificarCaptcha(token, { verifyUrl, fetchImpl = fetch } = {}) {
  const limpio = normalizarTokenCaptcha(token);
  if (!limpio) return { ok: false, motivo: 'invalido' };
  if (!verifyUrl) return { ok: false, motivo: 'sin_configuracion' };
  try {
    const respuesta = await fetchImpl(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: limpio }),
    });
    if (!respuesta.ok) return { ok: false, motivo: 'red' };
    const datos = await respuesta.json().catch(() => null);
    return interpretarVerificacionCaptcha(datos);
  } catch {
    return { ok: false, motivo: 'red' };
  }
}
