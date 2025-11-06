import React from 'react';

interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon = '📦' }: EmptyStateProps) {
  return (
    <div className="bg-dark-card p-8 rounded-lg shadow-lg border border-dark-border text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-dark-text-secondary">{message}</p>
    </div>
  );
}
