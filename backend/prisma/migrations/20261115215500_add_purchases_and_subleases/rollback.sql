DROP TABLE IF EXISTS "pagos_compras";
DROP TABLE IF EXISTS "subarriendos_proveedores";
DROP TABLE IF EXISTS "compras_insumos_items";
DROP TABLE IF EXISTS "compras_insumos";
ALTER TABLE "insumo_movimientos" DROP COLUMN IF EXISTS "compra_insumo_id";
DROP TYPE IF EXISTS "EstadoSubarriendoProveedor";
DROP TYPE IF EXISTS "ModalidadSubarriendoProveedor";
DROP TYPE IF EXISTS "EstadoPagoCompra";
DROP TYPE IF EXISTS "EstadoCompraInsumo";
