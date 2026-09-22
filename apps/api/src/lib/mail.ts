import { Resend } from 'resend';
import { env } from '../env';
import { logger } from '../logger';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface MailSendInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(input: MailSendInput): Promise<void> {
  if (!resend) {
    logger.warn({ to: input.to, subject: input.subject }, 'Resend API anahtarı yok — e-posta gönderimi atlandı');
    return;
  }

  const { error } = await resend.emails.send({
    from: env.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    logger.error({ error }, 'E-posta gönderilemedi');
    throw new Error('E-posta gönderilemedi');
  }
}

export function layout(title: string, body: string): string {
  return `<!doctype html><html lang="tr"><body style="margin:0;font-family:Inter,Arial,sans-serif;background:#fafafa;color:#111;padding:32px;"><table role="presentation" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:16px;overflow:hidden;"><tr><td style="padding:32px;"><h1 style="font-size:22px;margin:0 0 12px;">${title}</h1><div style="font-size:15px;line-height:1.6;color:#374151;">${body}</div></td></tr></table></body></html>`;
}