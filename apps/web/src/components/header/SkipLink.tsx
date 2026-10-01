/**
 * « Aller au contenu » (E-21, D-070): the first stop of the keyboard, hidden until it has the
 * focus, then shown beside the logo. Leads to the `<main id="contenu">` of the page.
 */
export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#contenu"
      // `not-sr-only` also clears the padding: given back on focus.
      className="sr-only rounded-pill bg-ink text-button text-on-blue focus:not-sr-only focus:px-24 focus:py-12"
    >
      {label}
    </a>
  );
}
