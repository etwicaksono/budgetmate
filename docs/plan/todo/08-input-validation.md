# Input Validation

## Objective
Implement comprehensive input validation using Zod to ensure data integrity and prevent security vulnerabilities.

## Implementation Prompt

```
Implement input validation across the application:

1. FORM VALIDATION
- Create Zod schemas for all forms
- Client-side validation
- Server-side validation
- Custom validation rules
- Error message formatting

2. API VALIDATION
- Validate request payloads
- Validate response data
- Type-safe API calls
- Error handling

3. FILE UPLOAD VALIDATION
- File type checking
- Size limitations
- Content validation
- Virus scanning hooks

4. SANITIZATION
- HTML input sanitization
- SQL injection prevention
- XSS prevention
- Path traversal prevention
```

## Schema Definitions

### 1. Transaction Schemas
```typescript
// schemas/transaction.schema.ts
import { z } from 'zod'

// Base transaction schema
export const TransactionBaseSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount cannot exceed 1,000,000')
    .transform(val => Math.round(val * 100) / 100), // Round to 2 decimals
  
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description too long')
    .transform(val => val.trim()),
  
  date: z.string()
    .datetime('Invalid date format')
    .refine(val => new Date(val) <= new Date(), 'Date cannot be in future'),
  
  type: z.enum(['income', 'expense', 'transfer'], {
    errorMap: () => ({ message: 'Invalid transaction type' })
  }),
})

// Create transaction schema
export const CreateTransactionSchema = TransactionBaseSchema.extend({
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid('Invalid category ID'),
  tags: z.array(z.string().max(20)).max(10).optional(),
  attachments: z.array(z.string().url()).max(5).optional(),
})

// Update transaction schema
export const UpdateTransactionSchema = CreateTransactionSchema.partial()

// Transfer transaction schema
export const TransferSchema = z.object({
  amount: z.number().positive(),
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  date: z.string().datetime(),
  description: z.string().optional(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: "Cannot transfer to same account",
  path: ['toAccountId'],
})

// Bulk operations
export const BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm deletion' })
  }),
})
```

### 2. Account Schemas
```typescript
// schemas/account.schema.ts
export const AccountSchema = z.object({
  name: z.string()
    .min(1, 'Account name is required')
    .max(50, 'Account name too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid characters in name'),
  
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'loan']),
  
  balance: z.number()
    .min(-1000000, 'Balance too low')
    .max(100000000, 'Balance too high'),
  
  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Invalid currency code'),
  
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')
    .optional(),
  
  icon: z.string()
    .max(50)
    .optional(),
  
  isActive: z.boolean().default(true),
  
  metadata: z.record(z.unknown()).optional(),
})

// Account creation with initial balance
export const CreateAccountSchema = AccountSchema.extend({
  initialBalance: z.number().default(0),
  openingDate: z.string().datetime().optional(),
})
```

### 3. User Input Schemas
```typescript
// schemas/user.schema.ts
export const EmailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .trim()

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character')

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
})

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept terms' })
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
```

### 4. Search & Filter Schemas
```typescript
// schemas/filter.schema.ts
export const DateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before end date',
})

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const SearchSchema = z.object({
  query: z.string()
    .max(100)
    .transform(val => val.trim()),
  filters: z.object({
    type: z.array(z.string()).optional(),
    category: z.array(z.string().uuid()).optional(),
    account: z.array(z.string().uuid()).optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    dateRange: DateRangeSchema.optional(),
  }).optional(),
})
```

## Form Integration

### 1. React Hook Form with Zod
```typescript
// components/forms/TransactionForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateTransactionSchema } from '@/schemas/transaction.schema'

type FormData = z.infer<typeof CreateTransactionSchema>

export function TransactionForm({ onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(CreateTransactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString(),
    },
  })

  const onSubmitForm = async (data: FormData) => {
    try {
      await onSubmit(data)
      reset()
    } catch (error) {
      // Handle error
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)}>
      <div>
        <label>Amount</label>
        <input
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && (
          <span className="error">{errors.amount.message}</span>
        )}
      </div>

      <div>
        <label>Description</label>
        <input {...register('description')} />
        {errors.description && (
          <span className="error">{errors.description.message}</span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Transaction'}
      </button>
    </form>
  )
}
```

### 2. Custom Validation Hook
```typescript
// hooks/useValidation.ts
export function useValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<z.ZodError | null>(null)

  const validate = useCallback((data: unknown): T | null => {
    try {
      const result = schema.parse(data)
      setErrors(null)
      return result
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(error)
      }
      return null
    }
  }, [schema])

  const validateField = useCallback((field: string, value: unknown) => {
    try {
      const partialSchema = schema.pick({ [field]: true })
      partialSchema.parse({ [field]: value })
      
      setErrors(prev => {
        if (!prev) return null
        const newErrors = prev.errors.filter(e => e.path[0] !== field)
        return newErrors.length ? new z.ZodError(newErrors) : null
      })
      
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => {
          const otherErrors = prev?.errors.filter(e => e.path[0] !== field) || []
          return new z.ZodError([...otherErrors, ...error.errors])
        })
      }
      return false
    }
  }, [schema])

  return {
    validate,
    validateField,
    errors: errors?.format(),
    isValid: !errors,
  }
}
```

## API Validation

### Middleware Validation
```typescript
// middleware/validation.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export function validateRequest(schema: z.ZodSchema) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json()
      const validated = schema.parse(body)
      
      // Attach validated data to request
      (req as any).validated = validated
      
      return NextResponse.next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            issues: error.format(),
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }
  }
}
```

## Sanitization

### HTML Sanitization
```typescript
// utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(dirty: string, options = {}): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
    ...options,
  })
}

export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
}
```

## Success Criteria
- [ ] All forms use Zod validation
- [ ] API endpoints validate input
- [ ] File uploads validated
- [ ] XSS prevention implemented
- [ ] Error messages user-friendly
- [ ] Type safety throughout
