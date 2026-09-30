import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().default(3000),
  API_URL: z.string().url().default('http://localhost:3000'),
  // Virgulle ayrilmis origin listesi: CORS'a hem HTTP hem WebSocket handshake
  // icin gecer. Once tek URL dogruluyordu, liste ise sessizce calismiyordu.
  APP_URL: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .refine(
      (origins) =>
        origins.length > 0 &&
        origins.every((origin) => {
          try {
            return Boolean(new URL(origin).origin);
          } catch {
            return false;
          }
        }),
      { message: 'APP_URL virgulle ayrilmis gecerli origin listesi olmali' },
    ),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('Community <no-reply@localhost>'),
  ANTHROPIC_API_KEY: z.string().optional(),
  SESSION_SECRET: z.string().min(32).default('dev-secret-insecure-change-me-32chars!!'),
  SESSION_TTL_DAYS: z.coerce.number().int().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Geçersiz ortam değişkenleri:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;