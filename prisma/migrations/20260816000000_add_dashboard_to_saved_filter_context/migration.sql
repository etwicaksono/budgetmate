-- Migration: Add 'dashboard' to SavedFilterContext enum
-- Allows saved filters to be scoped to the dashboard page

ALTER TYPE "SavedFilterContext" ADD VALUE IF NOT EXISTS 'dashboard';
