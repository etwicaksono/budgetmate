import { z } from 'zod';
import { SavedFilterContext } from '@prisma/client';
import { registry } from '../registry';

export const FilterContextSchema = z.nativeEnum(SavedFilterContext);
export type FilterContext = z.infer<typeof FilterContextSchema>;

export const FiltersSchema = z.object({
  selectedCategoryIds: z.array(z.string()).optional(),
  selectedAccountIds: z.array(z.string()).optional(),
  selectedCurrencies: z.array(z.string()).optional(),
  selectedLabelIds: z.array(z.string()).optional(),
  sortOption: z.string().optional(),
});

export const CreateSavedFilterSchema = z.object({
  name: z.string().min(1).max(100).openapi({ example: 'My Active Debts' }),
  context: FilterContextSchema.default(SavedFilterContext.transaction).openapi({ example: SavedFilterContext.transaction }),
  filters: FiltersSchema,
});

export const UpdateSavedFilterSchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({ example: 'My Updated Debts' }),
  context: FilterContextSchema.optional().openapi({ example: SavedFilterContext.transaction }),
  filters: FiltersSchema.optional(),
});

export const ReorderSavedFiltersSchema = z.object({
  filterIds: z.array(z.string()).openapi({ example: ['clq1234560000000000000000', 'clq1234560000000000000001'] }),
});

export const SavedFilterSchema = registry.register(
  'SavedFilter',
  z.object({
    id: z.string().openapi({ example: 'clq1234560000000000000000' }),
    name: z.string().openapi({ example: 'My Active Debts' }),
    context: FilterContextSchema.openapi({ example: SavedFilterContext.transaction }),
    filters: z.record(z.unknown()).openapi({ example: { sortOption: 'custom' } }),
    sort_order: z.number().openapi({ example: 0 }),
    created_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
    updated_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
  })
);

const CreateSavedFilterRequest = registry.register('CreateSavedFilterRequest', CreateSavedFilterSchema);
const UpdateSavedFilterRequest = registry.register('UpdateSavedFilterRequest', UpdateSavedFilterSchema);
const ReorderSavedFiltersRequest = registry.register('ReorderSavedFiltersRequest', ReorderSavedFiltersSchema);

// GET /api/v1/saved-filters
registry.registerPath({
  method: 'get',
  path: '/api/v1/saved-filters',
  description: 'Fetch all saved filters for the user',
  summary: 'List Saved Filters',
  tags: ['Saved Filters'],
  responses: {
    200: {
      description: 'A list of saved filters',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(SavedFilterSchema)
          })
        }
      }
    }
  }
});

// POST /api/v1/saved-filters
registry.registerPath({
  method: 'post',
  path: '/api/v1/saved-filters',
  description: 'Create a new saved filter',
  summary: 'Create Saved Filter',
  tags: ['Saved Filters'],
  request: {
    body: {
      content: {
        'application/json': { schema: CreateSavedFilterRequest }
      }
    }
  },
  responses: {
    201: {
      description: 'Saved filter created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: SavedFilterSchema
          })
        }
      }
    }
  }
});

// PUT /api/v1/saved-filters/reorder
registry.registerPath({
  method: 'put',
  path: '/api/v1/saved-filters/reorder',
  description: 'Reorder saved filters',
  summary: 'Reorder Saved Filters',
  tags: ['Saved Filters'],
  request: {
    body: {
      content: {
        'application/json': { schema: ReorderSavedFiltersRequest }
      }
    }
  },
  responses: {
    200: {
      description: 'Filters reordered successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({ message: z.string() })
          })
        }
      }
    }
  }
});

// PUT /api/v1/saved-filters/{id}
registry.registerPath({
  method: 'put',
  path: '/api/v1/saved-filters/{id}',
  description: 'Update a saved filter',
  summary: 'Update Saved Filter',
  tags: ['Saved Filters'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateSavedFilterRequest } }
    }
  },
  responses: {
    200: {
      description: 'Saved filter updated',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: SavedFilterSchema }) }
      }
    }
  }
});

// DELETE /api/v1/saved-filters/{id}
registry.registerPath({
  method: 'delete',
  path: '/api/v1/saved-filters/{id}',
  description: 'Delete a saved filter',
  summary: 'Delete Saved Filter',
  tags: ['Saved Filters'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Saved filter deleted',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) }
      }
    }
  }
});
