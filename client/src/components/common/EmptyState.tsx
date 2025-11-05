import React from 'react';

interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon = '📦' }: EmptyStateProps) {
  return (
    <div className="bg-white p-8 rounded shadow text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
