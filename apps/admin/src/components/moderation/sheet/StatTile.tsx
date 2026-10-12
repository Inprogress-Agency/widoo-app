/** A figure of the route on warm gray, with its name above: « Durée », « 7 h ». */
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-photo bg-secondary px-12 py-10">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="text-number-m">{value}</dd>
    </div>
  );
}
