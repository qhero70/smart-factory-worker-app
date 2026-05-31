import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;

export async function getDatabase() {
  if (db) {
    return db;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({
    connectionString,
  });

  // Test connection
  const client = await pool.connect();
  await client.query('SELECT NOW()');
  client.release();

  db = drizzle(pool, { schema });
  return db;
}

export type Database = Awaited<ReturnType<typeof getDatabase>>;
