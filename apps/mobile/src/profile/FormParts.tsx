import { Pressable, View } from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';

/** A section title and its count on the right, which passes under it when the room runs out. */
export function SectionTitle({ title, value }: { title: string; value: string }) {
  return (
    <View className="flex-row flex-wrap items-baseline justify-between gap-x-12">
      <Text variant="title-m" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body-s" color="muted">
        {value}
      </Text>
    </View>
  );
}

/** « Ajouter une anecdote », the dashed tile: the plus and the words carry the meaning. */
export function AddTile({
  label,
  help,
  onPress,
}: {
  label: string;
  help: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={help}
      onPress={onPress}
      className="flex-row items-center gap-16 rounded-section border border-dashed border-control-border p-16"
    >
      <Icon {...uiIcon('add')} size="icon-l" color="blue-ink" />
      <View className="flex-1 gap-4">
        <Text variant="item" color="blue-ink">
          {label}
        </Text>
        <Text variant="body-s" color="muted">
          {help}
        </Text>
      </View>
    </Pressable>
  );
}
