import { site } from '@/config/site';
import { buildRobots } from '@/lib/crawling';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return buildRobots(site.SITE_URL, site.SITE_INDEXABLE);
}
