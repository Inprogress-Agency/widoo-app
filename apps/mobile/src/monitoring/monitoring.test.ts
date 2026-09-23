import type { ErrorEvent } from '@sentry/react-native';
import { describe, expect, it } from 'vitest';
import { monitoringOptions } from './options';

const dsn = 'https://public@o0.ingest.de.sentry.io/0';

describe('monitoringOptions', () => {
  it('reports nothing without DSN', () => {
    expect(monitoringOptions({ dsn: undefined, environment: undefined })).toMatchObject({
      dsn: undefined,
      enabled: false,
      environment: 'development',
    });
  });

  it('never sends default personal data, screenshots, view hierarchies or sessions', () => {
    expect(monitoringOptions({ dsn, environment: 'preview' })).toMatchObject({
      enabled: true,
      environment: 'preview',
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableAutoSessionTracking: false,
    });
  });

  it('removes the user, e-mail addresses and tokens from a crash before it is sent', () => {
    const { beforeSend } = monitoringOptions({ dsn, environment: undefined });
    const crash: ErrorEvent = {
      type: undefined,
      user: { id: 'device-1', email: 'leak.test@example.com', ip_address: '203.0.113.7' },
      exception: { values: [{ type: 'Error', value: 'Crash for leak.test@example.com' }] },
      request: { headers: { Authorization: 'Bearer fictitious-token' } },
    };
    const sent = beforeSend?.(crash, {});
    expect(sent).toBe(crash);
    expect(JSON.stringify(sent)).not.toMatch(/leak\.test|fictitious-token|203\.0\.113\.7|device-1/);
    expect(crash.exception?.values?.[0]?.value).toBe('Crash for [email]');
  });
});
