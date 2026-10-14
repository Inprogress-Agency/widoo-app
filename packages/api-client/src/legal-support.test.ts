import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '.';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(response: Response, token: string | null = null) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => response);
  const client = createApiClient({
    baseUrl: 'http://10.0.2.2:8080',
    fetch,
    getToken: async () => token,
  });
  const call = () => fetch.mock.calls[0];
  const header = (name: string) =>
    (call()?.[1]?.headers as Record<string, string> | undefined)?.[name];
  return { client, call, header };
}

const document = {
  doc: 'terms',
  version: '2026-09-28',
  updatedAt: '2026-09-28T00:00:00.000Z',
  locale: 'fr',
  title: "Conditions d'utilisation de Widoo",
  sections: [{ title: '1. Qui nous sommes', body: 'Widoo est une application.' }],
};

// Fictitious message.
const message = {
  topic: 'question',
  message: 'Comment programmer une sortie ?',
  replyEmail: 'camille.fictive@example.com',
  appVersion: '1.2.0',
  device: 'Pixel 8, Android 15',
  locale: 'fr',
} as const;

describe('getLegalDocument', () => {
  it('asks for the text in the language of the app, without token', async () => {
    const { client, call, header } = setup(json(200, document), 'token-1');
    await expect(client.getLegalDocument('terms', 'en')).resolves.toEqual(document);
    expect(call()?.[0]).toBe('http://10.0.2.2:8080/v1/legal/terms?locale=en');
    expect(header('authorization')).toBeUndefined();
  });
});

describe('sendSupportMessage', () => {
  const receipt = { id: '01890000-0000-7000-8000-000000000009', createdAt: document.updatedAt };

  it('posts the message with the token of the signed-in user', async () => {
    const { client, call, header } = setup(json(201, receipt), 'token-1');
    await expect(client.sendSupportMessage(message)).resolves.toEqual(receipt);
    expect(call()?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(call()?.[1]?.body))).toEqual(message);
    expect(header('authorization')).toBe('Bearer token-1');
  });

  it('posts it without token when signed out', async () => {
    const { client, header } = setup(json(201, receipt));
    await client.sendSupportMessage(message);
    expect(header('authorization')).toBeUndefined();
  });
});

describe('exportMyData', () => {
  it('asks for the export of the signed-in account', async () => {
    const { client, call, header } = setup(
      json(500, { code: 'internal_error', message: 'x' }),
      't',
    );
    await expect(client.exportMyData()).rejects.toMatchObject({ status: 500 });
    expect(call()?.[0]).toBe('http://10.0.2.2:8080/v1/me/export');
    expect(header('authorization')).toBe('Bearer t');
  });
});
