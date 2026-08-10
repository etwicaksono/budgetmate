import '@/lib/openapi/schemas';
import { generateOpenApiDocument } from '@/lib/openapi/registry';

interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  requestBody?: { content: Record<string, { schema: { $ref?: string } }> };
  responses?: Record<string, { content?: Record<string, { schema: unknown }> }>;
}

interface GeneratedDoc {
  paths: Record<string, Record<string, OperationObject | undefined>>;
  components?: { schemas?: Record<string, unknown> };
}

const doc = generateOpenApiDocument() as unknown as GeneratedDoc;
const bulkPath = doc.paths['/api/v1/transactions/bulk'];

describe('OpenAPI: PATCH /api/v1/transactions/bulk', () => {
  it('is registered without displacing the existing DELETE operation', () => {
    expect(bulkPath?.['patch']).toBeDefined();
    expect(bulkPath?.['delete']).toBeDefined();
  });

  it('is grouped under the Transactions tag with a stable summary', () => {
    expect(bulkPath?.['patch']?.tags).toContain('Transactions');
    expect(bulkPath?.['patch']?.summary).toBe('Bulk Update Transactions');
  });

  it('documents both skip rules in the description', () => {
    const description = bulkPath?.['patch']?.description ?? '';
    expect(description).toMatch(/[Tt]ransfer and debt transactions are skipped/);
    expect(description).toMatch(/does not match the selected category type/);
  });

  it('references the BulkUpdateTransactionRequest component as its request body', () => {
    const ref = bulkPath?.['patch']?.requestBody?.content['application/json']?.schema.$ref;
    expect(ref).toBe('#/components/schemas/BulkUpdateTransactionRequest');
  });

  it.each([
    'description',
    'payee',
    'payment_method',
    'payment_status',
    'category_id',
    'label_ids',
    'label_mode'
  ])('documents data.%s in the request schema', (field) => {
    const schema = doc.components?.schemas?.['BulkUpdateTransactionRequest'] as
      | { properties?: Record<string, { properties?: Record<string, unknown> }> }
      | undefined;
    expect(schema?.properties?.['data']?.properties).toHaveProperty(field);
  });

  it('documents label_mode as a replace/append enum', () => {
    const schema = doc.components?.schemas?.['BulkUpdateTransactionRequest'] as
      | { properties?: Record<string, { properties?: Record<string, { enum?: string[] }> }> }
      | undefined;
    const labelMode = schema?.properties?.['data']?.properties?.['label_mode'];
    expect(labelMode?.enum).toEqual(['replace', 'append']);
  });

  it('documents updatedCount and the detailed skipped breakdown in the response', () => {
    const schema = bulkPath?.['patch']?.responses?.['200']?.content?.['application/json']?.schema as
      | {
          properties?: {
            data?: {
              properties?: {
                updatedCount?: unknown;
                skipped?: { properties?: Record<string, unknown> };
              };
            };
          };
        }
      | undefined;
    const data = schema?.properties?.data?.properties;

    expect(data?.updatedCount).toBeDefined();
    expect(data?.skipped?.properties).toHaveProperty('transferOrDebt');
    expect(data?.skipped?.properties).toHaveProperty('categoryTypeMismatch');
  });

  it('keeps the bulk request component names distinct', () => {
    const names = Object.keys(doc.components?.schemas ?? {});
    expect(names).toContain('BulkUpdateTransactionRequest');
    expect(names).toContain('BulkDeleteTransactionRequest');
  });
});
