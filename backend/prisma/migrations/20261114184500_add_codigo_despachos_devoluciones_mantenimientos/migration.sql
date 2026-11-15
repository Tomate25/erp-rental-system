-- AlterTable: Despacho, Devolucion, Mantenimiento folio codes for SerieDocumento numbering
ALTER TABLE "despachos" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "despachos_codigo_key" ON "despachos"("codigo");

ALTER TABLE "devoluciones" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "devoluciones_codigo_key" ON "devoluciones"("codigo");

ALTER TABLE "mantenimientos" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "mantenimientos_codigo_key" ON "mantenimientos"("codigo");
