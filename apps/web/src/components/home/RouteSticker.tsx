import { heroMotion } from '@/config/motion';

/**
 * Sticker of the example route on the plan of the hero (E-21): its photo, white edge, tilted, its
 * title and « 4 étapes en 7 h ». Lands at 2.25 s (E-21 › Mouvement). Decorative: the plan shows
 * the same route. The photo is a light blue until the one of the route is chosen.
 */
export function RouteSticker({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      aria-hidden
      className="animate-land motion-reduce:animate-plan-fade"
      style={{ animationDelay: `${heroMotion.stickerAt}ms` }}
    >
      <div className="w-sticker-tablet rotate-sticker rounded-sheet bg-bg px-7 pb-12 pt-7 shadow-sticker xl:w-sticker">
        <div className="h-sticker-photo-tablet rounded-card bg-blue-soft xl:h-sticker-photo" />
        <p className="mt-10 px-6 text-sticker-title text-ink">{title}</p>
        <p className="px-6 text-label text-muted">{meta}</p>
      </div>
    </div>
  );
}
