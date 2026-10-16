'use client';

import { SettingPanelContent } from '@/components/settings/SettingPanelContent';
import { SettingsTable } from '@/components/settings/SettingsTable';
import { PageMessage } from '@/components/states/PageMessage';
import { sectionPaths } from '@/config/navigation';
import { SettingEditContainer } from '@/containers/SettingEditContainer';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { Button, DetailPanel } from '@widoo/ui';
import { useRouter, useSearchParams } from 'next/navigation';

const texts = messages.settings;
/** Parameter of the address that holds the setting whose detail is open next to the list. */
const openSettingParam = 'reglage';

/**
 * A-11, the settings the team changes without a deployment: the list, and next to it the detail
 * of the setting the address names, with its history from the journal and its « Modifier ».
 */
export function SettingsContainer() {
  const router = useRouter();
  const openKey = useSearchParams().get(openSettingParam);
  const settings = useRemoteData('settings', (signal) =>
    getSessionClients().api.getAdminSettings(signal),
  );
  const history = useRemoteData(`history:${openKey ?? ''}`, (signal) =>
    openKey
      ? getSessionClients().api.getAdminActions(
          { targetType: 'setting', targetId: openKey },
          signal,
        )
      : Promise.resolve(null),
  );
  const items = settings.status === 'ready' ? settings.data.items : undefined;
  const openSetting = items?.find((setting) => setting.key === openKey);

  const showSetting = (key: string | null) =>
    router.replace(
      key
        ? `${sectionPaths.settings}?${new URLSearchParams({ [openSettingParam]: key }).toString()}`
        : sectionPaths.settings,
      { scroll: false },
    );
  const reloadAll = () => {
    if (settings.status !== 'loading') settings.reload();
    if (history.status !== 'loading') history.reload();
  };

  if (settings.status === 'error') {
    return (
      <PageMessage
        role="alert"
        title={texts.error}
        action={<Button onClick={settings.reload}>{messages.list.retry}</Button>}
      />
    );
  }

  return (
    <div className="flex items-stretch gap-24">
      <div className="min-w-0 flex-1">
        <SettingsTable
          items={items ?? []}
          isLoading={settings.status === 'loading'}
          openKey={openKey}
          onOpen={(setting) => showSetting(setting.key)}
        />
      </div>
      {openSetting ? (
        <DetailPanel
          key={openSetting.key}
          title={texts.items[openSetting.key]?.label ?? openSetting.key}
          closeLabel={messages.confirm.close}
          onClose={() => showSetting(null)}
          actions={<SettingEditContainer setting={openSetting} onSaved={reloadAll} />}
        >
          <SettingPanelContent
            setting={openSetting}
            history={history.status === 'ready' ? (history.data?.items ?? []) : null}
            hasHistoryError={history.status === 'error' && openKey !== null}
          />
        </DetailPanel>
      ) : null}
    </div>
  );
}
