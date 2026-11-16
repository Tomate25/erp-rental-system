-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoCompraInsumo') THEN
        CREATE TYPE "EstadoCompraInsumo" AS ENUM ('BORRADOR', 'RECIBIDA', 'ANULADA');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoPagoCompra') THEN
        CREATE TYPE "EstadoPagoCompra" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModalidadSubarriendoProveedor') THEN
        CREATE TYPE "ModalidadSubarriendoProveedor" AS ENUM ('POR_DIA', 'POR_HORA', 'POR_MES', 'MONTO_FIJO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoSubarriendoProveedor') THEN
        CREATE TYPE "EstadoSubarriendoProveedor" AS ENUM ('ACTIVO', 'DEVUELTO', 'CANCELADO');
    END IF;
END $$;

-- AlterTable: insumo_movimientos
ALTER TABLE "insumo_movimientos" ADD COLUMN IF NOT EXISTS "compra_insumo_id" TEXT;

-- CreateTable: compras_insumos
CREATE TABLE IF NOT EXISTS "compras_insumos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT,
    "codigo" TEXT NOT NULL,
    "proveedor_id" TEXT,
    "proveedor_nombre" TEXT NOT NULL,
    "numero_factura" TEXT,
    "fecha_compra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "condicion_pago" TEXT NOT NULL DEFAULT 'CONTADO',
    "plazo_credito_dias" INTEGER NOT NULL DEFAULT 0,
    "fecha_vencimiento" TIMESTAMP(3),
    "metodo_pago" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "cuenta_pago_codigo" TEXT,
    "aplica_iva" BOOLEAN NOT NULL DEFAULT true,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "iva_total" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "estado" "EstadoCompraInsumo" NOT NULL DEFAULT 'RECIBIDA',
    "estado_pago" "EstadoPagoCompra" NOT NULL DEFAULT 'PAGADO',
    "monto_pagado" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "notas" TEXT,
    "asiento_id" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compras_insumos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "compras_insumos_empresa_id_codigo_key" ON "compras_insumos"("empresa_id", "codigo");
CREATE INDEX IF NOT EXISTS "compras_insumos_empresa_id_estado_idx" ON "compras_insumos"("empresa_id", "estado");
CREATE INDEX IF NOT EXISTS "compras_insumos_empresa_id_proveedor_id_idx" ON "compras_insumos"("empresa_id", "proveedor_id");
CREATE INDEX IF NOT EXISTS "compras_insumos_fecha_compra_idx" ON "compras_insumos"("fecha_compra");

