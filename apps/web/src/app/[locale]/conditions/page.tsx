import { legalRoute } from '@/containers/legalRoute';

/** Conditions d’utilisation (fr); under the other language, moves to its own path (#242). */
const route = legalRoute('terms', '/conditions');

export const generateMetadata = route.generateMetadata;
export default route.Page;
