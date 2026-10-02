import { contactEmail } from '@/config/site';
import type { Messages } from '@/messages';
import { ContactCard } from './ContactCard';
import { FaqItem } from './FaqItem';

/**
 * « Questions fréquentes » (E-21), target of « Questions » in the header: six questions, the
 * first one open, and « Une autre question ? ». The questions come before the contact in the
 * code, so that the keyboard follows the reading (D-070); on the computer the grid lays the
 * contact under the title, on the left.
 */
export function Faq({ texts }: { texts: Messages['faq'] }) {
  return (
    <section
      id="questions"
      aria-labelledby="h-faq"
      className="pb-64 pt-32 max-md:px-12 md:pb-96 md:max-xl:px-gutter xl:pb-128 xl:pt-16"
    >
      <div className="mx-auto flex flex-col gap-20 md:gap-28 xl:grid xl:max-w-section xl:grid-cols-faq xl:grid-rows-faq xl:items-start xl:gap-x-80 xl:gap-y-32">
        <div className="flex flex-col gap-10 max-md:px-4 md:max-w-section-heading-tablet md:gap-14 xl:col-start-1 xl:row-start-1 xl:max-w-full xl:gap-20">
          <h2
            id="h-faq"
            className="text-section-title text-ink md:text-section-title-l xl:text-section-title-xl"
          >
            {texts.title}
          </h2>
          <p className="text-lead-m text-muted md:text-lead-l xl:text-lead-section-xl">
            {texts.lead}
          </p>
        </div>
        <div className="flex flex-col gap-12 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          {texts.items.map((item, index) => (
            <FaqItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              open={index === 0}
            />
          ))}
        </div>
        <div className="xl:col-start-1 xl:row-start-2">
          <ContactCard title={texts.contactTitle} text={texts.contactText} email={contactEmail} />
        </div>
      </div>
    </section>
  );
}
