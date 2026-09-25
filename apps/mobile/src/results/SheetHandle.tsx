import { useTranslation } from 'react-i18next';
import { Pressable, View, type AccessibilityActionEvent } from 'react-native';
import { sheetLevels, type SheetLevel } from './sheet';

interface SheetHandleProps {
  level: SheetLevel;
  onLevel: (level: SheetLevel) => void;
}

const next = (level: SheetLevel, step: 1 | -1): SheetLevel => {
  const index = sheetLevels.indexOf(level) + step;
  return sheetLevels[Math.min(Math.max(index, 0), sheetLevels.length - 1)] ?? level;
};

/**
 * Handle of the results sheet: a tap raises it one detent, and from full brings it back to rest.
 * For screen readers, the sheet is adjustable: a vertical swipe changes its detent (Accessibilité).
 * The handle bar itself is decorative, the touch area runs the width of the sheet.
 */
export function SheetHandle({ level, onLevel }: SheetHandleProps) {
  const { t } = useTranslation();
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const { actionName } = event.nativeEvent;
    if (actionName === 'increment' || actionName === 'decrement') {
      onLevel(next(level, actionName === 'increment' ? 1 : -1));
    }
  };
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel={t('sheet.label')}
      accessibilityValue={{ text: t(`sheet.level.${level}`) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleAccessibilityAction}
      onPress={() => onLevel(level === 'full' ? 'rest' : next(level, 1))}
      className="min-h-touch-min items-center justify-center"
    >
      <View className="h-4 w-32 rounded-pill bg-handle" />
    </Pressable>
  );
}
