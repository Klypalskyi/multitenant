/**
 * Stable `code` values for programmatic handling (`instanceof` + switch).
 */
export type MultitenantErrorCode =
  | 'MULTITENANT_INVALID_CONFIG'
  | 'MULTITENANT_DOMAIN_RESOLUTION'
  | 'MULTITENANT_TENANT_NOT_FOUND';

export class MultitenantError extends Error {
  readonly code: MultitenantErrorCode;

  constructor(code: MultitenantErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'MultitenantError';
    this.code = code;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Zod / cross-field validation failures, missing file, JSON parse errors. */
export class InvalidTenantsConfigError extends MultitenantError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('MULTITENANT_INVALID_CONFIG', message, options);
    this.name = 'InvalidTenantsConfigError';
    Object.setPrototypeOf(this, InvalidTenantsConfigError.prototype);
  }
}

/** Ambiguous domain match, unknown environment during resolution, invalid resolution state. */
export class DomainResolutionError extends MultitenantError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('MULTITENANT_DOMAIN_RESOLUTION', message, options);
    this.name = 'DomainResolutionError';
    Object.setPrototypeOf(this, DomainResolutionError.prototype);
  }
}

/** Registry lookup failed after a domain match, or strict middleware with no resolved tenant. */
export class TenantNotFoundError extends MultitenantError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('MULTITENANT_TENANT_NOT_FOUND', message, options);
    this.name = 'TenantNotFoundError';
    Object.setPrototypeOf(this, TenantNotFoundError.prototype);
  }
}

export function isMultitenantError(e: unknown): e is MultitenantError {
  return e instanceof MultitenantError;
}
