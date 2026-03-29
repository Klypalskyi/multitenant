# @multitenant/prisma

**Optional** reference helpers for **Prisma** + **`@multitenant/database`**:

- **`createSharedPrismaClient(databaseUrl, prismaOptions?)`** — single shared DSN
- **`getOrCreateTenantPrismaClient(cache, resolved, tenants, options?)`** — per-tenant URL + **`BoundedTenantDbResourceCache<PrismaClient>`**

Peer: **`@prisma/client`** (your generated app client; use the same major you run in production).

Docs: [prisma-postgres.md](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/prisma-postgres.md)

---

MIT — [github.com/klypalskyi/multitenant](https://github.com/klypalskyi/multitenant)
