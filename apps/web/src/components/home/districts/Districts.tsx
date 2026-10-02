import { SectionHeading } from '@/components/home/SectionHeading';
import type { SiteLocale } from '@/config/locales';
import { districtsByBank, type DistrictKey, type DistrictRoutes } from '@/lib/districts/types';
import { localizedPath } from '@/lib/seo';
import type { Messages } from '@/messages';
import type { Icon } from '@phosphor-icons/react';
import { BooksIcon, FilmSlateIcon } from '@phosphor-icons/react/ssr';
import { AllParisLink } from './AllParisLink';
import { DistrictCard } from './DistrictCard';
import { ParisMap } from './ParisMap';
import { SeineDivider } from './SeineDivider';

/** Place and width of each card on the plan of the computer, and the icon of those without photo. */
const layouts: Record<DistrictKey, { place: string; Icon?: Icon }> = {
  montmartre: { place: 'xl:place-montmartre xl:w-district' },
  buttesChaumont: { place: 'xl:place-buttesChaumont xl:w-district-wide' },
  canalSaintMartin: { place: 'xl:place-canalSaintMartin xl:w-district' },
  passages: { place: 'xl:place-passages xl:w-district' },
  marais: { place: 'xl:place-marais xl:w-district' },
  saintGermain: { place: 'xl:place-saintGermain xl:w-district-wide', Icon: BooksIcon },
  latinQuarter: { place: 'xl:place-latinQuarter xl:w-district', Icon: FilmSlateIcon },
};

const bankPlaces = { right: 'xl:place-bank-right', left: 'xl:place-bank-left' } as const;

/**
 * « Balades à Paris, quartier par quartier » (E-21), target of « Quartiers » in the header. Phone
 * and tablet: the districts by bank, the Seine between the two groups (two columns on the
 * tablet). Computer: each district at its place on a light plan of Paris. Each card leads to the
 * example route of its district (`routes`, from the API).
 */
export function Districts({
  locale,
  texts,
  routes,
}: {
  locale: SiteLocale;
  texts: Messages['districts'];
  routes: DistrictRoutes;
}) {
  const bank = (side: keyof typeof districtsByBank) => (
    <div className="flex flex-col gap-12 md:gap-14 xl:contents">
      <h3 className={`text-bank-label uppercase text-blue-ink max-xl:pl-4 ${bankPlaces[side]}`}>
        {texts.banks[side]}
      </h3>
      <ul className="flex flex-col gap-10 md:grid md:grid-cols-2 md:gap-12 xl:contents">
        {districtsByBank[side].map((key) => {
          const route = routes[key];
          return (
            <DistrictCard
              key={key}
              name={texts.items[key].name}
              text={texts.items[key].text}
              Icon={layouts[key].Icon}
              place={layouts[key].place}
              href={route && localizedPath(locale, `/r/${route}`)}
            />
          );
        })}
      </ul>
    </div>
  );
  return (
    <section
      id="quartiers"
      aria-labelledby="h-q"
      className="pb-48 pt-72 max-md:px-12 md:pb-64 md:pt-96 md:max-xl:px-16 xl:pb-112 xl:pt-128"
    >
      <div className="mx-auto flex flex-col gap-24 md:gap-gutter xl:max-w-section xl:gap-48">
        <div className="max-md:px-4 md:max-xl:px-24">
          <SectionHeading id="h-q" title={texts.title} lead={texts.lead} />
        </div>
        <div className="rounded-map-shell-phone bg-frame-shell p-6 md:rounded-panel md:p-8 xl:shadow-map-edge">
          <div className="flex flex-col gap-14 overflow-hidden rounded-map-phone bg-district-map md:rounded-panel-tablet max-md:px-6 max-md:pb-16 max-md:pt-20 md:max-xl:px-16 md:max-xl:pb-24 md:max-xl:pt-28 xl:relative xl:block xl:h-district-map">
            <ParisMap />
            {bank('right')}
            <SeineDivider />
            {bank('left')}
            <AllParisLink
              href={`${localizedPath(locale, '/')}#telecharger`}
              label={texts.allParis}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
