import { config } from 'dotenv';
import { resolve } from 'node:path';

// Testler env.ts'yi import eden modulleri yukleyecegi icin gerekli degiskenleri
// .env dosyasindan yukle. CI'da .env yoksa guvenli varsayilanlara dus.
config({ path: resolve(process.cwd(), '.env'), quiet: true });

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgres://community:community@localhost:5433/community';
process.env.REDIS_URL ??= 'redis://localhost:6380';
process.env.SESSION_SECRET ??= 'test-secret-insecure-change-me-32chars!!!!';
