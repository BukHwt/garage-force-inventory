import React from 'react';
import { useAuth } from '../../context/AuthContext';

export function Header() {
  const { user, logout, tenant } = useAuth();

  const franchiseLabel =
    tenant === 'adam' ? 'Demo Franchise South' : 'Demo Franchise North';

  return (
    <header className="bg-dark-card text-dark-text-primary p-4 shadow-lg sticky top-0 z-10 border-b-2 border-gf-green">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-heading font-bold tracking-tight">Garage Force Inventory</h1>
          <p className="text-sm font-body text-dark-text-secondary">{franchiseLabel}</p>
        </div>
        {user && (
          <div className="text-right">
            <p className="text-sm font-heading text-gf-green-200">
              Signed in as {user.name}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-dark-text-secondary uppercase">
                {user.role === 'VIEWER' ? 'View Only' : user.role}
              </span>
              <button
                onClick={logout}
                className="text-xs text-dark-text-muted hover:text-gf-green focus:outline-none underline"
              >
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
