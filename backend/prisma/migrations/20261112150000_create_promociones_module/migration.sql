-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "promocion_id" TEXT;
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "promocion_nombre" TEXT;
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "descuento_promocional" DECIMAL(12,2) NOT NULL DEFAULT 0.0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "promociones" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio_combo" DECIMAL(12,2) NOT NULL,
    "tipo_cobro" "TipoCobro" NOT NULL DEFAULT 'POR_DIA',
    "dias_minimos" INTEGER NOT NULL DEFAULT 1,
    "fecha_inicio" TIMESTAMP(3),
    "fecha_fin" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "promocion_items" (
    "id" TEXT NOT NULL,
    "promocion_id" TEXT NOT NULL,
    "producto_id" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precio_unitario_sugerido" DECIMAL(12,2),
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promocion_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "promociones_empresa_id_codigo_key" ON "promociones"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promociones_empresa_id_activo_idx" ON "promociones"("empresa_id", "activo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promocion_items_promocion_id_idx" ON "promocion_items"("promocion_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promocion_items_producto_id_idx" ON "promocion_items"("producto_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizaciones_promocion_id_fkey') THEN
        ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promociones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promociones_empresa_id_fkey') THEN
        ALTER TABLE "promociones" ADD CONSTRAINT "promociones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promocion_items_promocion_id_fkey') THEN
        ALTER TABLE "promocion_items" ADD CONSTRAINT "promocion_items_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promociones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promocion_items_producto_id_fkey') THEN
        ALTER TABLE "promocion_items" ADD CONSTRAINT "promocion_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
