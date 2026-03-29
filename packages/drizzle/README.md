# @multitenant/drizzle

**Phase 8.7** — reference wiring for **Drizzle ORM** (`drizzle-orm/node-postgres`) + **`pg`**, integrated with **`@multitenant/database`**:

- **`getOrCreateTenantNodePgPool`** — per-tenant DSN + bounded **`BoundedTenantDbResourceCache<Pool>`**
- **`createNodePgDrizzle`** — shared-DB `Pool` → Drizzle (with optional schema map)
- **`getTenantNodePgDrizzle`** — one-liner: resolve URL, cached pool, `drizzle(pool, { schema })`

Peers: **`drizzle-orm`**, **`pg`**.

Docs: [drizzle-postgres.md](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/drizzle-postgres.md)

---

## Open source

MIT — [github.com/klypalskyi/multitenant](https://github.com/klypalskyi/multitenant)
