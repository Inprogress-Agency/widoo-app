import { formatCount } from '@/lib/numbers';

export type Figure = {
  label: string;
  value: number;
  /** What the figure counts, under it: « sur les 30 derniers jours ». */
  detail: string;
};

/** Figures side by side on warm gray, separated by a line: figures alone, no chart (A-05). */
export function FigureBand({ figures }: { figures: Figure[] }) {
  return (
    <dl className="grid grid-cols-2 gap-y-16 rounded-photo bg-secondary py-16 lg:grid-cols-4">
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="flex flex-col gap-4 border-l border-border px-20 first:border-l-0"
        >
          <dt className="text-body-s text-muted-foreground">{figure.label}</dt>
          <dd className="text-figure">{formatCount(figure.value)}</dd>
          <dd className="text-body-s text-muted-foreground">{figure.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
