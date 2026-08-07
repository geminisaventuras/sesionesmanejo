import { X, Mail } from 'lucide-react';

const ResetPasswordModal = ({ isOpen, staffEmail, staffName, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-black text-gray-900">Restablecer contraseña</h3>
          <button onClick={onCancel} className="p-1 bg-gray-100 rounded-full">
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-700">
            <Mail size={18} className="text-blue-500" />
            <span className="font-medium">{staffEmail}</span>
          </div>
          {staffName && <p className="text-sm text-gray-600">Usuario: <strong>{staffName}</strong></p>}
          <p className="text-sm text-gray-600">
            Se enviará un enlace para que {staffName || 'el usuario'} pueda crear una nueva contraseña.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20"
          >
            Enviar email
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;