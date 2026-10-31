-- CreateEnum
CREATE TYPE "TipoDocumentoSerie" AS ENUM ('FACTURA', 'FACTURA_DANIO', 'NOTA_DEBITO', 'RECIBO_CAJA', 'COTIZACION', 'CONTRATO', 'SOL_DESPACHO', 'SOL_RETORNO', 'ACTA_ENTREGA', 'ACTA_RECEPCION', 'OT_TALLER', 'ARREGLO_PAGO', 'NOTA_CREDITO', 'ASIENTO');

-- CreateEnum
CREATE TYPE "EstadoSerieDocumento" AS ENUM ('ACTIVA', 'AGOTADA', 'VENCIDA', 'INACTIVA');

-- CreateEnum
CREATE TYPE "EstadoUsoDocumento" AS ENUM ('EMITIDO', 'ANULADO');

-- CreateTable
CREATE TABLE "series_documento" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT,
    "tipo_documento" "TipoDocumentoSerie" NOT NULL,
    "serie" TEXT NOT NULL,
    "prefijo" TEXT,
    "plantilla" TEXT,
    "relleno" INTEGER NOT NULL DEFAULT 6,
    "numero_desde" INTEGER NOT NULL DEFAULT 1,
    "numero_hasta" INTEGER NOT NULL DEFAULT 999999,
    "numero_actual" INTEGER NOT NULL DEFAULT 0,
    "reinicia_por_anio" BOOLEAN NOT NULL DEFAULT false,
    "anio_actual" INTEGER,
    "es_fiscal" BOOLEAN NOT NULL DEFAULT false,
    "alerta_porcentaje" INTEGER NOT NULL DEFAULT 80,
    "estado" "EstadoSerieDocumento" NOT NULL DEFAULT 'ACTIVA',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_documento_uso" (
    "id" TEXT NOT NULL,
    "serie_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "codigo_formateado" TEXT NOT NULL,
    "tipo_documento" "TipoDocumentoSerie" NOT NULL,
    "documento_id" TEXT,
    "usuario_id" TEXT,
    "estado" "EstadoUsoDocumento" NOT NULL DEFAULT 'EMITIDO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_documento_uso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "series_documento_empresa_id_tipo_documento_estado_idx" ON "series_documento"("empresa_id", "tipo_documento", "estado");

-- CreateIndex
CREATE INDEX "series_documento_empresa_id_sucursal_id_tipo_documento_esta_idx" ON "series_documento"("empresa_id", "sucursal_id", "tipo_documento", "estado");

-- CreateIndex
CREATE INDEX "series_documento_uso_serie_id_numero_idx" ON "series_documento_uso"("serie_id", "numero");

-- AddForeignKey
ALTER TABLE "series_documento" ADD CONSTRAINT "series_documento_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_documento" ADD CONSTRAINT "series_documento_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_documento_uso" ADD CONSTRAINT "series_documento_uso_serie_id_fkey" FOREIGN KEY ("serie_id") REFERENCES "series_documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
