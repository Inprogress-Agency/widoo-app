import type { ReactNode } from 'react';

type DashboardSectionProps = {
  title: string;
  /** On the right of the title: when the figures were read, or a link to another dashboard. */
  aside?: ReactNode;
  children: ReactNode;
};

/** A block of the dashboard: its title, what goes on its right, then its figures. */
export function DashboardSection({ title, aside, children }: DashboardSectionProps) {
  return (
    <section className="flex flex-col gap-12">
      <div className="flex items-center justify-between gap-16">
        <h2 className="text-title-s">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
