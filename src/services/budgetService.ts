import apiService from './api';
// TODO: Connect budget service to finalized API endpoints.

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: { message?: string } | null;
  errors?: Record<string, unknown> | null;
  meta?: unknown;
  status?: string;
  [key: string]: unknown;
}

export interface BudgetStatus {
  id: string;
  category: string;
  spent: number;
  total: number;
  percentage: number;
  status: 'success' | 'warning' | 'danger';
}

export interface BudgetQueryParams {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}

const isApiResponse = <T,>(value: unknown): value is ApiResponse<T> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const objectValue = value as Record<string, unknown>;
  return (
    'data' in objectValue ||
    'message' in objectValue ||
    'error' in objectValue ||
    'errors' in objectValue ||
    'success' in objectValue
  );
};

// Dummy budget data generator
const generateDummyBudgetStatus = (): BudgetStatus[] => {
  return [
    {
      id: 'budget-1',
      category: 'Food & Drinks',
      spent: 1057350,
      total: 2000000,
      percentage: 53,
      status: 'warning',
    },
    {
      id: 'budget-2',
      category: 'Shopping',
      spent: 2197050,
      total: 3000000,
      percentage: 73,
      status: 'warning',
    },
    {
      id: 'budget-3',
      category: 'Transportation',
      spent: 253000,
      total: 1000000,
      percentage: 25,
      status: 'success',
    },
    {
      id: 'budget-4',
      category: 'Entertainment',
      spent: 14245739,
      total: 15000000,
      percentage: 95,
      status: 'danger',
    },
    {
      id: 'budget-5',
      category: 'Housing',
      spent: 239990,
      total: 500000,
      percentage: 48,
      status: 'success',
    },
  ];
};

export interface BudgetService {
  fetchBudgetStatus(params?: BudgetQueryParams): Promise<BudgetStatus[]>;
}

export const budgetService: BudgetService = {
  async fetchBudgetStatus(params = {}) {
    // TODO: Replace with actual API call when backend is ready
    // const response = (await apiService.get('/budgets/status', {
    //   start_date: params.startDate ?? undefined,
    //   end_date: params.endDate ?? undefined,
    //   category_id: params.categoryId ?? undefined,
    // })) as ApiResponse<BudgetStatus[]> | BudgetStatus[];

    // For now, return dummy data with simulated network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const dummyData = generateDummyBudgetStatus();

    // Simulate API response structure
    // if (isApiResponse<BudgetStatus[]>(response)) {
    //   return response.data ?? dummyData;
    // }

    return dummyData;
  },
};

export default budgetService;
