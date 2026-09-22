import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export const sql = postgres(process.env.DATABASE_URL ?? '', {
  max: 10,
  prepare: true,
});

export const db = drizzle(sql, { schema });

export type DB = typeof db;
