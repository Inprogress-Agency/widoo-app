/**
 * `pnpm fixtures:route-sheets`: writes the route sheets of the demo dataset where the tests of
 * the app read them. Fictitious data only, no network nor database.
 */
import { writeFileSync } from 'node:fs';
import { routeSheetFixtures, routeSheetFixturesPath } from './seed/route-sheets';

writeFileSync(routeSheetFixturesPath, `${JSON.stringify(await routeSheetFixtures(), null, 2)}\n`);
console.info(`Route sheets written to ${routeSheetFixturesPath}`);
