import { ApiReference } from '@scalar/nextjs-api-reference';
import '@/lib/openapi/schemas';
import { generateOpenApiDocument } from '@/lib/openapi/registry';

// Statically generate the OpenAPI spec object from Zod schemas
const spec = generateOpenApiDocument();

// Catch-all GET handler required by Scalar Next.js wrapper
export const GET = ApiReference({
  spec: {
    content: spec,
  },
  theme: 'deepSpace',
  metaData: {
    title: 'BudgetMate API Reference',
    description: 'Interactive API Documentation built purely from Zod schemas'
  },
  customCss: `
    :root {
      --scalar-color-accent: #4F46E5; 
    }
  `,
} as Parameters<typeof ApiReference>[0]);
