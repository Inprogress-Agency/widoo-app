import { legalRoute } from '@/containers/legalRoute';

/** Terms of use (en); under the other language, moves to its own path (#242). */
const route = legalRoute('terms', '/terms');

export const generateMetadata = route.generateMetadata;
export default route.Page;
