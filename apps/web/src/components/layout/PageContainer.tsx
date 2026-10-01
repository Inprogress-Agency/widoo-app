import type { ReactNode } from 'react';

/**
 * Width of every page of the site: fluid from the phone to the computer (E-21), then held at the
 * width of the mockups of the computer (1440 px) and centred, so that a very wide screen shows the
 * validated layout with white on both sides instead of stretching it.
 */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-page">{children}</div>;
}
