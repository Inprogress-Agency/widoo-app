import type { MetadataRoute } from 'next';

/** No page of the admin is public: closed to every crawler, on top of the `noindex` header. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
