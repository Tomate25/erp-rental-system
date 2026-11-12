-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoMovimientoInsumo') THEN
        CREATE TYPE "TipoMovimientoInsumo" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "insumo_movimientos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "insumo_id" TEXT NOT NULL,
    "tipo" "TipoMovimientoInsumo" NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "stock_anterior" DECIMAL(12,2) NOT NULL,
    "stock_nuevo" DECIMAL(12,2) NOT NULL,
    "costo_unitario" DECIMAL(12,2),
    "costo_total" DECIMAL(12,2),
    "motivo" TEXT NOT NULL,
    "destino" TEXT,
    "referencia" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insumo_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "insumo_movimientos_empresa_id_tipo_idx" ON "insumo_movimientos"("empresa_id", "tipo");
CREATE INDEX IF NOT EXISTS "insumo_movimientos_insumo_id_idx" ON "insumo_movimientos"("insumo_id");
CREATE INDEX IF NOT EXISTS "insumo_movimientos_created_at_idx" ON "insumo_movimientos"("created_at");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insumo_movimientos_empresa_id_fkey') THEN
        ALTER TABLE "insumo_movimientos" ADD CONSTRAINT "insumo_movimientos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insumo_movimientos_insumo_id_fkey') THEN
        ALTER TABLE "insumo_movimientos" ADD CONSTRAINT "insumo_movimientos_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insumo_movimientos_usuario_id_fkey') THEN
        ALTER TABLE "insumo_movimientos" ADD CONSTRAINT "insumo_movimientos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
