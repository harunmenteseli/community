export interface UserPublic {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  siteUrl: string | null;
  createdAt: string;
  githubUsername: string | null;
  tools: string[];
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  username: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface UpdateProfileDto {
  name: string;
  bio: string;
  siteUrl: string;
  githubUsername: string;
  tools: string[];
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUsernameDto {
  username: string;
}

export interface PollInput {
  question: string;
  options: { text: string }[];
}

export interface CreatePostDto {
  title?: string;
  content: string;
  category: 'soru' | 'fikir' | 'yaptin' | 'genel';
  isDraft?: boolean;
  images?: string[];
  poll?: PollInput;
}

export type UpdatePostDto = Partial<Omit<CreatePostDto, 'isDraft'>>;

export interface CreateCommentDto {
  postId: string;
  parentId?: string;
  content: string;
}

export interface CreateProjectDto {
  name: string;
  url: string;
  category: string;
  buildWith: string[];
  isOpenSource: boolean;
  githubUrl?: string;
  description: string;
  logoUrl?: string;
  coverUrls?: string[];
  launched?: boolean;
}

export type FeedFilter = 'yeni' | 'trend' | 'takip';

export interface FeedParams {
  filter: FeedFilter;
  cursor?: string;
  limit?: number;
}

export interface NotificationSettingsDto {
  follow: boolean;
  comment: boolean;
  like: boolean;
  reply: boolean;
  mention: boolean;
  launch: boolean;
  weeklyDigest: boolean;
}