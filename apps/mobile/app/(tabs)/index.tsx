import { ApiRequestError } from '@widoo/api-client';
import type { AppConfig } from '@widoo/shared';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../src/api/client';
import { useAppConfig } from '../../src/api/queries';
import { Screen } from '../../src/components/Screen';
import { StatusMessage } from '../../src/components/StatusMessage';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Text } from '../../src/ui/Text';

/** E-01, provisional until the map (#26): proves the app reads `/v1/config`. */
export default function HomeScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('home.title')}>
      <ConfigContent />
    </Screen>
  );
}

function ConfigContent() {
  const { t } = useTranslation();
  const { data, error, isPaused, refetch } = useAppConfig();
  const retry = <Button label={t('home.config.retry')} onPress={() => void refetch()} />;

  if (data) {
    return <ConfigSummary config={data} />;
  }
  if (isPaused) {
    return (
      <StatusMessage
        title={t('home.config.offlineTitle')}
        body={t('home.config.offlineBody')}
        action={retry}
      />
    );
  }
  if (error) {
    const isConnectionError =
      error instanceof ApiRequestError && (error.kind === 'network' || error.kind === 'timeout');
    return (
      <StatusMessage
        title={t('home.config.errorTitle')}
        body={t(isConnectionError ? 'home.config.connectionBody' : 'home.config.serviceBody')}
        action={retry}
      />
    );
  }
  return <StatusMessage title={t('home.config.loading')} isBusy />;
}

function ConfigSummary({ config }: { config: AppConfig }) {
  const { t } = useTranslation();
  // Labels only: a mood without French label is left out rather than shown as a key.
  const moods = config.taxonomies.moods.flatMap((mood) => config.labels.fr.moods[mood] ?? []);
  return (
    <Card className="gap-8 p-16">
      <Text variant="title-s" accessibilityRole="header">
        {t('home.config.heading')}
      </Text>
      <Text variant="body">
        {t('home.config.minAppVersion', { version: config.minAppVersion })}
      </Text>
      <Text variant="body">
        {t('home.config.taxonomies', { count: Object.keys(config.taxonomies).length })}
      </Text>
      <Text variant="body">{t('home.config.moods', { labels: moods.join(', ') })}</Text>
      {__DEV__ && (
        <Text variant="label" color="muted">
          {t('home.config.apiUrl', { url: apiUrl })}
        </Text>
      )}
    </Card>
  );
}
