-- Migración: 20260923233000_harden_auth_and_public_tokens

-- 1. AlterTable usuarios: Añadir columna bloqueado_hasta para soporte de bloqueo temporal anti DoS
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "bloqueado_hasta" TIMESTAMP(3) WITH TIME ZONE;

-- 2. AlterTable cotizaciones: Añadir columna token_publico_revocado para permitir revocación explícita
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "token_publico_revocado" BOOLEAN NOT NULL DEFAULT false;
