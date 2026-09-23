import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

/** E-08, to be built. */
export default function RoutesScreen() {
  const { t } = useTranslation();
  return <Screen title={t('routes.title')} />;
}
