// @build: 2026-09-04 | id: ERROR-BOUNDARY-NO-RELOAD | backup: ErrorBoundary.backup-20260904-000000 | desc: Error boundary sin recarga forzada, con botón Reintentar que solo limpia estado
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-black text-gray-900 mb-2">Algo salió mal</h2>
            <p className="text-sm text-gray-500 mb-6">
              La aplicación encontró un error inesperado. Intenta continuar sin recargar la página.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
