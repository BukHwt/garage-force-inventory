import { apiGet, apiPost } from '../client';
import { InventoryTransactionRecord } from '../../types';

const BASE_PATH = '/api/transactions';

export function fetchTransactions(limit = 100) {
  const search = limit ? `?limit=${limit}` : '';
  return apiGet<InventoryTransactionRecord[]>(`${BASE_PATH}${search}`);
}

export function rollbackTransaction(transactionId: string) {
  return apiPost<InventoryTransactionRecord>(`${BASE_PATH}/${transactionId}/rollback`, {});
}
