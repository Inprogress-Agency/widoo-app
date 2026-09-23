import { describe, expect, it } from 'vitest';
import { createFirebaseVerifier } from './firebase-verifier';
import { InvalidTokenError } from './verifier';

const projectId = 'demo-widoo-test';
const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** An unsigned, fictitious JWT: refused before any call to Google's public keys. */
function fictitiousToken(payload: object, header: object = { alg: 'RS256', kid: 'fictitious' }) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: `https://securetoken.google.com/${projectId}`,
    aud: projectId,
    sub: 'fictitious-uid',
    iat: now,
    exp: now + 3600,
    auth_time: now,
    ...payload,
  };
  return `${base64url(header)}.${base64url(claims)}.fictitious-signature`;
}

describe('createFirebaseVerifier', () => {
  const verifier = createFirebaseVerifier(projectId);

  it.each([
    ['a string that is not a JWT', 'not-a-jwt'],
    ['a token without key id', fictitiousToken({}, { alg: 'RS256' })],
    ['a token of another project', fictitiousToken({ aud: 'demo-other-project' })],
    ['a token of another issuer', fictitiousToken({ iss: 'https://issuer.example.com' })],
    ['a token signed with HS256', fictitiousToken({}, { alg: 'HS256', kid: 'fictitious' })],
  ])('refuses %s with InvalidTokenError', async (_, token) => {
    const error = await verifier.verify(token).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InvalidTokenError);
    expect(error).toMatchObject({ reason: 'auth/argument-error', message: 'Invalid token' });
  });

  it('reuses the Firebase app of a project across calls', () => {
    expect(() => createFirebaseVerifier(projectId)).not.toThrow();
  });
});
