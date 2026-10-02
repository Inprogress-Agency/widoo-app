import { legalRoute } from '@/containers/legalRoute';

/** Politique de confidentialité (fr); under the other language, moves to its own path (#242). */
const route = legalRoute('privacy', '/confidentialite');

export const generateMetadata = route.generateMetadata;
export default route.Page;
