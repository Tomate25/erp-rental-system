-- Rollback: Reversión segura de 20260923233000_harden_auth_and_public_tokens
-- Aborta explícitamente si existen estados de seguridad activos (tokens revocados o bloqueos activos)
DO $$
BEGIN
    -- Precondición 1: No revertir si existen cotizaciones con tokens revocados
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cotizaciones' AND column_name = 'token_publico_revocado'
    ) THEN
        IF EXISTS (SELECT 1 FROM "cotizaciones" WHERE "token_publico_revocado" = true) THEN
            RAISE EXCEPTION 'Rollback abortado: Existen cotizaciones con tokens públicos expresamente revocados. Eliminar token_publico_revocado reactivaría tokens comprometidos.';
        END IF;
    END IF;

    -- Precondición 2: No revertir si existen usuarios con bloqueo temporal activo
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'bloqueado_hasta'
    ) THEN
        IF EXISTS (SELECT 1 FROM "usuarios" WHERE "bloqueado_hasta" IS NOT NULL AND "bloqueado_hasta" > NOW()) THEN
            RAISE EXCEPTION 'Rollback abortado: Existen usuarios con bloqueo temporal de fuerza bruta activo. Eliminar bloqueado_hasta levantaría el bloqueo antes de su vencimiento.';
        END IF;
    END IF;

    -- Si se cumplen las precondiciones, proceder con la eliminación segura de columnas:
    ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "bloqueado_hasta";
    ALTER TABLE "cotizaciones" DROP COLUMN IF EXISTS "token_publico_revocado";
END $$;
