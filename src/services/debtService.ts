import { api } from './api';
import type { DebtStatus, DebtType } from '@prisma/client';
import { Account } from './accountService';
import { Transaction } from './transactionService';

export interface Debt {
   id: string;
   user_id: string;
   date: string;
   type: DebtType;
   account_id: string;
   counterparty: string;
   description?: string;
   status: DebtStatus;
   parent_debt_id?: string;
   amount: number;
   remaining_amount: number;
   account?: Account;
   repayments: Debt[];
   transactions?: Transaction[];
   created_at: string;
   updated_at: string;
}

export interface DebtsResponse {
   data: Debt[];
   meta: {
      page: number;
      limit: number;
      total_data: number;
      total_pages: number;
   };
}

export interface CreateDebtPayload {
   date: string;
   type: DebtType;
   account_id: string;
   amount: number;
   counterparty: string;
   description?: string;
}

export interface UpdateDebtPayload {
   date?: string;
   account_id?: string;
   counterparty?: string;
   description?: string;
   status?: DebtStatus;
}

export interface CreateRepaymentPayload {
   date: string;
   account_id: string;
   amount: number;
   description?: string;
}

interface FetchDebtsFilters {
   page?: number;
   limit?: number;
   status?: string;
   type?: string;
   counterparty?: string;
   sort_by?: string;
   sort_order?: string;
}

class DebtService {
   async fetchDebts(filters?: FetchDebtsFilters): Promise<DebtsResponse> {
      const params = new URLSearchParams();

      if (filters) {
         if (filters.page) params.append('page', filters.page.toString());
         if (filters.limit) params.append('limit', filters.limit.toString());
         if (filters.status) params.append('status', filters.status);
         if (filters.type) params.append('type', filters.type);
         if (filters.counterparty) params.append('counterparty', filters.counterparty);
         if (filters.sort_by) params.append('sort_by', filters.sort_by);
         if (filters.sort_order) params.append('sort_order', filters.sort_order);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<DebtsResponse>(`/debts${queryString}`);

      return response;
   }

   async getDebtById(id: string): Promise<Debt> {
      const response = await api.get<{ data: Debt }>(`/debts/${id}`);
      return response.data;
   }

   async createDebt(data: CreateDebtPayload): Promise<Debt> {
      const response = await api.post<{ data: Debt }>('/debts', data);
      return response.data;
   }

   async updateDebt(id: string, data: UpdateDebtPayload): Promise<Debt> {
      const response = await api.put<{ data: Debt }>(`/debts/${id}`, data);
      return response.data;
   }

   async deleteDebt(id: string): Promise<void> {
      await api.delete(`/debts/${id}`);
   }

   async recordRepayment(id: string, data: CreateRepaymentPayload): Promise<Debt> {
      const response = await api.post<{ data: Debt }>(`/debts/${id}/repayments`, data);
      return response.data;
   }

   async increaseDebt(id: string, data: CreateRepaymentPayload): Promise<Debt> {
      const response = await api.post<{ data: Debt }>(`/debts/${id}/increase`, data);
      return response.data;
   }

   async updateRepayment(debtId: string, transactionId: string, data: CreateRepaymentPayload): Promise<Debt> {
      const response = await api.put<{ data: Debt }>(`/debts/${debtId}/repayments/${transactionId}`, data);
      return response.data;
   }

   async updateIncrease(debtId: string, transactionId: string, data: CreateRepaymentPayload): Promise<Debt> {
      const response = await api.put<{ data: Debt }>(`/debts/${debtId}/increase/${transactionId}`, data);
      return response.data;
   }
}

export const debtService = new DebtService();
