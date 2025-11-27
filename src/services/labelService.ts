import { apiClient } from './api';

export interface Label {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLabelPayload {
  name: string;
  color: string;
}

export interface UpdateLabelPayload {
  name?: string;
  color?: string;
}

export interface LabelsResponse {
  data: Label[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

class LabelService {
  private readonly basePath = '/labels';

  async fetchLabels(): Promise<LabelsResponse> {
    const response = await apiClient.get<LabelsResponse>(this.basePath);
    return response.data;
  }

  async getLabel(id: string): Promise<{ data: Label }> {
    const response = await apiClient.get<{ data: Label }>(`${this.basePath}/${id}`);
    return response.data;
  }

  async createLabel(payload: CreateLabelPayload): Promise<{ data: Label }> {
    const response = await apiClient.post<{ data: Label }>(this.basePath, payload);
    return response.data;
  }

  async updateLabel(id: string, payload: UpdateLabelPayload): Promise<{ data: Label }> {
    const response = await apiClient.put<{ data: Label }>(`${this.basePath}/${id}`, payload);
    return response.data;
  }

  async deleteLabel(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

export const labelService = new LabelService();
