import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../layout/Header';

const links = [
  {
    id: 'neighbor-inventory',
    title: 'Neighbor Inventory',
    description: 'View on-hand inventory from your neighboring tenant.',
    path: '/neighbor-inventory',
  },
  {
    id: 'shared-orders',
    title: 'Shared Orders',
    description: 'Build and manage a combined order list across neighboring tenants.',
    path: '/shared-orders',
  },
  {
    id: 'locations',
    title: 'Manage Locations',
    description: 'Create, edit, and remove storage locations for this tenant.',
    path: '/locations',
  },
  {
    id: 'transactions',
    title: 'Transaction Log',
    description: 'Review activity history and rollback mistakes quickly.',
    path: '/transactions',
  },
];

export function MoreScreen() {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <div className="p-4 space-y-4">
        <h2 className="font-heading text-2xl font-bold text-dark-text-primary">More Tools</h2>
        <p className="text-sm text-dark-text-secondary">
          Access additional management features and auditing utilities.
        </p>

        <div className="space-y-3">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => navigate(link.path)}
              className="w-full text-left bg-dark-card border border-dark-border rounded-xl p-4 hover:border-gf-green transition-colors duration-150"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-dark-text-primary">{link.title}</p>
                  <p className="text-sm text-dark-text-secondary">{link.description}</p>
                </div>
                <span className="text-2xl text-gf-green">{'>'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
