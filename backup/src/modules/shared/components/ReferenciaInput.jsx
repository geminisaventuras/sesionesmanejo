// @build: 2026-06-22 | id: REFERENCIA-BLINDADO | desc: Input de referencia que nunca pierde el foco (usa ref, no estado)
import { useRef, memo, useCallback } from 'react';
import { Button } from '../../../components/UI';

const ReferenciaInput = memo(({ onGuardar }) => {
  const inputRef = useRef(null);

  const handleGuardar = useCallback(() => {
    const valor = inputRef.current?.value || '';
    if (valor.length === 4) {
      onGuardar(valor);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onGuardar]);

  return (
    <div className="flex gap-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        placeholder="0000"
        autoComplete="off"
        className="w-20 py-2 px-3 rounded-lg border-2 border-red-300 text-sm font-bold text-center bg-white outline-none focus:border-red-500"
      />
      <Button
        type="button"
        variant="dark"
        className="!py-1 !px-2 !text-[10px]"
        onClick={handleGuardar}
      >
        OK
      </Button>
    </div>
  );
});

export default ReferenciaInput;