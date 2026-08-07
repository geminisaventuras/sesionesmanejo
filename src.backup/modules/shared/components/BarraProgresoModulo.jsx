export default function BarraProgresoModulo({ pct, color, tiempo }) {
  return (
    <div className="px-2.5 pb-2.5">
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all duration-1000 ease-linear ${color}`} style={{ width: `${pct}%` }}></div>
      </div>
      <p className="text-[10px] text-gray-500 mt-0.5 text-right">{tiempo}</p>
    </div>
  );
}
