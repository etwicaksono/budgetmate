import { z } from 'zod';
import { registry } from '../registry';

export const CreateLabelSchema = z.object({
  name: z.string().min(1).max(50).openapi({ example: 'Urgent' }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).openapi({ example: '#ff0000' }),
});

export const UpdateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional().openapi({ example: 'Important' }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().openapi({ example: '#FFA500' }),
});

export const LabelSchema = registry.register(
  'Label',
  z.object({
    id: z.string().openapi({ example: 'clq7890120000000000000000' }),
    name: z.string().openapi({ example: 'Urgent' }),
    color: z.string().openapi({ example: '#ff0000' }),
  })
);

const CreateLabelRequest = registry.register('CreateLabelRequest', CreateLabelSchema);
const UpdateLabelRequest = registry.register('UpdateLabelRequest', UpdateLabelSchema);

// GET /api/v1/labels
registry.registerPath({
  method: 'get',
  path: '/api/v1/labels',
  description: 'Fetch all labels for the user',
  summary: 'List Labels',
  tags: ['Labels'],
  responses: {
    200: {
      description: 'A list of labels',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(LabelSchema)
          })
        }
      }
    }
  }
});

// POST /api/v1/labels
registry.registerPath({
  method: 'post',
  path: '/api/v1/labels',
  description: 'Create a new label',
  summary: 'Create Label',
  tags: ['Labels'],
  request: {
    body: {
      content: {
        'application/json': { schema: CreateLabelRequest }
      }
    }
  },
  responses: {
    201: {
      description: 'Label created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: LabelSchema
          })
        }
      }
    }
  }
});

// GET /api/v1/labels/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/labels/{id}',
  description: 'Fetch a single label',
  summary: 'Get Label',
  tags: ['Labels'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Label details',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: LabelSchema })
        }
      }
    }
  }
});

// PUT /api/v1/labels/{id}
registry.registerPath({
  method: 'put',
  path: '/api/v1/labels/{id}',
  description: 'Update a label',
  summary: 'Update Label',
  tags: ['Labels'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateLabelRequest } }
    }
  },
  responses: {
    200: {
      description: 'Label updated',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: LabelSchema }) }
      }
    }
  }
});

// DELETE /api/v1/labels/{id}
registry.registerPath({
  method: 'delete',
  path: '/api/v1/labels/{id}',
  description: 'Delete a label',
  summary: 'Delete Label',
  tags: ['Labels'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Label deleted',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) }
      }
    }
  }
});
