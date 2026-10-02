import clsx from 'clsx';
import type { ReactNode } from 'react';

/**
 * Photo of a mood as a sticker (E-21 › Envies): white edge, rounded, shadow tinted blue, tilted
 * by `tilt`; it straightens up and rises 4 px on hover, with a mouse only and not with « Réduire
 * les animations ». `photo` sets the height of the photo, `children` is laid on it (the rating).
 * The photo is a light blue, like the one of the sticker of the hero, until the photos are chosen.
 */
export function PhotoSticker({
  tilt,
  photo,
  children,
}: {
  tilt: string;
  photo: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        'relative rounded-idea-phone bg-bg p-7 shadow-idea-phone transition-transform duration-tilt ease-out md:rounded-idea md:p-8 md:shadow-idea',
        'motion-safe:hover-hover:hover:-translate-y-4 motion-safe:hover-hover:hover:rotate-0',
        tilt,
      )}
    >
      <div
        aria-hidden
        className={clsx('rounded-idea-photo-phone bg-blue-soft md:rounded-section', photo)}
      />
      {children}
    </div>
  );
}
