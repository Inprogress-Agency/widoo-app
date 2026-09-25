import { badges, colors, type BadgeKind } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Badge of mappings.badges: Vérifié, Signature, Premium and Privé on photos, Nouveau in place of
 * the rating, Créateur certifié on the creator line (no pill). A dense component: its text is
 * capped at 1.3 times. Read as its label, the icon being decorative.
 */
export function Badge({ kind }: { kind: BadgeKind }) {
  const { t } = useTranslation();
  const badge = badges[kind];
  const label = t(`badges.${kind}`);
  return (
    <View
      accessible
      accessibilityLabel={label}
      className={
        badge.bg === null
          ? 'flex-row items-center gap-4 self-start'
          : 'min-h-badge-h flex-row items-center gap-4 self-start rounded-pill px-8'
      }
      style={badge.bg === null ? undefined : { backgroundColor: colors[badge.bg] }}
    >
      {badge.icon && (
        <Icon
          name={badge.icon}
          size="space-16"
          color={'iconColor' in badge ? badge.iconColor : badge.ink}
          weight={'iconWeight' in badge ? badge.iconWeight : 'regular'}
        />
      )}
      <Text variant="status" color={badge.ink} isDense>
        {label}
      </Text>
    </View>
  );
}
