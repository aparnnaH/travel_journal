export type InstagramEmbed = {
  id: string;
  url: string;
};

const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);
const INSTAGRAM_EMBED_PATHS = new Set(['p', 'reel', 'tv']);
const MAX_INSTAGRAM_EMBEDS = 4;

export function normalizeInstagramEmbedUrl(value: string) {
  const rawValue = value.trim();

  if (!rawValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(rawValue.startsWith('http') ? rawValue : `https://${rawValue}`);
    const host = parsedUrl.hostname.toLowerCase().replace(/^m\./, 'www.');
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const [kind, shortcode] = pathParts;

    if (!INSTAGRAM_HOSTS.has(host) || !INSTAGRAM_EMBED_PATHS.has(kind) || !shortcode) {
      return null;
    }

    return `https://www.instagram.com/${kind}/${shortcode}/`;
  } catch {
    return null;
  }
}

export function sanitizeInstagramEmbedUrls(value: unknown): InstagramEmbed[] {
  const rawUrls = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : [];
  const uniqueUrls = new Set<string>();

  rawUrls.forEach((item) => {
    const rawUrl =
      typeof item === 'string'
        ? item
        : item && typeof item === 'object' && 'url' in item && typeof item.url === 'string'
          ? item.url
          : '';
    const normalizedUrl = normalizeInstagramEmbedUrl(rawUrl);

    if (normalizedUrl) {
      uniqueUrls.add(normalizedUrl);
    }
  });

  return Array.from(uniqueUrls)
    .slice(0, MAX_INSTAGRAM_EMBEDS)
    .map((url, index) => ({
      id: `instagram-${index + 1}`,
      url,
    }));
}
