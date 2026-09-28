import { describe, expect, it } from 'vitest';
import { localTestDatabaseUrl, testDatabaseUrl } from './test-database';

describe('testDatabaseUrl', () => {
  it('defaults to the local widoo_test database', () => {
    expect(testDatabaseUrl({})).toBe(localTestDatabaseUrl);
    expect(new URL(localTestDatabaseUrl).pathname).toBe('/widoo_test');
  });

  it('keeps a DATABASE_URL naming a *_test database, as in CI', () => {
    const url = 'postgres://widoo:widoo@localhost:5432/widoo_test';
    expect(testDatabaseUrl({ DATABASE_URL: url })).toBe(url);
    expect(testDatabaseUrl({ DATABASE_URL: 'postgres://u:p@db:6543/other_test' })).toBe(
      'postgres://u:p@db:6543/other_test',
    );
  });

  it('refuses the development database, without echoing the password', () => {
    const url = 'postgres://widoo:fictitious-secret@localhost:5432/widoo';
    expect(() => testDatabaseUrl({ DATABASE_URL: url })).toThrow(/named \*_test, not "widoo"/);
    expect(() => testDatabaseUrl({ DATABASE_URL: url })).not.toThrow(/fictitious-secret/);
  });

  it('refuses a URL without a database name', () => {
    expect(() =>
      testDatabaseUrl({ DATABASE_URL: 'postgres://widoo:widoo@localhost:5432' }),
    ).toThrow(/named \*_test/);
  });
});
