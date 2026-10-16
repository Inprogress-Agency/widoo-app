'use client';

import { affiliationPaths } from '@/components/affiliation/AffiliationTabs';
import { ProgramActions } from '@/components/affiliation/ProgramActions';
import { ProgramPanelContent } from '@/components/affiliation/ProgramPanelContent';
import { ProgramsTable } from '@/components/affiliation/ProgramsTable';
import { PageMessage } from '@/components/states/PageMessage';
import { ProgramFormContainer } from '@/containers/ProgramFormContainer';
import { useProgramActions } from '@/hooks/useProgramActions';
import { useRemoteData } from '@/hooks/useRemoteData';
import { getSessionClients } from '@/lib/auth/clients';
import { messages } from '@/messages/fr';
import { Button, DetailPanel } from '@widoo/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const texts = messages.affiliation.programs;
/** Parameter of the address that holds the program whose detail is open next to the list. */
const openProgramParam = 'programme';

/** A-09, the affiliate programs: the list, and next to it the detail of the one the address names. */
export function ProgramsContainer() {
  const router = useRouter();
  const openId = useSearchParams().get(openProgramParam);
  const programs = useRemoteData('programs', (signal) =>
    getSessionClients().api.getAffiliatePrograms(signal),
  );
  const items = programs.status === 'ready' ? programs.data.items : undefined;
  const openProgram = items?.find((program) => program.id === openId);
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const reload = programs.status === 'loading' ? undefined : programs.reload;
  const toggle = useProgramActions(() => reload?.());

  const showProgram = (programId: string | null) =>
    router.replace(
      programId
        ? `${affiliationPaths.programs}?${new URLSearchParams({ [openProgramParam]: programId }).toString()}`
        : affiliationPaths.programs,
      { scroll: false },
    );

  if (programs.status === 'error') {
    return (
      <PageMessage
        role="alert"
        title={texts.error}
        action={<Button onClick={programs.reload}>{messages.list.retry}</Button>}
      />
    );
  }

  return (
    <div className="flex items-stretch gap-24">
      <div className="flex min-w-0 flex-1 flex-col gap-16">
        <div className="flex flex-wrap items-center gap-16">
          <Button onClick={() => setDialog('create')}>{texts.add}</Button>
          {items ? (
            <p className="text-body-s text-muted-foreground">{texts.total(items.length)}</p>
          ) : null}
        </div>
        {items?.length === 0 ? (
          <PageMessage title={texts.empty.title} text={texts.empty.text} />
        ) : (
          <ProgramsTable
            items={items ?? []}
            isLoading={programs.status === 'loading'}
            openId={openId}
            onOpen={(program) => showProgram(program.id)}
          />
        )}
      </div>
      {openProgram ? (
        <DetailPanel
          key={openProgram.id}
          title={openProgram.name}
          closeLabel={messages.confirm.close}
          onClose={() => showProgram(null)}
          actions={
            <ProgramActions
              isActive={openProgram.isActive}
              onEdit={() => setDialog('edit')}
              onToggleActive={() =>
                void toggle.update(openProgram.id, { isActive: !openProgram.isActive })
              }
              isBusy={toggle.isBusy}
            />
          }
        >
          <ProgramPanelContent program={openProgram} />
        </DetailPanel>
      ) : null}
      {dialog ? (
        <ProgramFormContainer
          program={dialog === 'edit' ? (openProgram ?? null) : null}
          onClose={() => setDialog(null)}
          onSaved={() => reload?.()}
        />
      ) : null}
    </div>
  );
}
