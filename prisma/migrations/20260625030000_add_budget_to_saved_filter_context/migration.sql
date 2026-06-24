-- Migration: Add 'budget' to SavedFilterContext enum
-- Allows saved filters to be scoped to the budgets page

ALTER TYPE "SavedFilterContext" ADD VALUE IF NOT EXISTS 'budget';
