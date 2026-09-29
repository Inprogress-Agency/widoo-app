import { notFound } from 'next/navigation';

/** Any address with no page under a language: the missing page, in that language, with a 404. */
export default function UnknownPage() {
  notFound();
}
