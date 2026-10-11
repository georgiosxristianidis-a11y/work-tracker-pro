import React from 'react';
import { PlusCircle, ArrowLeftRight, Percent, Gift, Briefcase, MoreHorizontal } from 'lucide-react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';

interface ActionSidebarProps {
  onTopUp: () => void;
  onTransfer: () => void;
  onOpenAction: (actionName: string) => void;
}

export function ActionSidebar({ onTopUp, onTransfer, onOpenAction }: ActionSidebarProps) {
  const { userName, userAvatar } = useFinancialDashboardStore();
  const [activeItem, setActiveItem] = React.useState<string>('top_up');

  const menuItems = [
    { id: 'top_up', label: 'Top Up', icon: PlusCircle, action: onTopUp },
    { id: 'transfer', label: 'Transfer', icon: ArrowLeftRight, action: onTransfer },
    { id: 'taxes', label: 'Taxes', icon: Percent, action: () => onOpenAction('Taxes') },
    { id: 'gifts', label: 'Gifts', icon: Gift, action: () => onOpenAction('Gifts') },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase, action: () => onOpenAction('Portfolio') },
    { id: 'more', label: 'More', icon: MoreHorizontal, action: () => onOpenAction('More') }
  ];

  return (
    <aside className="flex flex-col items-center w-full sm:w-[94px] flex-shrink-0" aria-label="Quick Actions">
      {/* Profile Section */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative p-0.5 rounded-full bg-gradient-to-b from-slate-200 to-slate-300 shadow-[3px_3px_8px_rgba(180,195,215,0.4),_-3px_-3px_8px_rgba(255,255,255,0.9)]">
          <img
            src={userAvatar}
            alt={userName}
            className="w-12 h-12 rounded-full object-cover shadow-inner"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col items-center mt-2 leading-tight">
          <span className="text-xs font-bold text-slate-800 tracking-tight">Ruben</span>
          <span className="text-xs font-bold text-slate-800 tracking-tight">Torff</span>
        </div>
      </div>

      {/* Vertical Action Button Stack */}
      <div className="flex flex-col w-full gap-2.5">
        {menuItems.map(item => {
          const IconComponent = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveItem(item.id);
                item.action();
              }}
              className={`flex flex-col items-center justify-center w-full py-2.5 px-1 rounded-2xl transition-all duration-150 active:scale-[0.97] ${
                isActive
                  ? 'bg-white text-slate-900 shadow-[4px_4px_10px_rgba(180,195,215,0.4),_-4px_-4px_10px_rgba(255,255,255,0.95)] font-bold'
                  : 'bg-transparent text-slate-400 hover:text-slate-700 hover:bg-white/40 font-medium'
              }`}
            >
              <IconComponent 
                className={`w-[17px] h-[17px] mb-1 stroke-[1.8] ${isActive ? 'text-slate-800' : 'text-slate-400'}`} 
              />
              <span className="text-[10.5px] tracking-tight leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
