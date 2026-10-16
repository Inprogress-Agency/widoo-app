import type { OwnRouteSummary } from '@widoo/shared';
import type { UiIconKey } from '@widoo/tokens';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { createdPillOf, opensSheet, type CreatedPill } from './lists';
import { OutingRow } from './OutingRow';
import { createdDetail, createdTitle } from './text';

interface CreatedListProps {
  routes: OwnRouteSummary[];
  now: Date;
  onOpen: (route: OwnRouteSummary) => void;
}

const pillIcons: Partial<Record<CreatedPill, UiIconKey>> = {
  rejected: 'rejected',
  unpublished: 'removed',
  private: 'private',
};

/**
 * « Créés » (Ecrans › E-08, D-038, D-050): a line per creation with its status in a pill,
 * « Refusé » in red. A published or private route opens its sheet; the editor of the others
 * is not in the app yet, so their line is text only.
 */
export function CreatedList({ routes, now, onOpen }: CreatedListProps) {
  const { t } = useTranslation();
  return (
    <View>
      {routes.map((route) => {
        const title = createdTitle(t, route);
        const detail = createdDetail(t, route, now);
        const pill = createdPillOf(route);
        const pillLabel = t(`routes.created.status.${pill}`);
        return (
          <OutingRow
            key={route.id}
            routeId={opensSheet(route) ? route.id : null}
            title={title}
            lines={[detail]}
            accessibilityLabel={`${title}, ${pillLabel}, ${detail}`}
            pill={{ label: pillLabel, icon: pillIcons[pill], isError: pill === 'rejected' }}
            onPress={opensSheet(route) ? () => onOpen(route) : undefined}
          />
        );
      })}
    </View>
  );
}
