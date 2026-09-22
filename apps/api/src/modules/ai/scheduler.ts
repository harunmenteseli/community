import schedule from 'node-cron';
import { runDigest } from './digest-job';
import { logger } from '../../logger';

// Haftalık pazartesi 08:00
const WEEKLY_CRON = '0 8 * * 1';

export function startDigestScheduler(): void {
  if (!schedule.validate(WEEKLY_CRON)) {
    logger.warn('Geçersiz cron ifadesi — scheduler çalıştırılmıyor');
    return;
  }

  schedule.schedule(WEEKLY_CRON, async () => {
    logger.info('Haftalık AI özeti üretiliyor…');
    try {
      const result = await runDigest();
      logger.info({ result }, 'Haftalık özet tamamlandı');
    } catch (err) {
      logger.error({ err }, 'Haftalık özet üretilemedi');
    }
  });

  logger.info(`AI digest scheduler: ${WEEKLY_CRON}`);
}