import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-dark-border border-t-gf-green rounded-full animate-spin mb-4"></div>
        <div className="text-xl text-dark-text-secondary">{message}</div>
      </div>
    </div>
  );
}
