import type { Messages } from '@/messages';

type Props = {
  messages: Messages;
};

/** Home page of the site (E-21). The sections arrive with #236 to #238. */
export function HomeContainer({ messages }: Props) {
  return (
    <main id="contenu" className="px-24 py-32">
      <h1 className="font-extrabold">{messages.home.title}</h1>
      <p className="mt-12 text-muted">{messages.home.tagline}</p>
    </main>
  );
}
