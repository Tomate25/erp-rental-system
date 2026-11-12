-- AlterTable: permitir categorias dinamicas y personalizadas de insumos
ALTER TABLE "insumos" ALTER COLUMN "categoria" TYPE TEXT;
ALTER TABLE "insumos" ALTER COLUMN "categoria" SET DEFAULT 'LUBRICANTES';
