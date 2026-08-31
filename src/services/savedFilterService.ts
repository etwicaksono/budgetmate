import { apiClient } from './api';
import type { SavedFilterContext } from '@prisma/client';

export interface SavedFilterPayload {
   selectedCategoryIds?: string[];
   selectedAccountIds?: string[];
   selectedCurrencies?: string[];
   selectedLabelIds?: string[];
   excludedLabelIds?: string[];
   sortOption?: string;
   transferOption?: string;
   debtOption?: string;
   draftOption?: string;
   recordTypeOption?: string;
}

export interface SavedFilter {
   id: string;
   name: string;
   context: string;
   filters: SavedFilterPayload;
   sort_order: number;
   created_at: string;
   updated_at: string;
}

export interface CreateSavedFilterPayload {
   name: string;
   context: SavedFilterContext;
   filters: SavedFilterPayload;
}

export interface UpdateSavedFilterPayload {
   name?: string;
   context?: SavedFilterContext;
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

   async fetchSavedFilters(context?: SavedFilterContext): Promise<SavedFilter[]> {
      const url = context ? `${this.basePath}?context=${context}` : this.basePath;
      const response = await apiClient.get<SavedFiltersResponse>(url);
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
