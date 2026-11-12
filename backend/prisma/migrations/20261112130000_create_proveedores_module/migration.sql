-- CreateEnum
CREATE TYPE "TipoProveedor" AS ENUM ('MAQUINARIA_EXTERNA', 'INSUMOS_Y_REPUESTOS', 'SERVICIOS_TALLER', 'GENERAL');

-- AlterTable
ALTER TABLE "equipos" ADD COLUMN "proveedor_id" TEXT;

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "razon_social" TEXT,
    "identificacion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "contacto" TEXT,
    "tipo" "TipoProveedor" NOT NULL DEFAULT 'MAQUINARIA_EXTERNA',
    "condicion_pago" TEXT DEFAULT 'CONTADO',
    "plazo_credito_dias" INTEGER DEFAULT 0,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_empresa_id_nombre_key" ON "proveedores"("empresa_id", "nombre");

-- CreateIndex
CREATE INDEX "proveedores_empresa_id_tipo_idx" ON "proveedores"("empresa_id", "tipo");

-- CreateIndex
CREATE INDEX "equipos_proveedor_id_idx" ON "equipos"("proveedor_id");

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
