import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseCorsOrigin(value?: string): string | string[] {
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variable: CORS_ORIGIN');
    }
    return 'http://localhost:8081';
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.includes('*') && process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN must not be * in production');
  }
  return origins.length === 0 ? 'http://localhost:8081' : origins.length === 1 ? origins[0] : origins;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  apiVersion: process.env.API_VERSION ?? 'v1',
  mongodbUri: requireEnv('MONGODB_URI'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI ?? '',
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 's3',
    bucket: process.env.AWS_S3_BUCKET ?? 'homehub-media',
    region: process.env.AWS_REGION ?? 'us-east-1',
  },
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN ?? '*'),
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
} as const;
