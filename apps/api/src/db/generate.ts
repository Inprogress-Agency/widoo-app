/**
 * `pnpm db:generate [--name=add_x | --custom --name=x]`: drizzle-kit writes the next migration,
 * then PostGIS types are unquoted. drizzle-kit quotes every type it does not know, and Postgres
 * would read `"geography(Point,4326)"` as the name of a type that does not exist.
 */
import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';

execFileSync('drizzle-kit', ['generate', ...process.argv.slice(2)], { stdio: 'inherit' });

const folder = new URL('./generated/migrations/', import.meta.url);
for (const file of await readdir(folder)) {
  if (!file.endsWith('.sql')) continue;
  const url = new URL(file, folder);
  const sql = await readFile(url, 'utf8');
  const unquoted = sql.replaceAll(/"(geography\(\w+,\d+\))"/g, '$1');
  if (unquoted !== sql) await writeFile(url, unquoted);
}
