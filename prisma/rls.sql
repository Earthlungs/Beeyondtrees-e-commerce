-- Enable Row Level Security on every application table.
--
-- We ENABLE (not FORCE) RLS and add no policies: the app connects via Prisma as
-- Supabase's `postgres` role, which has BYPASSRLS, so all app queries keep
-- working unchanged. With RLS on + no policies, the Supabase anon/authenticated
-- (PostgREST) roles are denied — closing direct API access to these tables.
--
-- Apply:  psql "$DATABASE_URL" -f prisma/rls.sql
--   (or paste into the Supabase SQL editor)

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    -- storefront / admin
    'User','Product','Order','OrderItem','Dispatch','Invoice','Lpo',
    -- value-chain pipeline
    'Batch','BulkRequest','Approval','Sourcing','Inspection','Requisition',
    'Issuance','Production','BatchDispatch','Receiving',
    -- chat
    'Message'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
