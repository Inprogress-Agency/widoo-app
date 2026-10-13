import { messages } from '@/messages/fr';
import { DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@widoo/ui';
import { useRef } from 'react';

const texts = messages.catalog.places.import;

type PlaceImportFilePickerProps = {
  onFile: (file: File) => void;
  onDownloadTemplate: () => void;
  isBusy: boolean;
};

/** First step of an import: what the file must hold, the template, and the file to choose. */
export function PlaceImportFilePicker({
  onFile,
  onDownloadTemplate,
  isBusy,
}: PlaceImportFilePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-16 rounded-photo border border-border p-20">
      <ul className="flex list-disc flex-col gap-4 pl-20 text-body-s text-muted-foreground">
        {texts.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-12">
        <Button onClick={() => input.current?.click()} disabled={isBusy}>
          <UploadSimpleIcon aria-hidden className="size-18" />
          {isBusy ? texts.reading : texts.choose}
        </Button>
        <Button variant="outline" onClick={onDownloadTemplate}>
          <DownloadSimpleIcon aria-hidden className="size-18" />
          {texts.template}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Emptied so that choosing the same file again, once corrected, is read again.
          event.target.value = '';
          if (file) {
            onFile(file);
          }
        }}
      />
    </div>
  );
}
