/*
  Warnings:

  - You are about to drop the column `horometro` on the `detalle_despacho` table. All the data in the column will be lost.
  - You are about to drop the column `horometro` on the `detalle_devolucion` table. All the data in the column will be lost.
  - Added the required column `numero_cotizacion` to the `cotizaciones` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoControlEquipo" AS ENUM ('SERIALIZADO', 'POR_CANTIDAD');

-- CreateEnum
CREATE TYPE "OrigenLecturaHorometro" AS ENUM ('DESPACHO', 'RETORNO', 'INSPECCION_CAMPO', 'MANTENIMIENTO', 'AJUSTE_MANUAL');

-- CreateEnum
CREATE TYPE "TipoCobro" AS ENUM ('POR_DIA', 'POR_HORA');

-- CreateEnum
CREATE TYPE "EstadoSolicitudOperativa" AS ENUM ('PENDIENTE', 'APROBADA', 'EN_PROCESO', 'COMPLETADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SeveridadDano" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'PERDIDA_TOTAL');

-- CreateEnum
CREATE TYPE "TipoFactura" AS ENUM ('ESTANDAR', 'ANTICIPO', 'RECTIFICATIVA', 'CARGO_DANOS');

-- CreateEnum
CREATE TYPE "CondicionPagoFactura" AS ENUM ('CONTADO', 'CREDITO');

-- CreateEnum
CREATE TYPE "EstadoCorteFacturacion" AS ENUM ('PENDIENTE', 'FACTURADO', 'ANULADO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoCotizacion" ADD VALUE 'CONVERTIDA_A_CONTRATO';
ALTER TYPE "EstadoCotizacion" ADD VALUE 'FACTURADA';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoEquipo" ADD VALUE 'DESPACHADO';
ALTER TYPE "EstadoEquipo" ADD VALUE 'EN_ALQUILER';
ALTER TYPE "EstadoEquipo" ADD VALUE 'EN_RETORNO';
ALTER TYPE "EstadoEquipo" ADD VALUE 'EN_INSPECCION';
ALTER TYPE "EstadoEquipo" ADD VALUE 'EN_MANTENIMIENTO';
ALTER TYPE "EstadoEquipo" ADD VALUE 'FUERA_DE_SERVICIO';

-- DropForeignKey
ALTER TABLE "facturas" DROP CONSTRAINT "facturas_contrato_id_fkey";

-- AlterTable
ALTER TABLE "categorias" ADD COLUMN     "is_linea_amarilla" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "condicion_pago" TEXT,
ADD COLUMN     "limite_credito" DOUBLE PRECISION,
ADD COLUMN     "numero_cliente" TEXT,
ADD COLUMN     "tel_claro" TEXT,
ADD COLUMN     "tel_convencional" TEXT,
ADD COLUMN     "tel_movistar" TEXT,
ADD COLUMN     "vendedor" TEXT,
ALTER COLUMN "direccion" DROP NOT NULL,
ALTER COLUMN "email_facturacion" DROP NOT NULL,
ALTER COLUMN "telefono" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "asesor_id" TEXT,
ADD COLUMN     "atencion" TEXT,
ADD COLUMN     "deposito_garantia" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "empresa_id" TEXT,
ADD COLUMN     "notas_revision" TEXT,
ADD COLUMN     "numero_cotizacion" TEXT NOT NULL,
ADD COLUMN     "proyecto" TEXT,
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "sucursal_id" TEXT,
ADD COLUMN     "telefono" TEXT,
ADD COLUMN     "validez_dias" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "despachos" ADD COLUMN     "solicitud_despacho_id" TEXT;

-- AlterTable
ALTER TABLE "detalle_contratos" ADD COLUMN     "cantidad" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "dias" INTEGER DEFAULT 1,
ADD COLUMN     "tipo_control" "TipoControlEquipo" NOT NULL DEFAULT 'SERIALIZADO',
ADD COLUMN     "tipo_tarifa" TEXT DEFAULT 'DIA',
ALTER COLUMN "horometro_inicial" SET DEFAULT 0.0;

-- AlterTable
ALTER TABLE "detalle_cotizacion" ADD COLUMN     "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dias" INTEGER DEFAULT 1,
ADD COLUMN     "equipo_id" TEXT,
ADD COLUMN     "horas" INTEGER,
ADD COLUMN     "producto_id" TEXT,
ADD COLUMN     "tipo_cobro" "TipoCobro" NOT NULL DEFAULT 'POR_DIA';

-- AlterTable
ALTER TABLE "detalle_despacho" DROP COLUMN "horometro",
ADD COLUMN     "cantidad" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "estado_salida" TEXT NOT NULL DEFAULT 'BUENO',
ADD COLUMN     "horometro_inicial" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "numero_serie" TEXT,
ADD COLUMN     "observaciones" TEXT;

-- AlterTable
ALTER TABLE "detalle_devolucion" DROP COLUMN "horometro",
ADD COLUMN     "cantidad_danada" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cantidad_perdida" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cantidad_retornada" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "horas_calculadas" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "horometro_final" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "numero_serie" TEXT;

-- AlterTable
ALTER TABLE "devoluciones" ADD COLUMN     "solicitud_retorno_id" TEXT;

-- AlterTable
ALTER TABLE "equipos" ADD COLUMN     "horometro_ultimo_servicio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "intervalo_servicio_horas" DOUBLE PRECISION NOT NULL DEFAULT 250.0,
ADD COLUMN     "minimo_horas" INTEGER DEFAULT 4,
ADD COLUMN     "precio_renta_hora" DOUBLE PRECISION,
ADD COLUMN     "producto_id" TEXT,
ADD COLUMN     "subcategoria_id" TEXT,
ADD COLUMN     "tipo_control" "TipoControlEquipo" NOT NULL DEFAULT 'SERIALIZADO';

-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "condicion_pago" "CondicionPagoFactura" NOT NULL DEFAULT 'CONTADO',
ADD COLUMN     "corte_id" TEXT,
ADD COLUMN     "corte_numero" INTEGER,
ADD COLUMN     "cotizacion_id" TEXT,
ADD COLUMN     "descuento_global" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "empresa_id" TEXT,
ADD COLUMN     "factura_padre_id" TEXT,
ADD COLUMN     "plazo_credito_dias" INTEGER,
ADD COLUMN     "retencion_iva" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "sucursal_id" TEXT,
ADD COLUMN     "tipo_factura" "TipoFactura" NOT NULL DEFAULT 'ESTANDAR',
ALTER COLUMN "contrato_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "session_token" TEXT;

-- CreateTable
CREATE TABLE "subcategorias" (
    "id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "subcategorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "subcategoria_id" TEXT,
    "marca_id" TEXT NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo_control" "TipoControlEquipo" NOT NULL DEFAULT 'SERIALIZADO',
    "precio_renta_dia" DOUBLE PRECISION NOT NULL,
    "precio_renta_hora" DOUBLE PRECISION,
    "minimo_horas" INTEGER DEFAULT 4,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecturas_horometro" (
    "id" TEXT NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "horometro_anterior" DOUBLE PRECISION NOT NULL,
    "horometro_nuevo" DOUBLE PRECISION NOT NULL,
    "horas_trabajadas" DOUBLE PRECISION NOT NULL,
    "origen" "OrigenLecturaHorometro" NOT NULL DEFAULT 'INSPECCION_CAMPO',
    "registrado_por" TEXT,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecturas_horometro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_despacho" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "solicitado_por" TEXT,
    "fecha_programada" TIMESTAMP(3) NOT NULL,
    "direccion_entrega" TEXT,
    "estado" "EstadoSolicitudOperativa" NOT NULL DEFAULT 'PENDIENTE',
    "comentarios" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_despacho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_retorno" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "solicitado_por" TEXT,
    "fecha_programada" TIMESTAMP(3) NOT NULL,
    "lugar_recoleccion" TEXT,
    "estado" "EstadoSolicitudOperativa" NOT NULL DEFAULT 'PENDIENTE',
    "comentarios" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_retorno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones_salida" (
    "id" TEXT NOT NULL,
    "detalle_despacho_id" TEXT NOT NULL,
    "combustible" TEXT DEFAULT '100%',
    "aceite_ok" BOOLEAN NOT NULL DEFAULT true,
    "llantas_ok" BOOLEAN NOT NULL DEFAULT true,
    "hidraulico_ok" BOOLEAN NOT NULL DEFAULT true,
    "motor_ok" BOOLEAN NOT NULL DEFAULT true,
    "fugas_detectadas" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspecciones_salida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones_dano" (
    "id" TEXT NOT NULL,
    "detalle_devolucion_id" TEXT NOT NULL,
    "componente" TEXT NOT NULL,
    "tipo_dano" TEXT NOT NULL,
    "severidad" "SeveridadDano" NOT NULL DEFAULT 'MEDIA',
    "cobrable" BOOLEAN NOT NULL DEFAULT true,
    "costo_estimado" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "evidencia_url" TEXT,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspecciones_dano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cortes_facturacion" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "numero_corte" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoCorteFacturacion" NOT NULL DEFAULT 'PENDIENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cortes_facturacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subcategorias_categoria_id_nombre_key" ON "subcategorias"("categoria_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_despacho_codigo_key" ON "solicitudes_despacho"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_retorno_codigo_key" ON "solicitudes_retorno"("codigo");

-- AddForeignKey
ALTER TABLE "subcategorias" ADD CONSTRAINT "subcategorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "subcategorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "subcategorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturas_horometro" ADD CONSTRAINT "lecturas_horometro_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_cotizacion" ADD CONSTRAINT "detalle_cotizacion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_cotizacion" ADD CONSTRAINT "detalle_cotizacion_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_despacho" ADD CONSTRAINT "solicitudes_despacho_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_despacho" ADD CONSTRAINT "solicitudes_despacho_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_despacho" ADD CONSTRAINT "solicitudes_despacho_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_retorno" ADD CONSTRAINT "solicitudes_retorno_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_retorno" ADD CONSTRAINT "solicitudes_retorno_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_retorno" ADD CONSTRAINT "solicitudes_retorno_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_solicitud_despacho_id_fkey" FOREIGN KEY ("solicitud_despacho_id") REFERENCES "solicitudes_despacho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_salida" ADD CONSTRAINT "inspecciones_salida_detalle_despacho_id_fkey" FOREIGN KEY ("detalle_despacho_id") REFERENCES "detalle_despacho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_solicitud_retorno_id_fkey" FOREIGN KEY ("solicitud_retorno_id") REFERENCES "solicitudes_retorno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_dano" ADD CONSTRAINT "inspecciones_dano_detalle_devolucion_id_fkey" FOREIGN KEY ("detalle_devolucion_id") REFERENCES "detalle_devolucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cortes_facturacion" ADD CONSTRAINT "cortes_facturacion_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_corte_id_fkey" FOREIGN KEY ("corte_id") REFERENCES "cortes_facturacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_factura_padre_id_fkey" FOREIGN KEY ("factura_padre_id") REFERENCES "facturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
