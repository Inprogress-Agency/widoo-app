/** « L'essentiel » at the top of a legal text (E-19 › Textes légaux): its sentences in a light box. */
export function LegalSummary({ title, sentences }: { title: string; sentences: string[] }) {
  return (
    <section className="flex flex-col gap-12 rounded-section bg-surface p-24">
      <h2 className="text-step-title text-ink">{title}</h2>
      <ul className="flex list-disc flex-col gap-6 pl-20 text-faq-answer text-ink marker:text-blue">
        {sentences.map((sentence) => (
          <li key={sentence}>{sentence}</li>
        ))}
      </ul>
    </section>
  );
}
