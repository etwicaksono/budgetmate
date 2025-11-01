import apiService from './api';

export interface ApiResponse<T> {
  success?: boolean;
  code?: string;
  message?: string;
  data?: T;
  error?: { message?: string };
  meta?: unknown;
}

export type Usability = 'USABLE' | 'PROTECTED';

export interface ApiAccountResponse {
  id?: string;
  user_id?: string;
  personal_id?: number;
  name?: string;
  icon?: string | null;
  color?: string | null;
  active?: boolean;
  usability?: Usability | string | null;
  account_type?: string | null;
  initial_amount?: number | null;
  position?: number | null;
  group_id?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  // Allow extra fields without breaking
  [key: string]: unknown;
}

export interface CreateAccountRequest {
  personal_id: number;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  account_type: string;
  initial_amount: number;
  usability: Usability;
  group_id: string | null;
}

const isApiResponse = <T,>(value: unknown): value is ApiResponse<T> =>
  typeof value === 'object' && value !== null && ('data' in (value as Record<string, unknown>) || 'message' in (value as Record<string, unknown>) || 'error' in (value as Record<string, unknown>));

export interface OrderMapItem {
  id: string;
  personal_id: number;
}

export interface SwapOrderRequest {
  order_map: OrderMapItem[];
}

export interface AccountService {
  fetchAccounts(): Promise<ApiAccountResponse[]>;
  createAccount(payload: CreateAccountRequest): Promise<ApiAccountResponse>;
  swapAccountOrder(payload: SwapOrderRequest): Promise<void>;
  getNextPersonalId(): number;
}

// Store the next personal_id
let nextPersonalId = 1;

export const accountService: AccountService = {
  async fetchAccounts() {
    const response = (await apiService.get('/accounts')) as ApiResponse<ApiAccountResponse[]> | ApiAccountResponse[];

    let accounts: ApiAccountResponse[] = [];

    if (isApiResponse<ApiAccountResponse[]>(response) && Array.isArray(response.data)) {
      accounts = response.data ?? [];
    } else if (Array.isArray(response)) {
      accounts = response;
    }

    // Calculate the next personal_id based on the accounts retrieved
    if (accounts.length > 0) {
      const maxPersonalId = Math.max(...accounts.map(acc => acc.personal_id ?? 0));
      nextPersonalId = maxPersonalId + 1;
    } else {
      nextPersonalId = 1;
    }

    return accounts;
  },

  async createAccount(payload: CreateAccountRequest) {
    const response = (await apiService.post('/accounts', payload)) as ApiResponse<ApiAccountResponse> | ApiAccountResponse;

    if (isApiResponse<ApiAccountResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiAccountResponse;
    }

    throw new Error('Failed to create account');
  },

  async swapAccountOrder(payload: SwapOrderRequest) {
    const response = (await apiService.put('/accounts/swap-order', payload)) as ApiResponse<unknown>;

    if (!response.success && response.error) {
      throw new Error(response.error.message || 'Failed to swap account order');
    }
  },

  getNextPersonalId() {
    return nextPersonalId;
  },
};

export default accountService;