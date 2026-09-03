// @build: 2026-08-30.10-00-00 | id: EMAIL-BIENVENIDA | backup: EmailService.js.backup-20260830-100000 | desc: Servicio de envío de correo de bienvenida con PIN usando EmailJS
import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export const EmailService = {
  async enviarCorreoBienvenida({ correo, nombre, apellido, pin }) {
    if (!correo || !nombre || !apellido || !pin) {
      console.warn('[EmailService] Faltan parámetros para enviar correo');
      return { success: false, error: 'missing-params' };
    }

    try {
      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          correo,
          nombre,
          apellido,
          pin,
        },
        PUBLIC_KEY
      );

      console.log('[EmailService] Correo enviado:', response.status, response.text);
      return { success: true };
    } catch (error) {
      console.error('[EmailService] Error enviando correo:', error);
      return { success: false, error: error.message };
    }
  },
};