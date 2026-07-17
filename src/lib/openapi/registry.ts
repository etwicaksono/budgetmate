import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { APP_VERSION } from '@/lib/version';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Register the Bearer security scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter your Bearer token to authorize API requests.',
});

export function generateOpenApiDocument(): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: APP_VERSION,
      title: 'BudgetMate API v1',
      description: 'BudgetMate API for managing finances, accounts, debts, and transactions.',
    },
    servers: [
      {
        url: '/',
        description: 'Current Environment'
      }
    ],
    security: [{ bearerAuth: [] }],
  });
}
