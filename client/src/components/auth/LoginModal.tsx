import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function LoginModal() {
  const { availableUsers, login, isReady, refreshUsers } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!availableUsers.length) {
      refreshUsers().catch(() => {
        setError('Unable to load users');
      });
    }
  }, [availableUsers.length, refreshUsers]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUserId || !pin) {
      setError('Please select a user and enter PIN');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await login({ userId: selectedUserId, pin });
      setPin('');
    } catch (err) {
      setError('Invalid PIN. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="font-heading text-2xl text-dark-text-primary text-center">Sign In</h2>
          <p className="text-dark-text-secondary text-center text-sm">
            Select your name and enter your PIN to continue
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Team Member
            </label>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green"
              disabled={submitting}
            >
              <option value="">Select your name</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.role === 'VIEWER' ? '(View Only)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              disabled={submitting}
              maxLength={6}
              className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green"
              placeholder="Enter PIN"
            />
          </div>

          {error && (
            <div className="bg-alert-red-bg border border-alert-red-border text-alert-red text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedUserId || !pin}
            className="w-full bg-gf-green border-2 border-gf-green-600 text-white font-heading font-bold text-lg py-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
