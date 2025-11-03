import apiService from './api';

export interface ApiResponse<T> {
  success?: boolean;
  code?: string;
  message?: string;
  data?: T;
  error?: { message?: string };
  meta?: unknown;
}

export interface ApiTransactionResponse {
  id?: string;
  user_id?: string;
  date?: string;
  account_id?: string;
  category_id?: string;
  amount?: number;
  type?: string;
  note?: string | null;
  position?: Record<string, unknown> | null;
  transfer_id?: string | null;
  debt_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface CreateTransactionRequest {
  user_id?: string;
  date: string;
  account_id: string;
  category_id: string;
  amount: number;
  type: string;
  note?: string | null;
  position?: Record<string, unknown> | null;
  transfer_id?: string | null;
  debt_id?: string | null;
}

export interface UpdateTransactionRequest {
  date?: string;
  account_id?: string;
  category_id?: string;
  amount?: number;
  type?: string;
  note?: string | null;
  position?: Record<string, unknown> | null;
  transfer_id?: string | null;
  debt_id?: string | null;
}

const isApiResponse = <T,>(value: unknown): value is ApiResponse<T> =>
  typeof value === 'object' &&
  value !== null &&
  ('data' in (value as Record<string, unknown>) ||
   'message' in (value as Record<string, unknown>) ||
   'error' in (value as Record<string, unknown>));

export interface TransactionService {
  fetchTransactions(): Promise<ApiTransactionResponse[]>;
  fetchTransactionById(id: string): Promise<ApiTransactionResponse>;
  createTransaction(payload: CreateTransactionRequest): Promise<ApiTransactionResponse>;
  updateTransaction(id: string, payload: UpdateTransactionRequest): Promise<ApiTransactionResponse>;
  deleteTransaction(id: string): Promise<void>;
}

export const transactionService: TransactionService = {
  async fetchTransactions() {
    const response = (await apiService.get('/transactions')) as
      ApiResponse<ApiTransactionResponse[]> | ApiTransactionResponse[];

    if (isApiResponse<ApiTransactionResponse[]>(response) && Array.isArray(response.data)) {
      return response.data ?? [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  },

  async fetchTransactionById(id: string) {
    const response = (await apiService.get(`/transactions/${id}`)) as
      ApiResponse<ApiTransactionResponse> | ApiTransactionResponse;

    if (isApiResponse<ApiTransactionResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiTransactionResponse;
    }

    throw new Error('Failed to fetch transaction');
  },

  async createTransaction(payload: CreateTransactionRequest) {
    // Log the payload to check date format
    console.log('transactionService.createTransaction payload:', payload);
    console.log('Date being sent:', payload.date);
    
    const response = (await apiService.post('/transactions', payload)) as
      ApiResponse<ApiTransactionResponse> | ApiTransactionResponse;

    if (isApiResponse<ApiTransactionResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiTransactionResponse;
    }

    throw new Error('Failed to create transaction');
  },

  async updateTransaction(id: string, payload: UpdateTransactionRequest) {
    const response = (await apiService.put(`/transactions/${id}`, payload)) as
      ApiResponse<ApiTransactionResponse> | ApiTransactionResponse;

    if (isApiResponse<ApiTransactionResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiTransactionResponse;
    }

    throw new Error('Failed to update transaction');
  },

  async deleteTransaction(id: string) {
    try {
      const response = (await apiService.delete(`/transactions/${id}`)) as ApiResponse<unknown>;

      if (response.error || (response.success === false)) {
        const errorMessage = response.error?.message || response.message || 'Failed to delete transaction';
        throw new Error(errorMessage);
      }

      return;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },
};

export default transactionService;
