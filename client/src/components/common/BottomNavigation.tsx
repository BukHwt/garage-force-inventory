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
    { id: 'add', icon: '📋', label: 'Manage' },
    { id: 'products', icon: '📦', label: 'Products' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  const handleClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-card border-t-2 border-gf-green shadow-lg">
      <div className="grid grid-cols-4 gap-1 p-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`flex flex-col items-center justify-center p-3 transition-colors duration-200 ${
              item.id === activeTab
                ? 'text-gf-green'
                : 'text-dark-text-muted hover:text-gf-green'
            }`}
            style={{ minHeight: '44px' }}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className={`text-xs font-body ${item.id === activeTab ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
