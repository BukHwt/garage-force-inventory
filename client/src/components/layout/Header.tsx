import React from 'react';

export function Header() {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
      <h1 className="text-xl font-bold">Inventory Manager</h1>
      <p className="text-sm opacity-90">Garage Force / SD Concrete Coating</p>
    </header>
  );
}
