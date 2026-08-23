export interface JwtPayload {
  sub: string;       // User ID
  email: string;     // User Email
  nombre: string;    // User Name
  empresaId: string; // Multi-tenancy Company ID
  sucursalId?: string | null; // Optional branch ID
  roles: string[];   // User Roles (e.g. ['ADMIN', 'COMERCIAL'])
  sessionToken?: string; // Token de sesión única para evitar logins duplicados simultáneos
}
