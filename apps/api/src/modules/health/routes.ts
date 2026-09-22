import type { FastifyInstance } from 'fastify';
import { sql } from '../../db';

export async function registerHealth(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    let db = 'ok';
    try {
      await sql`select 1`;
    } catch {
      db = 'error';
    }
    return { status: 'ok', uptime: process.uptime(), db, timestamp: new Date().toISOString() };
  });
}