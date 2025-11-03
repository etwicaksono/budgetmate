# API Documentation

## Objective
Create comprehensive API documentation using OpenAPI/Swagger for better developer experience and API consistency.

## Implementation Prompt

```
Set up API documentation system:

1. OPENAPI SPECIFICATION
- Create OpenAPI 3.0 spec file
- Document all endpoints
- Define request/response schemas
- Add authentication details
- Include error responses

2. SWAGGER UI INTEGRATION
- Set up Swagger UI page
- Auto-generate from spec
- Add try-it-out functionality
- Include example requests
- Add authorization testing

3. TYPE GENERATION
- Generate TypeScript types from spec
- Sync frontend types with API
- Validate against schema
- Auto-generate API clients

4. DOCUMENTATION STRUCTURE
- API overview and authentication
- Endpoint categorization
- Request/response examples
- Error code reference
- Rate limiting info
```

## Implementation Details

### 1. OpenAPI Specification
```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Finance App API
  version: 1.0.0
  description: Personal finance management API
  
servers:
  - url: http://localhost:8080/api/v1
    description: Development
  - url: https://api.finance.app/v1
    description: Production

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      
  schemas:
    Transaction:
      type: object
      required: [id, amount, type, date]
      properties:
        id:
          type: string
          format: uuid
        amount:
          type: number
          minimum: 0
        type:
          type: string
          enum: [income, expense, transfer]
        description:
          type: string
          maxLength: 500
        date:
          type: string
          format: date-time
          
paths:
  /transactions:
    get:
      summary: List transactions
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        200:
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Transaction'
```

### 2. Swagger UI Setup
```typescript
// app/api-docs/page.tsx
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocs() {
  return (
    <SwaggerUI
      url="/api/openapi.json"
      docExpansion="list"
      defaultModelsExpandDepth={2}
      tryItOutEnabled={true}
    />
  )
}
```

### 3. Type Generation
```json
// package.json
{
  "scripts": {
    "generate:api-types": "openapi-typescript openapi.yaml --output src/types/api.ts",
    "generate:api-client": "openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o src/api/generated"
  }
}
```

### 4. API Client Generation
```typescript
// src/api/client.ts
import { Configuration, TransactionsApi } from './generated'

const config = new Configuration({
  basePath: process.env.NEXT_PUBLIC_API_BASE_URL,
  accessToken: () => getAuthToken(),
})

export const api = {
  transactions: new TransactionsApi(config),
  accounts: new AccountsApi(config),
  categories: new CategoriesApi(config),
}
```

### 5. Documentation Comments
```typescript
/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *     responses:
 *       200:
 *         description: List of transactions
 *       401:
 *         description: Unauthorized
 */
```

## API Documentation Structure

### 1. Overview Page
```markdown
# Finance App API

## Base URL
Production: https://api.finance.app/v1
Development: http://localhost:8080/api/v1

## Authentication
Bearer token required for all endpoints
Token expires after 24 hours

## Rate Limiting
- 100 requests per minute per user
- 1000 requests per hour per user

## Error Codes
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Rate Limited
- 500: Server Error
```

### 2. Endpoint Documentation Template
```markdown
## GET /transactions

Retrieves paginated list of transactions

### Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 20) |
| startDate | date | No | Filter from date |
| endDate | date | No | Filter to date |

### Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Responses
- 401: Invalid or expired token
- 429: Rate limit exceeded
```

## Success Criteria
- [ ] OpenAPI spec complete
- [ ] Swagger UI accessible
- [ ] Types auto-generated
- [ ] API client generated
- [ ] All endpoints documented
- [ ] Examples provided
