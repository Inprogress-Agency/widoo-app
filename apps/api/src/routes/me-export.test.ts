import { MyDataExport } from '@widoo/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { TestTokenVerifier } from '../auth/test-verifier';
import { editorFixtures } from '../editor/test-fixtures';
import { testConfig } from '../test-config';
import { EXPORT_RATE_LIMIT, exportFileName } from './me-export';

// Shared database, parallel files: accounts of this file only (exportUserData: users/export.test).
const verifier = new TestTokenVerifier();
let app: Awaited<ReturnType<typeof buildApp>>;
const fixtures = editorFixtures(() => app, verifier);

beforeAll(async () => {
  app = await buildApp(testConfig(), { tokenVerifier: verifier });
});
afterAll(async () => {
  await fixtures.cleanUp();
  await app.close();
});

const exportOf = (headers: Record<string, string>) => app.inject({ url: '/v1/me/export', headers });

describe('GET /v1/me/export', () => {
  it('answers 401 without a token', async () => {
    expect((await exportOf({})).statusCode).toBe(401);
  });

  it('sends the data of the account of the token as a dated file, never cached', async () => {
    const headers = await fixtures.signIn();
    const { id } = (await app.inject({ url: '/v1/me', headers })).json();
    const response = await exportOf(headers);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="widoo-donnees-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(MyDataExport.parse(response.json()).account.id).toBe(id);
  });

  it('answers 401 once the account is deleted', async () => {
    const headers = await fixtures.signIn();
    await app.inject({ method: 'DELETE', url: '/v1/me', headers });
    expect((await exportOf(headers)).statusCode).toBe(401);
  });

  it(`answers 429 past ${EXPORT_RATE_LIMIT} exports an hour for one account`, async () => {
    const headers = await fixtures.signIn();
    for (let done = 0; done < EXPORT_RATE_LIMIT; done += 1) {
      expect((await exportOf(headers)).statusCode).toBe(200);
    }
    expect((await exportOf(headers)).statusCode).toBe(429);
    // Another account keeps its own quota.
    expect((await exportOf(await fixtures.signIn())).statusCode).toBe(200);
  });
});

describe('exportFileName', () => {
  it('dates the file in Paris', () => {
    expect(exportFileName(new Date('2026-10-14T22:30:00Z'))).toBe('widoo-donnees-2026-10-15.json');
  });
});
