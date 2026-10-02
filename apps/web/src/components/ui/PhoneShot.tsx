import clsx from 'clsx';

/**
 * A screenshot of the app in its phone (E-21 › Comment ça marche): white edge, rounded, shadow
 * tinted blue, tilted by `tilt`. 196 px wide on the phone, 188 on the tablet, 250 on the computer
 * (232 when `small`). Decorative: the text of the step says the same. The screen is a light blue,
 * like the photo of the sticker of the hero, until the screenshots are chosen.
 */
export function PhoneShot({ tilt, small }: { tilt: string; small?: boolean }) {
  return (
    <div
      aria-hidden
      className={clsx(
        'shrink-0 border border-shot-edge bg-bg',
        'h-shot-phone w-shot-phone rounded-shot-phone p-7 shadow-shot-phone',
        'md:h-shot-tablet md:w-shot-tablet md:rounded-shot-tablet md:p-6 md:shadow-shot-tablet',
        small ? 'xl:h-shot-s xl:w-shot-s xl:rounded-shot-s' : 'xl:h-shot xl:w-shot xl:rounded-shot',
        'xl:p-8 xl:shadow-shot',
        tilt,
      )}
    >
      <div
        className={clsx(
          'size-full rounded-screen-phone bg-blue-soft',
          small ? 'xl:rounded-screen-s' : 'xl:rounded-screen',
        )}
      />
    </div>
  );
}
