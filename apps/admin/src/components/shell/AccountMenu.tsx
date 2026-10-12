import { messages } from '@/messages/fr';
import { CaretDownIcon, SignOutIcon } from '@phosphor-icons/react/dist/ssr';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  InitialAvatar,
} from '@widoo/ui';

type AccountMenuProps = {
  /** First name of the member, or the address when the account has none. */
  name: string;
  email: string | null;
  /** Role as the team reads it: « Admin », « Modérateur », « Éditeur ». */
  roleLabel: string;
  onSignOut: () => void;
};

/** The account, on the right of the header: initial, name and role, opening the sign-out menu. */
export function AccountMenu({ name, email, roleLabel, onSignOut }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${messages.shell.account} : ${name}, ${roleLabel}`}
        className="flex min-h-touch-min shrink-0 items-center gap-10 rounded-pill bg-secondary py-4 pl-6 pr-12 text-left"
      >
        <InitialAvatar name={name} />
        {/* Below 640 px the initial alone: the name and the role stay in the label and the menu. */}
        <span className="hidden flex-col sm:flex">
          <span className="text-control">{name}</span>
          <span className="text-caption text-muted-foreground">{roleLabel}</span>
        </span>
        <CaretDownIcon aria-hidden className="size-16 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-tooltip-min-w">
        <div className="flex flex-col items-start gap-6 px-12 py-8">
          <span className="text-control">{name}</span>
          {email ? <span className="text-body-s text-muted-foreground">{email}</span> : null}
          <span className="rounded-pill bg-blue-soft px-8 py-4 text-status text-blue-ink">
            {roleLabel}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <SignOutIcon aria-hidden className="size-18" />
          {messages.shell.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
