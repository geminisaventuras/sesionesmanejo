// @build: 2026-06-18.02-00-00 | id: B15-SISTEMA | desc: Sistema de toasts universal para toda la aplicación
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold text-white ${
            toast.type === 'error' ? 'bg-red-600' : 
            toast.type === 'info' ? 'bg-blue-600' : 
            'bg-green-600'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={16} /> : 
             toast.type === 'info' ? <AlertCircle size={16} /> : 
             <Check size={16} />}
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
