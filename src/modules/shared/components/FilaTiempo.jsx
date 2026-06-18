const formatoTiempo = (segundos) => {
  const s = Number(segundos) || 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function FilaTiempo({ diaActual, generalSegundos, pausaTotal, tiempoExtra }) {
  const items = [
    { icon: '📅', texto: `D${diaActual || 1}` },
    { icon: '⏱️', texto: formatoTiempo(generalSegundos) },
    { icon: '⏸️', texto: formatoTiempo(pausaTotal) },
    { icon: '📋', texto: tiempoExtra > 0 ? `+${tiempoExtra}min` : '+0' }
  ];

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/80">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <span>{item.icon}</span>
          <span>{item.texto}</span>
          {i < items.length - 1 && <span className="text-white/40">·</span>}
        </span>
      ))}
    </div>
  );
}
