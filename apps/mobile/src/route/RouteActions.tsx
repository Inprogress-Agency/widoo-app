import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { StickyBar } from '../ui/StickyBar';

interface RouteActionsProps {
  /** A Premium route without subscription: « Débloquer avec Premium » alone (D-014). */
  isLocked: boolean;
  /** « C'est parti »: Google Maps, without tracking, until the route under way (E-07, v0.4). */
  onGo: () => void;
  /** « Programmer » (E-06), once the detail is there: null while it loads. */
  onPlan: (() => void) | null;
  /** A planned route: its date in place of « Programmer » (« Sam. 26, 10:00 »). */
  plannedDate: { label: string; spoken: string } | null;
}

/**
 * The bar stuck under the sheet: « Programmer » and « C'est parti » in equal parts, no price; a
 * planned route, its date with the checked calendar. A locked Premium route, the ink « Débloquer
 * avec Premium » with its gold crown; Premium (E-17, #67) is not built yet: shown, and disabled.
 */
export function RouteActions({ isLocked, onGo, onPlan, plannedDate }: RouteActionsProps) {
  const { t } = useTranslation();
  const noop = () => undefined;
  return (
    <StickyBar>
      {isLocked ? (
        <Button
          label={t('route.unlockPremium')}
          icon="premium"
          variant="premium"
          isDense
          isFullWidth
          isDisabled
          accessibilityHint={t('route.notYet')}
          onPress={noop}
        />
      ) : (
        [
          <Button
            key="plan"
            label={plannedDate?.label ?? t('route.plan')}
            accessibilityLabel={plannedDate?.spoken}
            icon={plannedDate ? 'plan-date' : 'duration'}
            variant="secondary"
            isDense
            isFullWidth
            isDisabled={onPlan === null}
            onPress={onPlan ?? noop}
          />,
          <Button
            key="go"
            label={t('route.go')}
            isDense
            isFullWidth
            accessibilityHint={t('route.goHint')}
            onPress={onGo}
          />,
        ]
      )}
    </StickyBar>
  );
}
