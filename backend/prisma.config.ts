import 'dotenv/config'
import path from 'node:path'
import { defineConfig, env } from 'prisma/config'

// Prisma 7 architecture:
// - Migrations (this config): use DIRECT_URL — the non-pooled Supabase connection,
//   because pgbouncer can't multiplex DDL statements safely.
// - Runtime queries: handled by the PrismaPg adapter in src/lib/prisma.ts using
//   DATABASE_URL — the pooled connection.
// See https://pris.ly/d/config-datasource
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
})
