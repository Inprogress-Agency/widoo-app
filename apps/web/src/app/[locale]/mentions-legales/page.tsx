import { legalRoute } from '@/containers/legalRoute';

/** Mentions légales (fr); under the other language, moves to its own path (#590). */
const route = legalRoute('notice', '/mentions-legales');

export const generateMetadata = route.generateMetadata;
export default route.Page;
