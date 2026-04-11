import { apiClient } from './api';

export interface SavedFilterPayload {
   selectedCategoryIds?: string[];
   selectedAccountIds?: string[];
   selectedCurrencies?: string[];
   selectedLabelIds?: string[];
   sortOption?: string;
   transferOption?: string;
   debtOption?: string;
}

export interface SavedFilter {
   id: string;
   name: string;
   filters: SavedFilterPayload;
   created_at: string;
   updated_at: string;
}

export interface CreateSavedFilterPayload {
   name: string;
   filters: SavedFilterPayload;
}

export interface UpdateSavedFilterPayload {
   name?: string;
   filters?: SavedFilterPayload;
}

interface SavedFiltersResponse {
   data: SavedFilter[];
}

interface SavedFilterResponse {
   data: SavedFilter;
}

class SavedFilterService {
   private readonly basePath = '/saved-filters';

   async fetchSavedFilters(): Promise<SavedFilter[]> {
      const response = await apiClient.get<SavedFiltersResponse>(this.basePath);
      return response.data.data;
   }

   async createSavedFilter(payload: CreateSavedFilterPayload): Promise<SavedFilter> {
      const response = await apiClient.post<SavedFilterResponse>(this.basePath, payload);
      return response.data.data;
   }

   async updateSavedFilter(id: string, payload: UpdateSavedFilterPayload): Promise<SavedFilter> {
      const response = await apiClient.put<SavedFilterResponse>(`${this.basePath}/${id}`, payload);
      return response.data.data;
   }

   async deleteSavedFilter(id: string): Promise<void> {
      await apiClient.delete(`${this.basePath}/${id}`);
   }

   async reorderSavedFilters(filterIds: string[]): Promise<void> {
      await apiClient.put(`${this.basePath}/reorder`, { filterIds });
   }
}

export const savedFilterService = new SavedFilterService();
