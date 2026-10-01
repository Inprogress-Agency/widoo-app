import type { ReactNode } from 'react';

/**
 * Blue frame of the pages of E-21 (shared link, missing page): rounded, with its double edge,
 * its content in one column. On the computer the content sits on the left, centred in height,
 * over a plan that fills the frame (`backdrop`); on the phone and the tablet the plan follows
 * the content (`below`). The column keeps the width of the tablet mockup (656 px) on any screen
 * up to the computer, so that a wider screen adds plan, not empty space; on the computer it is
 * 540 px wide, 64 px from the frame (measured on the mockups).
 */
export function BlueFrame({
  backdrop,
  below,
  children,
}: {
  backdrop?: ReactNode;
  below?: ReactNode;
  children: ReactNode;
}) {
  return (
    // Measured on E-21: the shell is 6 px wide on the phone, 12 px from the screen (the blue
    // starts at 18 px); 8 px from the tablet, 16 px from the screen. It touches the header.
    <main id="contenu" className="px-18 pb-16 pt-6 md:px-24 md:pb-24 md:pt-8">
      <div className="relative overflow-hidden rounded-sheet bg-blue ring-6 ring-frame-shell md:ring-8 xl:flex xl:min-h-plan-frame xl:items-center">
        {backdrop}
        <div className="relative flex flex-col gap-20 p-20 md:box-content md:max-w-frame-column-tablet md:p-32 xl:w-frame-column xl:shrink-0 xl:pl-frame">
          {children}
        </div>
        {below}
      </div>
    </main>
  );
}
