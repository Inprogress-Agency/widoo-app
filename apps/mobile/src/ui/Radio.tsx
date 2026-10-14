import { View } from 'react-native';

/** Radio of 24 points, decorative: its row carries the role and the state. */
export function Radio({
  isChecked,
  isDisabled = false,
}: {
  isChecked: boolean;
  isDisabled?: boolean;
}) {
  const ring = isDisabled
    ? 'border-control-border-disabled'
    : isChecked
      ? 'border-blue bg-blue'
      : 'border-control-border';
  return (
    <View className={`size-24 items-center justify-center rounded-pill border-2 ${ring}`}>
      {isChecked && <View className="size-8 rounded-pill bg-bg" />}
    </View>
  );
}
