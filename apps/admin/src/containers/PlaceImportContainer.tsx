'use client';

import { catalogPaths } from '@/components/catalog/CatalogTabs';
import { PlaceImportFilePicker } from '@/components/catalog/PlaceImportFilePicker';
import { PlaceImportTable } from '@/components/catalog/PlaceImportTable';
import { BackLink } from '@/components/states/BackLink';
import { usePlaceImport, type PlaceImportFailure } from '@/hooks/usePlaceImport';
import { downloadTextFile } from '@/lib/download';
import { countPlaceImportLines, placeImportTemplate } from '@/lib/place-import';
import { messages } from '@/messages/fr';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr';
import { Button, Notice } from '@widoo/ui';
import Link from 'next/link';

const texts = messages.catalog.places.import;

const failureText = (failure: PlaceImportFailure) =>
  failure.reason === 'columns'
    ? texts.errors.columns(failure.missing.join(', '))
    : texts.errors[failure.reason];

/**
 * A-04, the import of places from a CSV file, for admins: the file is chosen, every line is
 * shown with what it would become, and the lines that are ready are created on confirmation.
 */
export function PlaceImportContainer() {
  const { state, failure, isBusy, handleFile, handleConfirm, handleReset } = usePlaceImport();

  const renderStep = () => {
    if (state.step === 'pick') {
      return (
        <PlaceImportFilePicker
          onFile={handleFile}
          onDownloadTemplate={() =>
            downloadTextFile(texts.templateFileName, placeImportTemplate, 'text/csv;charset=utf-8')
          }
          isBusy={isBusy}
        />
      );
    }
    const isDone = state.step === 'done';
    const kept = countPlaceImportLines(state.lines, isDone ? 'created' : 'ready');
    const setAside = state.lines.length - kept;
    return (
      <>
        <div className="flex flex-wrap items-center gap-16">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <p className="text-title-s" role="status">
              {isDone ? texts.summary.done(kept) : texts.summary.preview(kept)},{' '}
              {texts.setAside(setAside)}
            </p>
            <p className="truncate text-label text-muted-foreground">{state.fileName}</p>
          </div>
          <Button variant="outline" onClick={handleReset} disabled={isBusy}>
            {texts.another}
          </Button>
          {isDone ? (
            <Button asChild>
              <Link href={catalogPaths.places}>{texts.backToList}</Link>
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={isBusy || kept === 0}>
              {isBusy ? texts.creating : texts.confirm(kept)}
            </Button>
          )}
        </div>
        <PlaceImportTable lines={state.lines} />
      </>
    );
  };

  return (
    <div className="flex flex-col gap-20">
      <BackLink href={catalogPaths.places} label={messages.catalog.places.form.back} />
      <h2 className="text-title-xl">{texts.title}</h2>
      {failure ? (
        <Notice
          tone="error"
          role="alert"
          icon={<WarningCircleIcon aria-hidden weight="fill" className="size-20 shrink-0" />}
        >
          <p>{failureText(failure)}</p>
        </Notice>
      ) : null}
      {renderStep()}
    </div>
  );
}
