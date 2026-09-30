import { serializeJsonLd } from '@/lib/json-ld';

/** Structured data of a page. A data block, never run by the browser. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escaped by serializeJsonLd: no text can close the script element.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
