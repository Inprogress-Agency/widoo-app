import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View } from 'react-native';
import { Text } from '../ui/Text';
import { segments, type Segment } from './lists';

// As the tab bar: VoiceOver does not announce the `tab` role, a button with its selected state does.
const TAB_ROLE = Platform.OS === 'ios' ? 'button' : 'tab';

interface SegmentsProps {
  selected: Segment;
  onSelect: (segment: Segment) => void;
}

/**
 * « À venir », « Favoris », « Passés », « Créés » in a warm grey track, the active one in ink
 * (Ecrans › E-08), without animation. A dense component: capped at 1.3 times, the four hold.
 * Read as the tab list « Vos parcours », « À venir, onglet, 1 sur 4, sélectionné ».
 */
export function Segments({ selected, onSelect }: SegmentsProps) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('routes.segments')}
      className="flex-row rounded-pill bg-surface p-4"
    >
      {segments.map((segment, index) => {
        const isSelected = segment === selected;
        const label = t(`routes.segment.${segment}`);
        return (
          <Pressable
            key={segment}
            accessibilityRole={TAB_ROLE}
            accessibilityLabel={t('routes.segmentSpoken', {
              label,
              position: index + 1,
              total: segments.length,
            })}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(segment)}
            // Each as wide as its label needs: « Favourites » takes more than « Past ».
            className={`min-h-touch-min grow items-center justify-center rounded-pill px-6 py-8 ${isSelected ? 'bg-surface-strong' : ''}`}
          >
            {/* One line, never cut inside a word; shrunk a little only if the four still overflow. */}
            <Text
              variant="label-strong"
              color={isSelected ? 'on-strong' : 'ink'}
              isDense
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
