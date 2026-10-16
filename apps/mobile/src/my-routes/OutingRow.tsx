import type { ColorToken, UiIconKey } from '@widoo/tokens';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '../ui/Button';
import { Icon, uiIcon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { useIsLargeText } from '../ui/useIsLargeText';
import { RoutePhoto } from './RoutePhoto';

/** A pill of a line: « Arrêté », « Pas fait », the status of a creation. */
export interface RowPill {
  label: string;
  icon?: UiIconKey;
  /** « Refusé » in red (`error-ink` on `error-soft`); warm grey otherwise. */
  isError?: boolean;
}

/** The button of a line, on its right, which names the route for a screen reader. */
export interface RowAction {
  label: string;
  accessibilityLabel: string;
  isPrimary: boolean;
  onPress: () => void;
}

interface OutingRowProps {
  routeId: string | null;
  title: string;
  lines: string[];
  /** What a screen reader says of the line, its pill included. */
  accessibilityLabel: string;
  pill?: RowPill | null;
  extra?: ReactNode;
  action?: RowAction | null;
  /** Without one, the line is text only. */
  onPress?: () => void;
}

function Pill({ pill }: { pill: RowPill }) {
  const color: ColorToken = pill.isError ? 'error-ink' : 'muted';
  return (
    <View
      className={`min-h-badge-h flex-row items-center gap-4 self-start rounded-pill px-8 ${pill.isError ? 'bg-error-soft' : 'bg-surface'}`}
    >
      {pill.icon && <Icon {...uiIcon(pill.icon)} size="icon-s" color={color} />}
      <Text variant="status" color={color} isDense>
        {pill.label}
      </Text>
    </View>
  );
}

/**
 * A line of E-08: photo, title, its lines and its pill, a link to the route; its action a button
 * apart, on the right, or under the text, on the right (side of the thumb), at large text (D-039).
 */
export function OutingRow(props: OutingRowProps) {
  const { routeId, title, lines, accessibilityLabel, pill, extra, action, onPress } = props;
  const isLargeText = useIsLargeText();
  const body = (
    <>
      <RoutePhoto routeId={routeId} className="size-thumb rounded-thumb" />
      <View className="flex-1 gap-4">
        <Text variant="item">{title}</Text>
        {lines.map((line) => (
          <Text key={line} variant="body-s" color="muted">
            {line}
          </Text>
        ))}
        {extra}
        {pill && <Pill pill={pill} />}
      </View>
    </>
  );
  return (
    <View
      className={`gap-12 border-b border-surface py-12 ${isLargeText ? '' : 'flex-row items-center'}`}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={accessibilityLabel}
          onPress={onPress}
          className="min-h-touch-min flex-1 flex-row items-center gap-12"
        >
          {body}
        </Pressable>
      ) : (
        // Without destination, text read in one piece: no role to change on a recycled view.
        <View
          accessible
          accessibilityLabel={accessibilityLabel}
          className="min-h-touch-min flex-1 flex-row items-center gap-12"
        >
          {body}
        </View>
      )}
      {action && (
        <View className={isLargeText ? 'self-end' : ''}>
          <Button
            label={action.label}
            accessibilityLabel={action.accessibilityLabel}
            variant={action.isPrimary ? 'primary' : 'secondary'}
            isDense
            onPress={action.onPress}
          />
        </View>
      )}
    </View>
  );
}
