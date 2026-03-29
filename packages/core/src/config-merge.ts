import { InvalidTenantsConfigError } from './errors';

export function isConfigPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Deep-merge ordered layers: **earlier** keys are overridden by **later** non-undefined values.
 * **Conflict:** same path holds a plain object in one layer and a non-object in another.
 */
export function mergeTenantConfigLayers(
  layers: Array<Record<string, unknown> | undefined>,
  errorContext?: { tenantKey: string },
): Record<string, unknown> {
  const nonempty = layers.filter((x): x is Record<string, unknown> => {
    if (x == null) return false;
    return Object.keys(x).length > 0;
  });
  if (nonempty.length === 0) return {};
  let acc: Record<string, unknown> = {};
  for (const layer of nonempty) {
    acc = deepMergeOne(acc, layer, '', errorContext);
  }
  return acc;
}

function deepMergeOne(
  base: Record<string, unknown>,
  over: Record<string, unknown>,
  pathPrefix: string,
  errorContext?: { tenantKey: string },
): Record<string, unknown> {
  const out = { ...base };
  const ctx = errorContext?.tenantKey ? `Tenant "${errorContext.tenantKey}": ` : '';
  for (const [k, bv] of Object.entries(over)) {
    const path = pathPrefix ? `${pathPrefix}.${k}` : k;
    if (bv === undefined) continue;
    const av = out[k];
    if (av === undefined) {
      out[k] = bv;
      continue;
    }
    if (isConfigPlainObject(av) && isConfigPlainObject(bv)) {
      out[k] = deepMergeOne(av, bv, path, errorContext);
    } else if (isConfigPlainObject(av) || isConfigPlainObject(bv)) {
      throw new InvalidTenantsConfigError(
        `${ctx}config merge conflict at "${path}" (cannot merge object with non-object)`,
      );
    } else {
      out[k] = bv;
    }
  }
  return out;
}
