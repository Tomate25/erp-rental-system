-- The Cliente.vendedorId field was present in the application schema but was
-- never introduced by a formal migration. The FK is added later, after the
-- data-preserving orphan check in the reconciliation migration.
ALTER TABLE "clientes"
  ADD COLUMN IF NOT EXISTS "vendedor_id" TEXT;
