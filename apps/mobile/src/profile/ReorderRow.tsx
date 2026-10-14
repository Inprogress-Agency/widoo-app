import { size } from '@widoo/tokens';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Alert,
  Pressable,
  View,
  type AccessibilityActionEvent,
} from 'react-native';
import { Icon, uiIcon } from '../ui/Icon';

interface ReorderRowProps {
  /** What a screen reader reads of the row: « Mon quartier pour flâner, Le haut de Belleville… ». */
  label: string;
  /** Its short name in the announcements and the menu: the question, the route title. */
  name: string;
  index: number;
  total: number;
  onMove: (index: number, offset: -1 | 1) => void;
  /** Tap on the row: the anecdote opens in its sheet. */
  onPress?: () => void;
  /** The cross of a featured route; the pencil of an anecdote is the row itself. */
  onRemove?: () => void;
  children: ReactNode;
}

/**
 * A row of the lists of Modifier le profil that the user orders (anecdotes, à la une): the handle
 * opens « Monter » and « Descendre », the same actions screen readers reach without a gesture
 * (WCAG 2.5.7, D-051), and the new position is told. The row is one element for them.
 */
export function ReorderRow({
  label,
  name,
  index,
  total,
  onMove,
  onPress,
  onRemove,
  children,
}: ReorderRowProps) {
  const { t } = useTranslation();
  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  const move = (offset: -1 | 1) => {
    onMove(index, offset);
    AccessibilityInfo.announceForAccessibility(
      t('editProfile.moved', { name, position: index + 1 + offset, total }),
    );
  };

  const openMoveMenu = () =>
    Alert.alert(t('editProfile.moveSpoken', { name }), undefined, [
      ...(canMoveUp ? [{ text: t('editProfile.moveUp'), onPress: () => move(-1) }] : []),
      ...(canMoveDown ? [{ text: t('editProfile.moveDown'), onPress: () => move(1) }] : []),
      { text: t('editProfile.cancel'), style: 'cancel' as const },
    ]);

  const actions = [
    ...(onPress ? [{ name: 'activate', label }] : []),
    ...(canMoveUp ? [{ name: 'moveUp', label: t('editProfile.moveUp') }] : []),
    ...(canMoveDown ? [{ name: 'moveDown', label: t('editProfile.moveDown') }] : []),
    ...(onRemove ? [{ name: 'remove', label: t('editProfile.remove', { name }) }] : []),
  ];
  const handleAction = (event: AccessibilityActionEvent) => {
    switch (event.nativeEvent.actionName) {
      case 'activate':
        onPress?.();
        break;
      case 'moveUp':
        move(-1);
        break;
      case 'moveDown':
        move(1);
        break;
      case 'remove':
        onRemove?.();
        break;
    }
  };

  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityActions={actions}
      onAccessibilityAction={handleAction}
      className="flex-row items-center rounded-section bg-surface"
    >
      {total > 1 && (
        <Pressable
          accessibilityLabel={t('editProfile.moveSpoken', { name })}
          onPress={openMoveMenu}
          className="size-disc items-center justify-center"
          hitSlop={size['touch-min'] / 4}
        >
          <Icon {...uiIcon('reorder')} size="icon-m" color="muted" />
        </Pressable>
      )}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        className={`flex-1 flex-row items-center gap-12 py-12 pr-16 ${total > 1 ? '' : 'pl-16'}`}
      >
        <View className="flex-1">{children}</View>
        {onPress && <Icon {...uiIcon('edit')} size="icon-m" />}
      </Pressable>
      {onRemove && (
        <Pressable
          accessibilityLabel={t('editProfile.remove', { name })}
          onPress={onRemove}
          className="size-disc mr-8 items-center justify-center"
        >
          <Icon {...uiIcon('close')} size="icon-m" />
        </Pressable>
      )}
    </View>
  );
}
