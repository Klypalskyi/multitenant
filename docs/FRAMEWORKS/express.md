# Express

Package: `@multitenant/express`. Middleware resolves a tenant from the incoming `Host` / `x-forwarded-host` (and full `headers` passed to `resolveByRequest`) and sets **`req.tenant`** (`ResolvedTenant | null`).

## API

```ts
app.use(multitenantExpress({ registry, environment: 'local' }));
```

Options:

| Option | Description |
|--------|-------------|
| `registry` | From `createTenantRegistry(config)` |
| `environment` | Logical env key (`local`, `production`, …) |
| `onMissingTenant` | `'passthrough'` (default): `req.tenant = null`, `next()`. `'throw'`: `next(new TenantNotFoundError(...))` — pair with an error handler using `isMultitenantError` from `@multitenant/core`. |

## Typings

`req.tenant` is augmented on `Express.Request` when you import `@multitenant/express` (global declaration in the package).

## Error handler sketch

```ts
import type { Request, Response, NextFunction } from 'express';
import { isMultitenantError } from '@multitenant/core';

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isMultitenantError(err)) {
    const status =
      err.code === 'MULTITENANT_TENANT_NOT_FOUND'
        ? 404
        : err.code === 'MULTITENANT_INVALID_CONFIG'
          ? 500
          : 400;
    return res.status(status).json({
      error: err.message,
      code: err.code,
    });
  }
  throw err;
});
```

See [Errors](../INTERNAL/errors.md).
