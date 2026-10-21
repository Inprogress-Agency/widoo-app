import { legalRoute } from '@/containers/legalRoute';

/** Legal notice (en); under the other language, moves to its own path (#590). */
const route = legalRoute('notice', '/legal-notice');

export const generateMetadata = route.generateMetadata;
export default route.Page;
