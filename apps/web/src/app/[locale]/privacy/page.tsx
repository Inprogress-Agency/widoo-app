import { legalRoute } from '@/containers/legalRoute';

/** Privacy policy (en); under the other language, moves to its own path (#242). */
const route = legalRoute('privacy', '/privacy');

export const generateMetadata = route.generateMetadata;
export default route.Page;
