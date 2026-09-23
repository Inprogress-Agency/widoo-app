import { ApiRequestError } from '@widoo/api-client';
import type { AppConfig } from '@widoo/shared';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { apiUrl } from '../../src/api/client';
import { useAppConfig } from '../../src/api/queries';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { StatusMessage } from '../../src/components/StatusMessage';
import { colors, radii, spacing, typography } from '../../src/theme';

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
    <View style={styles.summary}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('home.config.heading')}
      </Text>
      <Text style={styles.line}>
        {t('home.config.minAppVersion', { version: config.minAppVersion })}
      </Text>
      <Text style={styles.line}>
        {t('home.config.taxonomies', { count: Object.keys(config.taxonomies).length })}
      </Text>
      <Text style={styles.line}>{t('home.config.moods', { labels: moods.join(', ') })}</Text>
      {__DEV__ && <Text style={styles.caption}>{t('home.config.apiUrl', { url: apiUrl })}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  heading: {
    ...typography.title,
    color: colors.text,
  },
  line: {
    ...typography.body,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
