import { site } from '@/config/site';
import { buildSitemap } from '@/lib/crawling';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return site.SITE_INDEXABLE ? buildSitemap(site.SITE_URL) : [];
}
