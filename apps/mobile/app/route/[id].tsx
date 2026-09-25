import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { StatusMessage } from '../../src/components/StatusMessage';
import { Button } from '../../src/ui/Button';

/** E-05, provisional until the route sheet (#37): where « Voir plus » of the map leads. */
export default function RouteScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('route.title')}>
      <StatusMessage
        title={t('route.comingSoon')}
        action={
          <Button label={t('route.back')} variant="secondary" onPress={() => router.back()} />
        }
      />
    </Screen>
  );
}
