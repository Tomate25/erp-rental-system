# Migración: 20260923223000_add_empresa_id_to_roles

## Descripción
Esta migración implementa la **Política A** de aislamiento multi-tenant para el sistema de roles y permisos (RBAC) de BISMARK ERP:
1. **Roles del Sistema (`SYSTEM_ROLES`):**
   - Son globales y compartidos entre empresas (`empresa_id IS NULL`).
   - Son inmutables por parte de usuarios administradores de inquilinos (no editables ni eliminables mediante API).
   - Mantienen unicidad global mediante el índice parcial:
     ```sql
     CREATE UNIQUE INDEX "roles_nombre_null_empresa_key" ON "roles"("nombre") WHERE ("empresa_id" IS NULL);
     ```
2. **Roles Personalizados por Empresa:**
   - Pertenecen exclusivamente al tenant que los crea (`empresa_id = <UUID>`).
   - Cuentan con clave foránea con borrado en cascada: `REFERENCES "empresas"("id") ON DELETE CASCADE`.
   - Mantienen unicidad compuesta por empresa y nombre mediante el índice:
     ```sql
     CREATE UNIQUE INDEX "roles_empresa_id_nombre_key" ON "roles"("empresa_id", "nombre");
     ```
   - Permiten homónimos legítimos entre distintas empresas sin colisión de base de datos.

## Política de Rollback (`rollback.sql`)
La reversión de esta migración (`DOWN`) eliminaría la columna `empresa_id` y restauraría el índice de unicidad global `roles_nombre_key`.

### Precondición de Seguridad:
Si existen roles personalizados creados por inquilinos (`WHERE empresa_id IS NOT NULL`), ejecutar un rollback provocaría pérdida de propiedad de los roles de empresa o contaminación cruzada entre tenants. Por tanto:
- El script `rollback.sql` **aborta explícitamente con excepción PL/pgSQL** si se detecta cualquier registro con `empresa_id IS NOT NULL`.
- Para revertir la migración en caso de emergencia, un administrador o DBA debe primero reasignar o eliminar manualmente los roles específicos de tenant en la base de datos.
- Solo cuando todos los roles sean del sistema (`empresa_id IS NULL`), el rollback se ejecutará de manera segura y limpia.
