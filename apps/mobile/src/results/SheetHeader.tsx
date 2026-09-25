import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';

interface SheetHeaderProps {
  title: string;
  subtitle: string;
  /** Right of the title, such as « Voir tout » (#62). */
  action?: ReactNode;
}

/** Header of a section of the sheet: « À proximité » and « 24 parcours · République ». */
export function SheetHeader({ title, subtitle, action }: SheetHeaderProps) {
  return (
    <View className="flex-row items-center gap-12 px-16 pb-12">
      <View className="flex-1 gap-4">
        <Text variant="title-m" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body-s" color="muted">
          {subtitle}
        </Text>
      </View>
      {action}
    </View>
  );
}
