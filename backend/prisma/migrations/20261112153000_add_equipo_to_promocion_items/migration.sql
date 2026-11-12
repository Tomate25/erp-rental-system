-- AlterTable
ALTER TABLE "promocion_items" ADD COLUMN IF NOT EXISTS "equipo_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promocion_items_equipo_id_idx" ON "promocion_items"("equipo_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promocion_items_equipo_id_fkey') THEN
        ALTER TABLE "promocion_items" ADD CONSTRAINT "promocion_items_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
