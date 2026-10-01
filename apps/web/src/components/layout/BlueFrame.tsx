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
    <main id="contenu" className="px-12 py-16 md:px-24 md:py-24">
      <div className="relative overflow-hidden rounded-sheet bg-blue ring-8 ring-blue-soft xl:flex xl:min-h-plan-frame xl:items-center">
        {backdrop}
        <div className="relative flex flex-col gap-20 p-20 md:box-content md:max-w-frame-column-tablet md:p-32 xl:w-frame-column xl:shrink-0 xl:pl-frame">
          {children}
        </div>
        {below}
      </div>
    </main>
  );
}
