import { toLegalBlocks } from '@/lib/legal/from-api';

/** An article of a legal text: its numbered title, then its paragraphs and lists. */
export function LegalArticle({ title, body }: { title: string; body: string }) {
  return (
    <section className="flex flex-col gap-12">
      <h2 className="text-step-title text-ink xl:text-step-title-xl">{title}</h2>
      {toLegalBlocks(body).map((block, index) =>
        block.kind === 'paragraph' ? (
          <p key={index} className="text-faq-answer text-ink">
            {block.text}
          </p>
        ) : (
          <ul key={index} className="flex list-disc flex-col gap-6 pl-20 text-faq-answer text-ink">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </section>
  );
}
