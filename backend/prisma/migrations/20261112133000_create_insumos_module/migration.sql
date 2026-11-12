-- CreateEnum
CREATE TYPE "CategoriaInsumo" AS ENUM ('LUBRICANTES', 'FILTROS', 'DESGASTE', 'FERRETERIA', 'COMBUSTIBLE', 'OTROS');

-- CreateEnum
CREATE TYPE "UnidadMedidaInsumo" AS ENUM ('GALON', 'LITRO', 'PIEZA', 'UNIDAD', 'PAR', 'KG', 'METRO');

-- CreateTable
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" "CategoriaInsumo" NOT NULL DEFAULT 'LUBRICANTES',
    "unidad_medida" "UnidadMedidaInsumo" NOT NULL DEFAULT 'UNIDAD',
    "stock_actual" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "stock_minimo" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "costo_unitario" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "costo_incluye_iva" BOOLEAN NOT NULL DEFAULT true,
    "aplica_iva" BOOLEAN NOT NULL DEFAULT true,
    "precio_venta" DECIMAL(12,2),
    "proveedor_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumos_insumos" (
    "id" TEXT NOT NULL,
    "mantenimiento_id" TEXT NOT NULL,
    "insumo_id" TEXT NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "costo_unitario" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumos_insumos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insumos_empresa_id_nombre_key" ON "insumos"("empresa_id", "nombre");

-- CreateIndex
CREATE INDEX "insumos_empresa_id_categoria_idx" ON "insumos"("empresa_id", "categoria");

-- CreateIndex
CREATE INDEX "insumos_proveedor_id_idx" ON "insumos"("proveedor_id");

-- CreateIndex
CREATE INDEX "consumos_insumos_mantenimiento_id_idx" ON "consumos_insumos"("mantenimiento_id");

-- CreateIndex
CREATE INDEX "consumos_insumos_insumo_id_idx" ON "consumos_insumos"("insumo_id");

-- AddForeignKey
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumos_insumos" ADD CONSTRAINT "consumos_insumos_mantenimiento_id_fkey" FOREIGN KEY ("mantenimiento_id") REFERENCES "mantenimientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumos_insumos" ADD CONSTRAINT "consumos_insumos_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
