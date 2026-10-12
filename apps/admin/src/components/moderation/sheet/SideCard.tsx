import type { ReactNode } from 'react';

/** A block of the right column of the sheet, on warm gray: decision, author, history. */
export function SideCard({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-12 rounded-block bg-secondary p-20">
      <div className="flex items-center justify-between gap-8">
        <h3 className="text-title-card">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
