/**
 * Path of « Comment ça marche » (E-21), behind the numbers of the steps, decorative. Computer:
 * it comes in from the left, links the three steps, then goes down along the right edge and under
 * the next section; it draws itself as the page scrolls, drawn at once with « Réduire les
 * animations ». Tablet: a straight line through the numbers that turns down past the column. On
 * the phone, each step draws its own line (`HowStep`). Shape copied from the source of the mockups.
 */
export function HowPath() {
  return (
    <>
      <div
        aria-hidden
        className="absolute left-how-path-left right-how-path-right top-how-path-top hidden h-how-path-tablet rounded-tr-how-path border-r-how-path border-t-how-path border-blue md:block xl:hidden"
      />
      <svg
        aria-hidden
        width="1200"
        height="1240"
        viewBox="0 0 1200 1240"
        className="absolute hidden overflow-visible xl:block"
      >
        <path
          d="M -120 62 L 22 62 C 352 62 452 72 452 222 C 622 222 668 92 858 92 C 1088 92 1260 152 1260 352 L 1260 1220"
          pathLength={1}
          strokeDasharray={1}
          strokeWidth={12}
          strokeLinecap="round"
          className="animate-draw-on-scroll fill-none stroke-blue motion-reduce:animate-none"
        />
      </svg>
    </>
  );
}
