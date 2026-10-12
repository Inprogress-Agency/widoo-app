import { notFound } from 'next/navigation';

/** Any other address under the shell: the missing page, shown inside the shell. */
export default function UnknownPage() {
  notFound();
}
