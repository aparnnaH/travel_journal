import { NextRequest, NextResponse } from 'next/server';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const API_RATE_LIMIT_POLICIES = {
  'ai-companion': {
    limit: 20,
    windowMs: 60_000,
  },
  'ai-memory-keeper': {
    limit: 24,
    windowMs: 60_000,
  },
  'ai-polish': {
    limit: 24,
    windowMs: 60_000,
  },
} as const;

type ApiRateLimitPolicy = keyof typeof API_RATE_LIMIT_POLICIES;

const rateLimitBuckets = new Map<string, RateLimitBucket>();
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000;
let nextRateLimitCleanupAt = 0;

function cleanupExpiredRateLimitBuckets(now: number) {
  if (now < nextRateLimitCleanupAt) {
    return;
  }

  nextRateLimitCleanupAt = now + RATE_LIMIT_CLEANUP_INTERVAL_MS;

  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

export function apiError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function readJsonBody<T>(
  request: NextRequest,
  options: { maxBytes?: number; errorMessage?: string } = {}
): Promise<T | NextResponse> {
  const maxBytes = options.maxBytes ?? 64 * 1024;
  const contentLength = request.headers.get('content-length');

  if (contentLength && Number(contentLength) > maxBytes) {
    return apiError(options.errorMessage ?? 'Request body is too large.', 413);
  }

  let rawBody = '';

  try {
    rawBody = await request.text();
  } catch {
    return apiError('Could not read request body.', 400);
  }

  if (Buffer.byteLength(rawBody, 'utf8') > maxBytes) {
    return apiError(options.errorMessage ?? 'Request body is too large.', 413);
  }

  try {
    return JSON.parse(rawBody || '{}') as T;
  } catch {
    return apiError('Request body must be valid JSON.', 400);
  }
}

export function isApiError<T>(value: T | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export function clampText(value: unknown, maxLength: number) {
  const cleanValue = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return cleanValue.slice(0, maxLength).trim();
}

export function clampStringList(value: unknown, maxItems: number, maxItemLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => clampText(item, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function resolveSameOriginPath(value: string | null, fallbackPath = '/journal') {
  const cleanValue = value?.trim();

  if (!cleanValue || !cleanValue.startsWith('/') || cleanValue.startsWith('//')) {
    return fallbackPath;
  }

  return cleanValue;
}

function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  cleanupExpiredRateLimitBuckets(now);

  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      }
    );
  }

  existing.count += 1;
  return null;
}

export function checkApiRateLimit(policy: ApiRateLimitPolicy, userId: string) {
  const rateLimitPolicy = API_RATE_LIMIT_POLICIES[policy];

  return checkRateLimit({
    key: `${policy}:${userId}`,
    limit: rateLimitPolicy.limit,
    windowMs: rateLimitPolicy.windowMs,
  });
}
