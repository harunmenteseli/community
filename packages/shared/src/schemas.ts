import { z } from 'zod';

export const POST_CATEGORIES = ['soru', 'fikir', 'yaptin', 'genel'] as const;
export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  soru: 'Soru',
  fikir: 'Fikir',
  yaptin: '#yaptın',
  genel: 'Genel',
};

export const POST_CONTENT_MAX = 10_000;
export const POST_TITLE_MAX = 200;
export const POST_IMAGE_MAX_COUNT = 5;
export const PROJECT_COVER_MAX_COUNT = 5;
export const PROJECT_LOGO_MAX_MB = 5;
export const PROJECT_COVER_MAX_MB = 5;

const postCategorySchema = z.enum(POST_CATEGORIES);
const idSchema = z.string().uuid();

export const userPublicSchema = z.object({
  id: idSchema,
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  name: z.string().trim().min(1).max(60),
  bio: z.string().max(500).nullable(),
  avatarUrl: z.string().url().nullable(),
  siteUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  githubUsername: z.string().nullable(),
  tools: z.array(z.string()).default([]),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(128),
    name: z.string().trim().min(1).max(60),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  })
  .strict();

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    bio: z.string().trim().max(500),
    siteUrl: z.string().trim().url().or(z.literal('')),
    githubUsername: z.string().trim().max(39),
    tools: z.array(z.string().trim().min(1).max(40)).max(20),
  })
  .strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
});

export const updateUsernameSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
});

export const pollOptionSchema = z.object({
  text: z.string().trim().min(1).max(120),
});

export const createPostSchema = z.object({
  title: z.string().trim().max(POST_TITLE_MAX).optional(),
  content: z.string().trim().min(1).max(POST_CONTENT_MAX),
  category: postCategorySchema,
  isDraft: z.boolean().default(false),
  images: z.array(z.string().url()).max(POST_IMAGE_MAX_COUNT).optional(),
  poll: z
    .object({
      question: z.string().trim().min(1).max(200),
      options: z.array(pollOptionSchema).min(2).max(10),
    })
    .optional(),
}).strict();

export const updatePostSchema = createPostSchema.partial().extend({
  id: idSchema,
}).strict().omit({ isDraft: true }).partial().omit({ id: true });

export const createCommentSchema = z.object({
  postId: idSchema,
  parentId: idSchema.optional(),
  content: z.string().trim().min(1).max(4_000),
}).strict();

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    url: z.string().trim().url(),
    category: z.string().trim().min(1).max(40),
    buildWith: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    isOpenSource: z.boolean().default(false),
    githubUrl: z.string().trim().url().optional(),
    description: z.string().trim().max(2_000),
    logoUrl: z.string().url().optional(),
    coverUrls: z.array(z.string().url()).max(PROJECT_COVER_MAX_COUNT).optional(),
    launched: z.boolean().default(false),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.isOpenSource && !v.githubUrl) {
      ctx.addIssue({ code: 'custom', path: ['githubUrl'], message: 'Open-source için GitHub linki gerekli' });
    }
  });

export const feedParamsSchema = z.object({
  filter: z.enum(['yeni', 'trend', 'takip']).default('yeni'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const notificationSettingsSchema = z
  .object({
    follow: z.boolean().default(true),
    comment: z.boolean().default(true),
    like: z.boolean().default(true),
    reply: z.boolean().default(true),
    mention: z.boolean().default(true),
    launch: z.boolean().default(true),
    weeklyDigest: z.boolean().default(true),
  })
  .strict();

export type PostCategory = (typeof POST_CATEGORIES)[number];

export type {
  UserPublic,
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UpdateUsernameDto,
  CreatePostDto,
  UpdatePostDto,
  CreateCommentDto,
  CreateProjectDto,
  FeedParams,
  NotificationSettingsDto,
} from './types';