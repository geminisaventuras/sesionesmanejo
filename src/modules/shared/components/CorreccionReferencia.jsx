// @build: 2026-10-12 | id: CORREGIR-PAGO-FASE3A | desc: Componente CorreccionReferencia extraído a shared
// Extraído de EstudiantePanel.jsx para reutilizarlo en /corregir-pago/:tipo/:id sin duplicar código.
import { memo, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../../../components/UI';

export const CorreccionReferencia = memo(({ onGuardar, enviando }) => {
  const [valor, setValor] = useState('');

  const handleChange = (e) => {
    setValor(e.target.value.replace(/\D/g, '').slice(0, 4));
  };

  const handleGuardar = () => {
    const refLimpia = valor.replace(/\D/g, '').slice(0, 4);
    onGuardar(refLimpia);
    setValor('');
  };

  const valido = valor.replace(/\D/g, '').length === 4;

  return (
    <div className="flex gap-2">
      <input
        type="tel"
        value={valor}
        onChange={handleChange}
        placeholder="Ej: 8452"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        className="flex-1 bg-white text-gray-900 placeholder:text-gray-400 border-2 border-red-200 focus:border-blue-500 rounded-xl py-2 px-3 text-sm outline-none"
      />
      <Button
        type="button"
        onClick={handleGuardar}
        variant="primary"
        className="!w-auto !py-2 !px-4 !text-xs"
        icon={Check}
        disabled={!valido || enviando}
      >
        {enviando ? 'Enviando...' : 'Enviar'}
      </Button>
    </div>
  );
});

export default CorreccionReferencia;
