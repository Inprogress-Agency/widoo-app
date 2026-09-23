import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

/** E-01, provisional until the map (#26). */
export default function HomeScreen() {
  const { t } = useTranslation();
  return <Screen title={t('home.title')} />;
}
