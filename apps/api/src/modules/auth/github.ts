import { env } from '../../env';
import { errors } from '../../lib/errors';

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  emails: GithubEmail[] | null;
}

export async function exchangeGithubCode(code: string): Promise<string> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw errors.internal('GitHub OAuth yapılandırılmamış');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL,
    }),
  });

  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token) {
    throw errors.unauthorized('GitHub doğrulaması başarısız', 'GITHUB_OAUTH_FAILED');
  }
  return data.access_token;
}

export async function getGithubUser(accessToken: string): Promise<GithubUser> {
  const [profileRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    }),
    fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    }),
  ]);

  if (!profileRes.ok) throw errors.unauthorized('GitHub profili alınamadı', 'GITHUB_API_FAILED');

  const profile = (await profileRes.json()) as GithubUser;
  const emails = emailsRes.ok ? ((await emailsRes.json()) as GithubEmail[]) : null;
  profile.emails = emails;
  profile.email ??= emails?.find((e) => e.primary && e.verified)?.email ?? null;
  return profile;
}