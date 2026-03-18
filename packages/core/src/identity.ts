export interface TenantAccessEntry {
  tenantKey: string;
  roles?: string[];
  permissions?: string[];
}

export interface Identity {
  subject: string;
  email?: string;
  name?: string;
  picture?: string;
  globalRoles?: string[];
  tenantAccess: TenantAccessEntry[];
  metadata?: Record<string, unknown>;
}

export interface EncodedSession {
  identity: Identity;
  currentTenantKey: string;
  issuedAt: number;
  expiresAt: number;
}

export interface TenantGuardOptions {
  tenantKey?: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  allowGlobalRoles?: string[];
}

export function canAccessTenant(
  session: EncodedSession | null,
  options: TenantGuardOptions = {},
): boolean {
  if (!session) return false;

  const {
    tenantKey = session.currentTenantKey,
    requiredRoles,
    requiredPermissions,
    allowGlobalRoles,
  } = options;

  const { identity } = session;

  if (allowGlobalRoles && allowGlobalRoles.length > 0) {
    const global = identity.globalRoles ?? [];
    if (global.some((r) => allowGlobalRoles.includes(r))) {
      return true;
    }
  }

  const access = identity.tenantAccess.find((t) => t.tenantKey === tenantKey);
  if (!access) return false;

  if (requiredRoles && requiredRoles.length > 0) {
    const roles = new Set(access.roles ?? []);
    if (!requiredRoles.every((r) => roles.has(r))) {
      return false;
    }
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const perms = new Set(access.permissions ?? []);
    if (!requiredPermissions.every((p) => perms.has(p))) {
      return false;
    }
  }

  return true;
}

export function assertAccess(
  session: EncodedSession | null,
  options?: TenantGuardOptions,
): void {
  if (!canAccessTenant(session, options)) {
    throw new Error('[multitenant] Access denied for tenant / roles / permissions');
  }
}

