import type { FieldValues, Resolver, ResolverOptions, ResolverResult } from 'react-hook-form';
import { z } from 'zod';

interface ZodIssueLike {
  code: string;
  path: (string | number)[];
  message: string;
  received?: unknown;
  minimum?: unknown;
  maximum?: unknown;
  validation?: string;
  format?: string;
}

function turkishMessage(issue: ZodIssueLike): string {
  const field = String(issue.path[0] ?? '');
  switch (issue.code) {
    case 'invalid_type':
      return issue.received === 'undefined' ? `${field || 'Bu alan'} gerekli` : 'Geçerli bir değer girin';
    case 'invalid_format':
      if (issue.format === 'email') return 'Geçerli bir e-posta adresi girin';
      return 'Geçersiz değer';
    case 'too_small':
      if (field === 'password') return 'Şifre en az 8 karakter olmalı';
      if (field === 'username') return 'Kullanıcı adı en az 3 karakter olmalı';
      if (field === 'name') return 'Ad boş olamaz';
      if (field === 'email') return 'E-posta adresi gerekli';
      return `${field || 'Bu alan'} için geçerli bir değer gerekli`;
    case 'too_big':
      return `${field || 'Bu alan'} için çok uzun`;
    case 'unrecognized_keys':
      return 'Bilinmeyen alan gönderildi';
    case 'custom':
      return issue.message;
    default:
      return issue.message;
  }
}

export function zodResolver<TSchema extends z.ZodType<unknown>>(schema: TSchema): Resolver<FieldValues> {
  return (values: FieldValues, _context?: unknown, _options?: ResolverOptions<FieldValues>) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data as FieldValues, errors: {} as never } as ResolverResult<FieldValues>;
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues as ZodIssueLike[]) {
      const path = issue.path.length ? String(issue.path[0]) : 'root';
      if (!errors[path]) {
        errors[path] = { type: issue.code, message: turkishMessage(issue) };
      }
    }
    return { values: {} as FieldValues, errors: errors as never } as ResolverResult<FieldValues>;
  };
}

export type { FieldValues };