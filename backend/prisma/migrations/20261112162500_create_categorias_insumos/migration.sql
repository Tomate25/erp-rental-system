-- CreateTable
CREATE TABLE IF NOT EXISTS "categorias_insumos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_insumos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "categorias_insumos_empresa_id_nombre_key" ON "categorias_insumos"("empresa_id", "nombre");
CREATE INDEX IF NOT EXISTS "categorias_insumos_empresa_id_activo_idx" ON "categorias_insumos"("empresa_id", "activo");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categorias_insumos_empresa_id_fkey') THEN
        ALTER TABLE "categorias_insumos" ADD CONSTRAINT "categorias_insumos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
