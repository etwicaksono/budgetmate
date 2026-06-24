import { z } from 'zod';
import { registry } from '../registry';

export const UserSettingsSchema = registry.register(
  'UserSettings',
  z.object({
    timezone: z.string().openapi({ example: 'America/New_York' }),
    date_format: z.string().openapi({ example: 'YYYY-MM-DD' }),
    number_format: z.string().openapi({ example: '1,234.56' }),
    locale: z.string().openapi({ example: 'en-US' }),
  })
);

export const UpdateUserSettingsSchema = registry.register(
  'UpdateUserSettingsRequest',
  z.object({
    timezone: z.string().optional().openapi({ example: 'Europe/London' }),
    date_format: z.string().optional().openapi({ example: 'DD/MM/YYYY' }),
    number_format: z.string().optional().openapi({ example: '1.234,56' }),
    locale: z.string().optional().openapi({ example: 'en-GB' }),
  })
);

// GET /api/v1/user/settings
registry.registerPath({
  method: 'get',
  path: '/api/v1/user/settings',
  description: 'Fetch user settings such as timezone, date format, and locale',
  summary: 'Get User Settings',
  tags: ['User'],
  responses: {
    200: {
      description: 'User settings details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: UserSettingsSchema
          })
        }
      }
    }
  }
});

// PUT /api/v1/user/settings
registry.registerPath({
  method: 'put',
  path: '/api/v1/user/settings',
  description: 'Update user settings including locale and date formats',
  summary: 'Update User Settings',
  tags: ['User'],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateUserSettingsSchema } }
    }
  },
  responses: {
    200: {
      description: 'User settings updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: UserSettingsSchema
          })
        }
      }
    }
  }
});
