-- New role tier: viewers can read everything but not write. Must be added in
-- its own migration/transaction before it's referenced anywhere else.
ALTER TYPE public.app_role ADD VALUE 'viewer';
