-- Two new role tiers: "board" mirrors admin, "other" mirrors the business team
-- (member). Enum values must be added in their own migration/transaction
-- before anything references them.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'board';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'other';