-- CreateTable: compras_insumos_items
CREATE TABLE IF NOT EXISTS "compras_insumos_items" (
    "id" TEXT NOT NULL,
    "compra_id" TEXT NOT NULL,
    "insumo_id" TEXT NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "costo_unitario" DECIMAL(12,2) NOT NULL,
    "incluye_iva" BOOLEAN NOT NULL DEFAULT true,
    "iva_monto" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "movimiento_id" TEXT,

    CONSTRAINT "compras_insumos_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "compras_insumos_items_compra_id_idx" ON "compras_insumos_items"("compra_id");
CREATE INDEX IF NOT EXISTS "compras_insumos_items_insumo_id_idx" ON "compras_insumos_items"("insumo_id");

-- CreateTable: subarriendos_proveedores
CREATE TABLE IF NOT EXISTS "subarriendos_proveedores" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT,
    "codigo" TEXT NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "proveedor_id" TEXT,
    "proveedor_nombre" TEXT NOT NULL,
    "modalidad" "ModalidadSubarriendoProveedor" NOT NULL DEFAULT 'POR_DIA',
    "tarifa_proveedor" DECIMAL(14,4) NOT NULL,
    "cantidad_unidades" INTEGER NOT NULL DEFAULT 1,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin_estimada" TIMESTAMP(3) NOT NULL,
    "fecha_devolucion_real" TIMESTAMP(3),
    "duracion_estimada_valor" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    "monto_estimado" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "monto_final" DECIMAL(12,2),
    "monto_pagado" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "estado" "EstadoSubarriendoProveedor" NOT NULL DEFAULT 'ACTIVO',
    "estado_pago" "EstadoPagoCompra" NOT NULL DEFAULT 'PENDIENTE',
    "referencia_documento" TEXT,
    "observaciones" TEXT,
    "asiento_id" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subarriendos_proveedores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subarriendos_proveedores_empresa_id_codigo_key" ON "subarriendos_proveedores"("empresa_id", "codigo");
CREATE INDEX IF NOT EXISTS "subarriendos_proveedores_empresa_id_estado_idx" ON "subarriendos_proveedores"("empresa_id", "estado");
CREATE INDEX IF NOT EXISTS "subarriendos_proveedores_empresa_id_equipo_id_idx" ON "subarriendos_proveedores"("empresa_id", "equipo_id");
CREATE INDEX IF NOT EXISTS "subarriendos_proveedores_empresa_id_proveedor_id_idx" ON "subarriendos_proveedores"("empresa_id", "proveedor_id");

-- CreateTable: pagos_compras
CREATE TABLE IF NOT EXISTS "pagos_compras" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "compra_insumo_id" TEXT,
    "subarriendo_id" TEXT,
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "cuenta_pago_codigo" TEXT NOT NULL DEFAULT '110201',
    "referencia" TEXT,
    "observaciones" TEXT,
    "asiento_id" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_compras_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pagos_compras_empresa_id_compra_insumo_id_idx" ON "pagos_compras"("empresa_id", "compra_insumo_id");
CREATE INDEX IF NOT EXISTS "pagos_compras_empresa_id_subarriendo_id_idx" ON "pagos_compras"("empresa_id", "subarriendo_id");

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'compras_insumos_empresa_id_fkey') THEN
        ALTER TABLE "compras_insumos" ADD CONSTRAINT "compras_insumos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'compras_insumos_sucursal_id_fkey') THEN
        ALTER TABLE "compras_insumos" ADD CONSTRAINT "compras_insumos_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'compras_insumos_proveedor_id_fkey') THEN
        ALTER TABLE "compras_insumos" ADD CONSTRAINT "compras_insumos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'compras_insumos_usuario_id_fkey') THEN
        ALTER TABLE "compras_insumos" ADD CONSTRAINT "compras_insumos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'compras_insumos_items_compra_id_fkey') THEN
        ALTER TABLE "compras_insumos_items" ADD CONSTRAINT "compras_insumos_items_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras_insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'compras_insumos_items_insumo_id_fkey') THEN
        ALTER TABLE "compras_insumos_items" ADD CONSTRAINT "compras_insumos_items_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subarriendos_proveedores_empresa_id_fkey') THEN
        ALTER TABLE "subarriendos_proveedores" ADD CONSTRAINT "subarriendos_proveedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subarriendos_proveedores_sucursal_id_fkey') THEN
        ALTER TABLE "subarriendos_proveedores" ADD CONSTRAINT "subarriendos_proveedores_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subarriendos_proveedores_equipo_id_fkey') THEN
        ALTER TABLE "subarriendos_proveedores" ADD CONSTRAINT "subarriendos_proveedores_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subarriendos_proveedores_proveedor_id_fkey') THEN
        ALTER TABLE "subarriendos_proveedores" ADD CONSTRAINT "subarriendos_proveedores_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subarriendos_proveedores_usuario_id_fkey') THEN
        ALTER TABLE "subarriendos_proveedores" ADD CONSTRAINT "subarriendos_proveedores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_compras_empresa_id_fkey') THEN
        ALTER TABLE "pagos_compras" ADD CONSTRAINT "pagos_compras_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_compras_compra_insumo_id_fkey') THEN
        ALTER TABLE "pagos_compras" ADD CONSTRAINT "pagos_compras_compra_insumo_id_fkey" FOREIGN KEY ("compra_insumo_id") REFERENCES "compras_insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_compras_subarriendo_id_fkey') THEN
        ALTER TABLE "pagos_compras" ADD CONSTRAINT "pagos_compras_subarriendo_id_fkey" FOREIGN KEY ("subarriendo_id") REFERENCES "subarriendos_proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_compras_usuario_id_fkey') THEN
        ALTER TABLE "pagos_compras" ADD CONSTRAINT "pagos_compras_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
