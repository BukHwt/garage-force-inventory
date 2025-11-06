import React from 'react';

export function Header() {
  return (
    <header className="bg-dark-card text-dark-text-primary p-4 shadow-lg sticky top-0 z-10 border-b-2 border-gf-green">
      <h1 className="text-xl font-heading font-bold tracking-tight">Inventory Manager</h1>
      <p className="text-sm font-body text-dark-text-secondary">Garage Force / SD Concrete Coating</p>
    </header>
  );
}
