import { messages } from '@/messages/fr';
import type { PickedRoute } from '@/lib/partner-routes';
import { ArrowDownIcon, ArrowUpIcon, XIcon } from '@phosphor-icons/react/dist/ssr';
import { maxPartnerRoutes, minPartnerRoutes, type CatalogRoute } from '@widoo/shared';
import { Button, ConfirmDialog, SearchInput } from '@widoo/ui';

const texts = messages.b2b.routesDialog;

type PartnerRoutesDialogProps = {
  isOpen: boolean;
  /** The routes chosen, in the order of the page. */
  picked: PickedRoute[];
  /** Published routes that match the search; undefined while they load. */
  results: CatalogRoute[] | undefined;
  onSearchChange: (search: string) => void;
  onAdd: (route: PickedRoute) => void;
  onRemove: (routeId: string) => void;
  onMove: (routeId: string, direction: -1 | 1) => void;
  /** The choice holds 3 to 10 routes. */
  isComplete: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
};

/** « Choisir les parcours »: 3 to 10 published routes, in the order of the page of the partner. */
export function PartnerRoutesDialog({
  isOpen,
  picked,
  results,
  onSearchChange,
  onAdd,
  onRemove,
  onMove,
  isComplete,
  onCancel,
  onConfirm,
  isBusy,
}: PartnerRoutesDialogProps) {
  const isFull = picked.length >= maxPartnerRoutes;
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={texts.title}
      description={texts.description(minPartnerRoutes, maxPartnerRoutes)}
      cancelLabel={messages.confirm.cancel}
      closeLabel={messages.confirm.close}
      confirmLabel={texts.confirm}
      confirmVariant="primary"
      isBusy={isBusy}
      isConfirmDisabled={!isComplete}
    >
      <section className="flex flex-col gap-8">
        <h3 className="text-label-strong">{texts.chosen(picked.length)}</h3>
        {picked.length === 0 ? (
          <p className="text-body-s text-muted-foreground">{texts.noneChosen}</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {picked.map((route, index) => (
              <li key={route.id} className="flex items-center gap-8 text-body-s">
                <span className="w-24 shrink-0 text-muted-foreground">{index + 1}.</span>
                <span className="min-w-0 flex-1 break-words">{route.title}</span>
                <Button
                  size="small"
                  variant="secondary"
                  aria-label={texts.moveUp(route.title)}
                  disabled={index === 0}
                  onClick={() => onMove(route.id, -1)}
                >
                  <ArrowUpIcon aria-hidden className="size-16" />
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  aria-label={texts.moveDown(route.title)}
                  disabled={index === picked.length - 1}
                  onClick={() => onMove(route.id, 1)}
                >
                  <ArrowDownIcon aria-hidden className="size-16" />
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  aria-label={texts.remove(route.title)}
                  onClick={() => onRemove(route.id)}
                >
                  <XIcon aria-hidden className="size-16" />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="flex flex-col gap-8">
        <h3 className="text-label-strong">{texts.search}</h3>
        <SearchInput
          aria-label={texts.search}
          placeholder={texts.searchPlaceholder}
          onChange={(event) => onSearchChange(event.target.value)}
          // Enter looks for a route, it does not save the choice.
          onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
        />
        {results === undefined ? (
          <p role="status" className="text-body-s text-muted-foreground">
            {texts.searching}
          </p>
        ) : results.length === 0 ? (
          <p className="text-body-s text-muted-foreground">{texts.noResult}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {results.map((route) => {
              const isPicked = picked.some((item) => item.id === route.id);
              return (
                <li key={route.id} className="flex items-center gap-8 text-body-s">
                  <span className="min-w-0 flex-1 break-words">
                    {route.title}
                    <span className="text-label text-muted-foreground"> · {route.cityName}</span>
                  </span>
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={isPicked || isFull}
                    onClick={() => onAdd({ id: route.id, title: route.title })}
                  >
                    {isPicked ? texts.alreadyChosen : texts.add}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </ConfirmDialog>
  );
}
