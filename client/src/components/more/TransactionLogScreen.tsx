import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '../layout/Header';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { fetchTransactions, rollbackTransaction } from '../../api/services/transactions';
import { ApiError } from '../../api/client';
import { InventoryTransactionRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';

const TRANSACTION_TYPE_COPY: Record<string, { label: string; color: string }> = {
  RECEIPT: { label: 'Receipt', color: 'text-gf-green' },
  CONSUMPTION: { label: 'Usage', color: 'text-amber-300' },
  TRANSFER: { label: 'Transfer', color: 'text-sky-300' },
  ADJUSTMENT: { label: 'Adjustment', color: 'text-indigo-300' },
};

export function TransactionLogScreen() {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';
  const [transactions, setTransactions] = useState<InventoryTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransactions(200);
      setTransactions(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to load transactions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRollback = useCallback(
    async (transactionId: string) => {
      if (isViewer) {
        return;
      }

      const target = transactions.find((tx) => tx.id === transactionId);
      if (!target || target.isReverted || !target.rollbackEligible) {
        return;
      }

      setSubmittingId(transactionId);
      setActionError(null);
      try {
        const updated = await rollbackTransaction(transactionId);
        setTransactions((prev) =>
          prev.map((tx) => (tx.id === updated.id ? updated : tx)),
        );
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Unable to roll back transaction';
        setActionError(message);
      } finally {
        setSubmittingId(null);
      }
    },
    [isViewer, transactions],
  );

  const renderLocationSummary = useCallback((transaction: InventoryTransactionRecord) => {
    const fromLocation = transaction.fromLocation?.name;
    const toLocation = transaction.toLocation?.name;

    switch (transaction.transactionType) {
      case 'RECEIPT':
        return `Received at ${toLocation ?? 'Unknown location'}`;
      case 'CONSUMPTION':
        return `Used from ${fromLocation ?? 'Unknown location'}`;
      case 'TRANSFER':
        return `${fromLocation ?? 'Unknown'} to ${toLocation ?? 'Unknown'}`;
      case 'ADJUSTMENT':
        return `Adjusted at ${fromLocation ?? 'Unknown location'}`;
      default:
        return 'Location not recorded';
    }
  }, []);

  const quantityFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }),
    [],
  );

  return (
    <>
      <Header />
      <div className="p-4 pb-28 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-heading text-2xl font-bold text-dark-text-primary">Transaction Log</h2>
            <p className="text-sm text-dark-text-secondary">
              Audit stock changes and roll back mistakes before additional edits occur.
            </p>
          </div>
          <button
            onClick={loadTransactions}
            className="btn-gf-outline px-4 py-2 text-sm"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-alert-red-bg border border-alert-red-border text-alert-red text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {actionError && (
          <div className="bg-alert-red-bg border border-alert-red-border text-alert-red text-sm rounded-lg p-3">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-dark-card border border-dashed border-dark-border rounded-xl p-6 text-center text-dark-text-secondary">
            No transactions recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const typeCopy = TRANSACTION_TYPE_COPY[transaction.transactionType] ?? {
                label: transaction.transactionType,
                color: 'text-dark-text-primary',
              };
              const unitLabel = transaction.product.unitSize || 'units';
              const quantityDisplay = quantityFormatter.format(transaction.quantity);
              const rollbackDisabled =
                isViewer ||
                transaction.isReverted ||
                submittingId === transaction.id ||
                !transaction.rollbackEligible;
              const rollbackLabel = transaction.isReverted
                ? 'Rolled Back'
                : !transaction.rollbackEligible
                  ? 'Ineligible'
                  : submittingId === transaction.id
                    ? 'Rolling back...'
                    : 'Rollback';

              return (
                <div
                  key={transaction.id}
                  className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold uppercase tracking-wide ${typeCopy.color}`}>
                        {typeCopy.label}
                      </p>
                      <p className="text-lg font-heading text-dark-text-primary">
                        {transaction.product.name}
                      </p>
                      <p className="text-sm text-dark-text-secondary">
                        {quantityDisplay} {unitLabel}
                      </p>
                    </div>
                    <div className="text-right text-xs text-dark-text-secondary">
                      <p>{new Date(transaction.createdAt).toLocaleString()}</p>
                      {transaction.performedBy && <p>By {transaction.performedBy.name}</p>}
                      {transaction.isReverted && (
                        <p className="text-alert-red font-semibold">
                          Rolled back {transaction.revertedAt ? new Date(transaction.revertedAt).toLocaleString() : ''}
                          {transaction.revertedBy ? ` by ${transaction.revertedBy.name}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-dark-text-secondary">
                    {renderLocationSummary(transaction)}
                  </div>

                  {transaction.jobReference && (
                    <div className="text-xs text-dark-text-muted">
                      Job: {transaction.jobReference}
                    </div>
                  )}

                  {transaction.notes && (
                    <div className="text-xs text-dark-text-muted">
                      Notes: {transaction.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 flex-wrap">
                    <button
                      onClick={() => handleRollback(transaction.id)}
                      disabled={rollbackDisabled}
                      className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors duration-150 ${
                        rollbackDisabled
                          ? 'border-dark-border text-dark-text-muted cursor-not-allowed opacity-60'
                          : 'border-alert-red text-alert-red hover:bg-alert-red hover:text-white'
                      }`}
                    >
                      {rollbackLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
