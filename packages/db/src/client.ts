import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from './schema/index.js'

/**
 * DATABASE_URL points at the Supabase Supavisor pooler (transaction mode).
 * Drizzle manages its own connection pool internally when given a connection string.
 */
export const db = drizzle(process.env['DATABASE_URL'] ?? '', { schema })

export type Database = typeof db

/**
 * Executes fn within a transaction scoped to the tenant's schema.
 * SET LOCAL scopes the search_path to this transaction only.
 */
export async function withTenantSchema<T>(
  tenantId: string,
  fn: (db: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL search_path TO "merchant_${tenantId}", public`))
    return fn(tx as unknown as Database)
  })
}

/**
 * Provisions a new tenant schema. Idempotent.
 */
export async function provisionTenantSchema(tenantId: string): Promise<void> {
  await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "merchant_${tenantId}"`))
}
