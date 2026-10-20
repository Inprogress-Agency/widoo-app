type DetailPanelSkeletonProps = {
  /** What a screen reader says once, instead of every gray bar: « Chargement de la fiche ». */
  label: string;
};

/**
 * The place of a detail panel while its record loads: same width and edge, gray bars inside. It
 * keeps the list from widening and narrowing again when the person moves from one record to the
 * next.
 */
export function DetailPanelSkeleton({ label }: DetailPanelSkeletonProps) {
  return (
    <aside
      aria-busy
      className="sticky top-0 flex max-h-detail-panel w-detail-panel shrink-0 flex-col gap-16 self-start border-l border-border p-24"
    >
      <p role="status" className="sr-only">
        {label}
      </p>
      <div aria-hidden className="flex flex-col gap-12">
        <span className="block h-16 w-full animate-pulse rounded-pill bg-skeleton" />
        <span className="block h-24 w-full animate-pulse rounded-pill bg-skeleton" />
        <span className="block h-12 w-full animate-pulse rounded-pill bg-skeleton" />
        <span className="block h-12 w-full animate-pulse rounded-pill bg-skeleton" />
        <span className="block h-12 w-full animate-pulse rounded-pill bg-skeleton" />
      </div>
    </aside>
  );
}
