/** Exhaustiveness guard for a switch over a union, such as a taxonomy key. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
