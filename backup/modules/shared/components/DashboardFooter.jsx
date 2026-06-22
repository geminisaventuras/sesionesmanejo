export default function DashboardFooter({ tabs = [], activeTab, onTabChange }) {
  return (
    <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center shadow-md">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTabChange(t.id)}
          className={`flex flex-col items-center w-20 transition-all ${activeTab === t.id ? 'text-gray-900 transform -translate-y-1' : 'text-gray-400'}`}
        >
          <div className={`p-1.5 rounded-xl ${activeTab === t.id ? 'bg-gray-100' : ''}`}>
            <t.icon size={22} className={activeTab === t.id ? 'stroke-[2.5px]' : ''} />
          </div>
          <span className="text-[10px] font-bold">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
