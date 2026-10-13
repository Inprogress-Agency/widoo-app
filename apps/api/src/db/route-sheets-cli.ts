/**
 * `pnpm fixtures:route-sheets`: writes the route sheets of the demo dataset where the app reads
 * them until `GET /v1/routes/:id` exists (#36). Fictitious data only, no network nor database.
 */
import { writeFileSync } from 'node:fs';
import { routeSheetFixtures, routeSheetFixturesPath } from './seed/route-sheets';

writeFileSync(routeSheetFixturesPath, `${JSON.stringify(await routeSheetFixtures(), null, 2)}\n`);
console.info(`Route sheets written to ${routeSheetFixturesPath}`);
