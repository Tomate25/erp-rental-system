-- Contadores atómicos de numeración (cotizaciones por empresa, contratos por año).
CREATE TABLE "secuencias_numeracion" (
  "id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "ultimo_valor" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "secuencias_numeracion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "secuencias_numeracion_empresa_id_tipo_key"
  ON "secuencias_numeracion"("empresa_id", "tipo");

-- Sembrar cotizaciones: máximo COT-NNNN existente por empresa (la empresa de la
-- cotización o, si es NULL, la de su cliente) para continuar sin repetir números.
INSERT INTO "secuencias_numeracion" ("id", "empresa_id", "tipo", "ultimo_valor", "updated_at")
SELECT gen_random_uuid()::text,
       COALESCE(c."empresa_id", cl."empresa_id"),
       'COTIZACION',
       MAX(substring(c."numero_cotizacion" from '^COT-([0-9]+)$')::int),
       CURRENT_TIMESTAMP
FROM "cotizaciones" c
JOIN "clientes" cl ON cl."id" = c."cliente_id"
WHERE c."numero_cotizacion" ~ '^COT-[0-9]+$'
  AND COALESCE(c."empresa_id", cl."empresa_id") IS NOT NULL
GROUP BY COALESCE(c."empresa_id", cl."empresa_id");

-- Sembrar contratos: máximo CTR-YYYY-NNNN existente por año (contador global,
-- porque contratos.codigo es UNIQUE en toda la base y no tiene empresa_id).
INSERT INTO "secuencias_numeracion" ("id", "empresa_id", "tipo", "ultimo_valor", "updated_at")
SELECT gen_random_uuid()::text,
       'GLOBAL',
       'CONTRATO:' || substring("codigo" from '^CTR-([0-9]{4})-[0-9]+$'),
       MAX(substring("codigo" from '^CTR-[0-9]{4}-([0-9]+)$')::int),
       CURRENT_TIMESTAMP
FROM "contratos"
WHERE "codigo" ~ '^CTR-[0-9]{4}-[0-9]+$'
GROUP BY substring("codigo" from '^CTR-([0-9]{4})-[0-9]+$');