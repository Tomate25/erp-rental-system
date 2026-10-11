import React from 'react';

export type InventoryTabType = 'todo' | 'amarilla' | 'equipo';

interface InventoryTabsProps {
  activeTab: InventoryTabType;
  onChange: (tab: InventoryTabType) => void;
  counts?: {
    todo?: number;
    amarilla?: number;
    equipo?: number;
  };
  className?: string;
}

export const InventoryTabs: React.FC<InventoryTabsProps> = ({
  activeTab,
  onChange,
  counts,
  className = '',
}) => {
  const tabs: Array<{ id: InventoryTabType; label: string; count?: number; badgeColor?: string }> = [
    {
      id: 'todo',
      label: 'Todo el inventario',
      count: counts?.todo,
    },
    {
      id: 'amarilla',
      label: 'Maquinaria amarilla (por hora)',
      count: counts?.amarilla,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      id: 'equipo',
      label: 'Equipo y accesorios (por día)',
      count: counts?.equipo,
      badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Filtro por tipo de tarifa de inventario"
      className={`flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 ${className}`}
    >
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`inventory-tab-${tab.id}`}
            aria-selected={isSelected}
            aria-controls="inventory-tab-panel"
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              isSelected
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono border ${
                  tab.badgeColor || (isSelected ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-200 text-slate-700 border-slate-300')
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
