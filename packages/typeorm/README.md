# @multitenant/typeorm

**Optional** reference helpers for **TypeORM** **`DataSource`** (Postgres) + **`@multitenant/database`**:

- **`createSharedPostgresDataSource(url, dataSourceOptions?)`** — shared DSN
- **`getOrCreateTenantPostgresDataSource(cache, resolved, tenants, options?)`** — per-tenant URL + **`BoundedTenantDbResourceCache<DataSource>`**

Peer: **`typeorm`**. You must **`await dataSource.initialize()`** before use; on cache eviction call **`dataSource.destroy()`** (see doc).

Docs: [typeorm-postgres.md](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/typeorm-postgres.md)

---

MIT — [github.com/klypalskyi/multitenant](https://github.com/klypalskyi/multitenant)
