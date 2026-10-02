/**
 * Number of a step of « Comment ça marche » (E-21): a blue disc with a white halo, 5 px on the
 * phone, 6 px from the tablet, laid over the path. Hidden from screen readers: the list numbers
 * the steps.
 */
export function StepNumber({ value }: { value: number }) {
  return (
    <span
      aria-hidden
      className="relative flex size-disc shrink-0 items-center justify-center rounded-pill bg-blue text-step-number text-on-blue ring-5 ring-bg md:ring-6"
    >
      {value}
    </span>
  );
}
