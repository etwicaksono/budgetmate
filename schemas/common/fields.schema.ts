import { z } from 'zod';

// ============================================================================
// Basic Field Types (matching database constraints)
// ============================================================================

export const UuidSchema = z.string().uuid();

export const PersonalIdSchema = z.number().int().positive()
  .describe('User-specific sequential ID for ordering (BigInt in DB)');

export const PositionSchema = z.any().nullable()
  .describe('JSON field for custom drag-and-drop ordering');

// ============================================================================
// String Field Constraints (exact DB varchar lengths)
// ============================================================================

export const AccountNameSchema = z.string().min(1, 'Name cannot be empty').max(36);
export const CategoryNameSchema = z.string().min(1, 'Name cannot be empty').max(36);
export const GroupNameSchema = z.string().min(1, 'Name cannot be empty').max(64);
export const DebtNameSchema = z.string().min(1, 'Name cannot be empty').max(64);

export const IconSchema = z.string().min(1, 'Icon is required').max(36);

// Color fields have different lengths in different tables
export const AccountColorSchema = z.string().min(1, 'Color is required').max(255);
export const CategoryColorSchema = z.string().min(1, 'Color is required').max(36);

export const NoteSchema = z.string().nullable();

// ============================================================================
// Timestamp & Audit Fields
// ============================================================================

export const TimestampSchema = z.coerce.date();
export const AuditFieldSchema = z.string().max(64).nullable();

// ============================================================================
// Base Resource Schema (common to all entities)
// ============================================================================

export const BaseResourceSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  personal_id: PersonalIdSchema,
  position: PositionSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema.nullable(),
  created_by: AuditFieldSchema.optional(),
  updated_by: AuditFieldSchema.optional(),
});
