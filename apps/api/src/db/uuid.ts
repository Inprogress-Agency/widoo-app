import { createHash, randomBytes } from 'node:crypto';

/**
 * UUID version 7 (RFC 9562): 48-bit Unix time in milliseconds, then random bits. Identifiers sort
 * by creation time, which keeps B-tree inserts local. Postgres 16 has no built-in generator.
 */
export function uuidv7(now: number = Date.now()): string {
  return formatV7(randomBytes(16), now);
}

/**
 * UUID version 7 whose random bits are a hash of `name`: the same name and time always give the
 * same id. For the fixed rows of the seed, which must keep their ids from one run to the next.
 */
export function namedUuidv7(name: string, time: number): string {
  return formatV7(createHash('sha256').update(name).digest().subarray(0, 16), time);
}

function formatV7(bytes: Buffer, time: number): string {
  bytes.writeUIntBE(time, 0, 6);
  bytes.writeUInt8((bytes.readUInt8(6) & 0x0f) | 0x70, 6); // version 7
  bytes.writeUInt8((bytes.readUInt8(8) & 0x3f) | 0x80, 8); // variant 10
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
