import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

/** E-09, to be built. */
export default function ProfileScreen() {
  const { t } = useTranslation();
  return <Screen title={t('profile.title')} />;
}
