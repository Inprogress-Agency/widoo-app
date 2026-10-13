import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { StickyBar } from '../ui/StickyBar';

interface RouteActionsProps {
  /** A Premium route without subscription: « Débloquer avec Premium » alone (D-014). */
  isLocked: boolean;
  /** « C'est parti »: Google Maps, without tracking, until the route under way (E-07, v0.4). */
  onGo: () => void;
}

/**
 * The bar stuck under the sheet: « Programmer » and « C'est parti » in equal parts, no price; a
 * locked Premium route, the ink « Débloquer avec Premium » with its gold crown. Programmer (E-06,
 * #41) and Premium (E-17, #67) are not built yet: shown, and disabled.
 */
export function RouteActions({ isLocked, onGo }: RouteActionsProps) {
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
            label={t('route.plan')}
            icon="duration"
            variant="secondary"
            isDense
            isFullWidth
            isDisabled
            accessibilityHint={t('route.notYet')}
            onPress={noop}
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
