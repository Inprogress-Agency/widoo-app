/**
 * Title and text at the top of a section of the home page (E-21): the H2 that names the section
 * (`id`, for its `aria-labelledby`), then the text in `muted`. 34/38 on the phone, 44/48 on the
 * tablet, 52/56 on the computer (measured in the source of the mockups).
 */
export function SectionHeading({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <div className="flex flex-col gap-12 md:max-w-section-heading-tablet md:gap-14 xl:max-w-section-heading xl:gap-16">
      <h2
        id={id}
        className="text-balance text-section-title text-ink md:text-section-title-l xl:text-section-title-xl"
      >
        {title}
      </h2>
      <p className="text-lead-m text-muted md:text-lead-l xl:text-lead-section-xl">{lead}</p>
    </div>
  );
}
