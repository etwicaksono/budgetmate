import { z } from 'zod';
import { CategoryNature, CategoryType } from '@prisma/client';
import { registry } from '../registry';
import { CreateCategorySchema, UpdateCategorySchema } from '@/lib/validation/category';

export const CategorySchema = registry.register(
  'Category',
  z.object({
    id: z.string().openapi({ example: 'clq1234560000000000000000' }),
    name: z.string().openapi({ example: 'Groceries' }),
    type: z.union([z.nativeEnum(CategoryType), z.literal('both')]).openapi({ example: CategoryType.expense }),
    nature: z.nativeEnum(CategoryNature).openapi({ example: CategoryNature.NEED }),
    icon: z.string().openapi({ example: 'shopping-cart' }),
    color: z.string().openapi({ example: '#10B981' }),
    is_active: z.boolean().openapi({ example: true }),
    parent_id: z.string().nullable().openapi({ example: null }),
    parent: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
    children: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    transaction_count: z.number().optional().openapi({ example: 42 }),
    children_count: z.number().optional().openapi({ example: 2 }),
    created_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
    updated_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
  })
);

export const CategoryTreeSchema = registry.register(
  'CategoryTree',
  z.object({
    income: z.array(CategorySchema),
    expense: z.array(CategorySchema)
  })
);

const CreateCategoryRequest = registry.register('CreateCategoryRequest', CreateCategorySchema);
const UpdateCategoryRequest = registry.register('UpdateCategoryRequest', UpdateCategorySchema);

// GET /api/v1/categories
registry.registerPath({
  method: 'get',
  path: '/api/v1/categories',
  description: 'Fetch all categories',
  summary: 'List Categories',
  tags: ['Categories'],
  parameters: [
    { name: 'type', in: 'query', schema: { type: 'string', enum: [CategoryType.income, CategoryType.expense, 'both'] }, required: false },
    { name: 'parent_id', in: 'query', schema: { type: 'string' }, required: false },
    { name: 'is_active', in: 'query', schema: { type: 'boolean' }, required: false },
  ],
  responses: {
    200: {
      description: 'A list of categories',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(CategorySchema),
            meta: z.object({
              total: z.number(),
              income_count: z.number(),
              expense_count: z.number()
            }).optional()
          })
        }
      }
    }
  }
});

// POST /api/v1/categories
registry.registerPath({
  method: 'post',
  path: '/api/v1/categories',
  description: 'Create a new category',
  summary: 'Create Category',
  tags: ['Categories'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCategoryRequest
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Category created',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: CategorySchema,
            meta: z.object({ message: z.string() }).optional()
          }),
        },
      },
    }
  }
});

// GET /api/v1/categories/[id]
registry.registerPath({
  method: 'get',
  path: '/api/v1/categories/{id}',
  description: 'Fetch a single category',
  summary: 'Get Category',
  tags: ['Categories'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Category details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: CategorySchema
          })
        }
      }
    }
  }
});

// PUT /api/v1/categories/[id]
registry.registerPath({
  method: 'put',
  path: '/api/v1/categories/{id}',
  description: 'Update a category',
  summary: 'Update Category',
  tags: ['Categories'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  request: {
    body: {
      content: {
        'application/json': { schema: UpdateCategoryRequest }
      }
    }
  },
  responses: {
    200: {
      description: 'Category updated',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: CategorySchema })
        }
      }
    }
  }
});

// DELETE /api/v1/categories/[id]
registry.registerPath({
  method: 'delete',
  path: '/api/v1/categories/{id}',
  description: 'Delete a category',
  summary: 'Delete Category',
  tags: ['Categories'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Category deleted',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: z.null() })
        }
      }
    }
  }
});

// GET /api/v1/categories/tree
registry.registerPath({
  method: 'get',
  path: '/api/v1/categories/tree',
  description: 'Fetch categories in a tree (nested) structure',
  summary: 'List Category Tree',
  tags: ['Categories'],
  parameters: [
    { name: 'type', in: 'query', schema: { type: 'string', enum: [CategoryType.income, CategoryType.expense, 'both'] }, required: false },
    { name: 'include_counts', in: 'query', schema: { type: 'boolean' }, required: false },
    { name: 'is_active', in: 'query', schema: { type: 'boolean' }, required: false },
  ],
  responses: {
    200: {
      description: 'Nested tree of categories',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.union([
              z.array(CategorySchema), // If filter by type, returns array
              CategoryTreeSchema       // Otherwise returns { income, expense }
            ]),
            meta: z.object({
              total: z.number(),
              income_count: z.number(),
              expense_count: z.number()
            }).optional()
          })
        }
      }
    }
  }
});
