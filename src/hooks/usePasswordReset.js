import { useCallback } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useToast } from '../modules/shared/components/ToastProvider';

export const usePasswordReset = () => {
  const { showToast } = useToast();

  const resetPassword = useCallback(async (staffEmail, staffName) => {
    if (!staffEmail) {
      showToast('Este usuario no tiene correo electrónico asignado.', 'error');
      return { success: false };
    }

    try {
      // 1. Enviar correo de restablecimiento
      await sendPasswordResetEmail(auth, staffEmail);

      // 2. Registrar auditoría
      const adminUid = auth.currentUser?.uid;
      if (adminUid) {
        const logRef = doc(db, 'audit_logs', `${Date.now()}_${adminUid}`);
        await setDoc(logRef, {
          action: 'password_reset_sent',
          adminUid,
          targetEmail: staffEmail,
          targetName: staffName || 'staff',
          timestamp: serverTimestamp(),
        });
      }

      showToast(`Correo de restablecimiento enviado a ${staffEmail}`, 'success');
      return { success: true };

    } catch (error) {
      console.error('[PasswordReset] Error:', error);

      const errorMessages = {
        'auth/user-not-found': 'No existe una cuenta con este correo electrónico.',
        'auth/invalid-email': 'El formato del correo es inválido.',
        'auth/too-many-requests': 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      };

      const message = errorMessages[error.code] || 'Error al enviar el correo.';
      showToast(message, 'error');
      return { success: false, error };
    }
  }, [showToast]);

  return { resetPassword };
};