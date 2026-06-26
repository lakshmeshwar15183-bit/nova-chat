import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour
const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024; // only need the <head>

/**
 * Fetches a URL and extracts Open Graph / basic metadata for link previews.
 * Results are cached in Redis to avoid repeated outbound requests and to keep
 * rendering instant.
 */
@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  constructor(private readonly redis: RedisService) {}

  async preview(rawUrl: string): Promise<LinkPreview> {
    const url = this.normalizeUrl(rawUrl);
    const cacheKey = `cache:linkpreview:${url}`;

    const cached = await this.redis.cacheGet<LinkPreview>(cacheKey);
    if (cached) return cached;

    const preview = await this.fetchPreview(url);
    await this.redis.cacheSet(cacheKey, preview, CACHE_TTL_SECONDS);
    return preview;
  }

  private normalizeUrl(rawUrl: string): string {
    let candidate = rawUrl.trim();
    if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new BadRequestException('Invalid URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Only http(s) URLs are supported');
    }
    return parsed.toString();
  }

  private async fetchPreview(url: string): Promise<LinkPreview> {
    const empty: LinkPreview = {
      url,
      title: null,
      description: null,
      image: null,
      siteName: null,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'NovaChatBot/1.0 (+link-preview)' },
        redirect: 'follow',
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || !contentType.includes('text/html')) return empty;

      const html = await this.readLimited(res);
      return this.parse(html, url);
    } catch (err) {
      this.logger.debug(`Link preview failed for ${url}: ${(err as Error).message}`);
      return empty;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Reads at most MAX_BYTES from the response body (head is enough for OG tags). */
  private async readLimited(res: Response): Promise<string> {
    if (!res.body) return res.text();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    let html = '';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (received >= MAX_BYTES || /<\/head>/i.test(html)) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
    return html;
  }

  private parse(html: string, url: string): LinkPreview {
    const meta = (property: string): string | null => {
      const patterns = [
        new RegExp(
          `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
          'i',
        ),
        new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
          'i',
        ),
      ];
      for (const re of patterns) {
        const match = html.match(re);
        if (match?.[1]) return this.decode(match[1]);
      }
      return null;
    };

    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];

    return {
      url,
      title: meta('og:title') ?? (titleTag ? this.decode(titleTag) : null),
      description: meta('og:description') ?? meta('description'),
      image: meta('og:image') ?? meta('twitter:image'),
      siteName: meta('og:site_name'),
    };
  }

  private decode(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}
