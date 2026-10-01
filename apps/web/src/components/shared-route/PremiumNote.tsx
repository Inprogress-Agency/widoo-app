import { CrownSimpleIcon } from '@phosphor-icons/react/ssr';

/**
 * How to open a Premium route (E-21, D-074): a rule, then the crown and « Parcours Premium :
 * toutes ses étapes dans l'app… » (14/20, `muted`).
 */
export function PremiumNote({ text }: { text: string }) {
  return (
    <p className="flex gap-10 border-t border-line pt-12 text-body-s text-muted">
      {/* Centred on the first line of the text (20 px). */}
      <span aria-hidden className="flex h-20 shrink-0 items-center">
        <CrownSimpleIcon weight="fill" className="size-icon-s text-amber" />
      </span>
      {text}
    </p>
  );
}
