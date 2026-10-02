import 'server-only';
import { site } from '@/config/site';
import { districtsByBank, type DistrictRoutes } from './types';

/** Example routes of the districts; none online until the API gives them (#239). In development
 * without API, every district leads to the demo route, to review the links. */
export async function getDistrictRoutes(): Promise<DistrictRoutes> {
  if (process.env.NODE_ENV === 'development' && !site.WIDOO_API_URL) {
    return Object.fromEntries(
      [...districtsByBank.right, ...districtsByBank.left].map((key) => [key, 'demo-public']),
    );
  }
  return {};
}
