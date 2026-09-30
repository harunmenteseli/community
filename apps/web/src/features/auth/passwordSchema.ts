import { z } from 'zod';
import { changePasswordSchema } from '@community/shared';

/**
 * Şifre formunun istemci şeması: sunucudaki `changePasswordSchema` + yeni
 * şifrenin iki kez aynı girilmesi kuralı.
 */
export const passwordSchema = changePasswordSchema.extend({
  confirmPassword: z.string(),
}).refine((values) => values.newPassword === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Şifreler eşleşmiyor',
});
