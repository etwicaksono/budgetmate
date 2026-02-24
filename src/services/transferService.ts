import { api } from './api';

export interface Transfer {
  id: string;
  date: string;
  from_account: string;
  to_account: string;
  amount: number;
  to_amount?: number;
  description?: string;
  currency: string;
  to_currency?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransferRequest {
  date: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  to_amount?: number;
  description?: string;
  currency?: string;
  to_currency?: string;
}

class TransferService {
  async fetchTransfers(filters?: {
    start_date?: string;
    end_date?: string;
    from_account?: string;
    to_account?: string;
  }): Promise<Transfer[]> {
    const response = await api.get<{ success: boolean; data: Transfer[] }>(
      '/transfers',
      { params: filters }
    );
    return response.data;
  }
  
  async createTransfer(data: CreateTransferRequest): Promise<Transfer> {
    const response = await api.post<{ success: boolean; data: Transfer }>(
      '/transfers',
      data
    );
    return response.data;
  }
  
  async updateTransfer(id: string, data: Partial<CreateTransferRequest>): Promise<Transfer> {
    const response = await api.put<{ success: boolean; data: Transfer }>(
      `/transfers/${id}`,
      data
    );
    return response.data;
  }
  
  async deleteTransfer(id: string): Promise<void> {
    await api.delete(`/transfers/${id}`);
  }
}

export const transferService = new TransferService();
