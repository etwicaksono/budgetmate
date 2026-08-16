-- Migration: Add 'debt' to SavedFilterContext enum
-- Allows saved filters to be scoped to the debts page.
-- Kept in its own migration because Postgres cannot use a newly added enum
-- value inside the same transaction that declared it.

ALTER TYPE "SavedFilterContext" ADD VALUE IF NOT EXISTS 'debt';
