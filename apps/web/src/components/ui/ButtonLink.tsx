import Link from 'next/link';

/**
 * White button on the blue frame (E-21: « Ouvrir dans l'app », « Voir les idées de sortie »):
 * pill, blue ink text, 52 px high.
 */
export const whiteButton =
  'block rounded-pill bg-bg px-32 py-16 text-center text-button-l text-blue-ink';

/** A link of the site drawn as the white button. */
export function ButtonLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: string;
}) {
  return (
    <Link href={href} className={className ? `${whiteButton} ${className}` : whiteButton}>
      {children}
    </Link>
  );
}
