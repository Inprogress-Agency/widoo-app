import { appName } from '@/config/site';
import { getMessages, readLocale } from '@/lib/i18n/messages';
import { loadPreviewAssets } from '@/lib/preview-assets';
import { describeSharedRoute } from '@/lib/shared-route/display';
import { getSharedRoute } from '@/lib/shared-route/source';
import { colors } from '@widoo/tokens';
import { ImageResponse } from 'next/og';
import type { CSSProperties, ReactNode } from 'react';

/** Size of the preview image, as the messaging apps expect it. */
const size = { width: 1200, height: 630 };

/** Kept 5 minutes, like the page of a public route (Site-Web › Rendu et cache). */
const headers = { 'Cache-Control': 'public, max-age=300' };

/**
 * Image of the preview of a shared link in messaging apps (Site-Web › Référencement). Everything
 * is centred, in a column narrower than the image is high: WhatsApp and others crop the preview
 * to a square, which keeps the whole text. The icon and the name of the app, the title, the mood
 * and the place, then duration, budget and number of steps; the photo of the route behind, under a
 * veil, once the API gives it. The image is requested without the token of a private link: a
 * private route, like a removed or unknown one, gets the image of the app.
 *
 * A route of its own rather than the `opengraph-image` convention: its address, written by the
 * page from SITE_URL, is the same in development and in production. For the convention, Next.js
 * writes `localhost` in development, which a messaging app cannot reach through a tunnel.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale: segment, id } = await params;
  const locale = readLocale(segment);
  const messages = getMessages(locale);
  const [result, assets] = await Promise.all([
    getSharedRoute(id, undefined, locale),
    loadPreviewAssets(),
  ]);
  const options = { ...size, fonts: assets.fonts, headers };

  if (result.kind !== 'public') {
    return new ImageResponse(
      <Frame>
        <Brand icon={assets.icon} scale={1.6} />
        <div style={{ marginTop: 28, fontSize: 44, fontWeight: 500, color: colors['blue-soft'] }}>
          {messages.sharedRoute.previewTagline}
        </div>
      </Frame>,
      options,
    );
  }

  const { route } = result;
  const display = describeSharedRoute(route, locale, messages);
  return new ImageResponse(
    <Frame photo={route.coverUrl}>
      <Brand icon={assets.icon} scale={1} />
      <div
        style={{
          marginTop: 36,
          maxWidth: 600,
          textAlign: 'center',
          fontSize: 62,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: -1,
        }}
      >
        {route.title}
      </div>
      {display.place && (
        <div style={{ marginTop: 16, fontSize: 30, fontWeight: 500, color: colors['blue-soft'] }}>
          {display.place}
        </div>
      )}
      <div style={{ display: 'flex', gap: 14, marginTop: 36 }}>
        {[display.duration, display.budget.text, display.steps.text].map((text) => (
          <div
            key={text}
            style={{
              padding: '12px 26px',
              borderRadius: 999,
              background: colors.bg,
              color: colors.ink,
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {text}
          </div>
        ))}
      </div>
    </Frame>,
    options,
  );
}

/** Blue background, or the photo of the route under a veil, everything centred. */
function Frame({ photo, children }: { photo?: string | null; children: ReactNode }) {
  const fill: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: colors.blue,
        color: colors['on-blue'],
        fontFamily: 'Plus Jakarta Sans',
      }}
    >
      {photo && (
        // Drawn into a PNG by ImageResponse, never shown in a page: next/image does not apply.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" style={{ ...fill, objectFit: 'cover' }} />
      )}
      {photo && <div style={{ ...fill, background: colors['photo-veil'] }} />}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

/** Icon and name of the app, as in the header of the site. */
function Brand({ icon, scale }: { icon: string; scale: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 * scale }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" width={64 * scale} height={64 * scale} />
      <div style={{ fontSize: 48 * scale, fontWeight: 800 }}>{appName.toLowerCase()}</div>
    </div>
  );
}
