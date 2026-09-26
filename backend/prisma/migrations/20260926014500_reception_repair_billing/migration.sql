ALTER TABLE "detalle_devolucion" ADD COLUMN "inspeccion_estado" JSONB;

ALTER TABLE "mantenimientos"
  ADD COLUMN "detalle_devolucion_id" TEXT,
  ADD COLUMN "cobrable_cliente" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gastos" JSONB,
  ADD COLUMN "comprobantes_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_detalle_devolucion_id_fkey"
  FOREIGN KEY ("detalle_devolucion_id") REFERENCES "detalle_devolucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "mantenimientos_detalle_devolucion_id_idx" ON "mantenimientos"("detalle_devolucion_id");

ALTER TABLE "facturas"
  ADD COLUMN "devolucion_id" TEXT,
  ADD COLUMN "detalle_cargo" JSONB;
CREATE UNIQUE INDEX "facturas_devolucion_id_key" ON "facturas"("devolucion_id");
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_devolucion_id_fkey"
  FOREIGN KEY ("devolucion_id") REFERENCES "devoluciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
