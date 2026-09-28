import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { StatusMessage } from '../../src/components/StatusMessage';
import { Button } from '../../src/ui/Button';

/**
 * E-05, provisional until the route sheet (#37): where « Voir plus » of the map leads, at the step
 * of its tooltip when it points at one.
 */
export default function RouteScreen() {
  const { t } = useTranslation();
  const { step } = useLocalSearchParams<{ id: string; step?: string }>();
  return (
    <Screen title={t('route.title')}>
      <StatusMessage
        title={t('route.comingSoon')}
        body={step ? t('route.step', { position: step }) : undefined}
        action={
          <Button label={t('route.back')} variant="secondary" onPress={() => router.back()} />
        }
      />
    </Screen>
  );
}
