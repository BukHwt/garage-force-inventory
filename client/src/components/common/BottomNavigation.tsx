import React from 'react';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  active?: boolean;
}

interface BottomNavigationProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export function BottomNavigation({ activeTab = 'dashboard', onTabChange }: BottomNavigationProps) {
  const navItems: NavItem[] = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', active: true },
    { id: 'add', icon: '➕', label: 'Add' },
    { id: 'products', icon: '📦', label: 'Products' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  const handleClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-lg">
      <div className="grid grid-cols-4 gap-1 p-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`flex flex-col items-center justify-center p-3 ${
              item.id === activeTab
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-blue-600'
            }`}
            style={{ minHeight: '44px' }}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className={`text-xs ${item.id === activeTab ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
