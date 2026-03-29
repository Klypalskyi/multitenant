# @multitenant/kysely

**Optional** reference helpers for **Kysely** + **`pg`** + **`@multitenant/database`**:

- **`createNodePgKysely(pool)`** — shared-DSN `Kysely` over a `Pool`
- **`getOrCreateTenantNodePgPool`**, **`getTenantNodePgKysely`** — per-tenant URL + **`BoundedTenantDbResourceCache<Pool>`**

Peers: **`kysely`**, **`pg`**.

Docs: [kysely-postgres.md](https://github.com/klypalskyi/multitenant/blob/master/docs/INTERNAL/kysely-postgres.md)

---

MIT — [github.com/klypalskyi/multitenant](https://github.com/klypalskyi/multitenant)
