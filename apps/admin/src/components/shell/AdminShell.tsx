import type { ReactNode } from 'react';

type AdminShellProps = {
  /** The navigation, on the left. */
  sidebar: ReactNode;
  /** Title of the page, in the header of 64 px. */
  title: string;
  /** The account, on the right of the header. */
  account: ReactNode;
  children: ReactNode;
};

/** Frame of every page of the admin: navigation on the left, header, then the page. */
export function AdminShell({ sidebar, title, account, children }: AdminShellProps) {
  return (
    <div className="flex h-screen">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-header shrink-0 items-center justify-between gap-16 border-b border-border px-24">
          <h1 className="min-w-0 truncate text-title-l">{title}</h1>
          {account}
        </header>
        <main className="flex-1 overflow-y-auto p-24">{children}</main>
      </div>
    </div>
  );
}
