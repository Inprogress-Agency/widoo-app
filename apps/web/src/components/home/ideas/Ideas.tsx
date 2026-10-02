import { SectionHeading } from '@/components/home/SectionHeading';
import type { SiteLocale } from '@/config/locales';
import { describeExampleRoute } from '@/lib/ideas/display';
import { ideaKeys, type IdeaKey, type IdeaRoutes } from '@/lib/ideas/types';
import { localizedPath } from '@/lib/seo';
import type { Messages } from '@/messages';
import { IdeaCard, type IdeaCardLayout } from './IdeaCard';

const photo = 'h-idea-photo-phone md:h-idea-photo-tablet xl:h-idea-photo';

/** Place, tilt and photo of each mood, measured in the source of the mockups (E-21). */
const layouts: Record<IdeaKey, IdeaCardLayout> = {
  romantic: {
    place: 'md:col-span-2 xl:col-span-5 xl:row-span-2',
    tilt: 'rotate-idea-1 xl:rotate-idea-1-xl',
    photo: 'h-idea-photo-phone md:h-idea-photo-large-tablet xl:h-idea-photo-large',
    large: true,
  },
  friends: {
    place: 'xl:col-span-4 xl:col-start-6',
    tilt: 'rotate-idea-2 xl:rotate-idea-2-xl',
    photo,
  },
  freeFamily: {
    place: 'xl:col-span-3 xl:col-start-10',
    tilt: 'rotate-idea-3 xl:rotate-idea-3-xl',
    photo,
  },
  rainy: {
    place: 'xl:col-span-3 xl:col-start-6',
    tilt: 'rotate-idea-4 xl:rotate-idea-4-xl',
    photo,
  },
  fullDay: {
    place: 'xl:col-span-4 xl:col-start-9',
    tilt: 'rotate-idea-5 xl:rotate-idea-5-xl',
    photo,
  },
};

/**
 * « Des idées de sortie pour chaque envie » (E-21), target of « Idées de sortie » in the header:
 * five photo stickers in a blue panel, each with the example route chosen by the team (`routes`,
 * from the API). Phone: one column; tablet: two, the first card across both; computer: an
 * asymmetric grid of twelve columns, the first card on two rows. Laid over the path of the
 * section above.
 */
export function Ideas({
  locale,
  messages,
  routes,
}: {
  locale: SiteLocale;
  messages: Messages;
  routes: IdeaRoutes;
}) {
  const texts = messages.ideas;
  return (
    <section id="idees" aria-labelledby="h-env" className="relative z-10 px-12 md:px-16">
      <div className="rounded-panel-phone bg-blue-soft pb-64 pt-56 max-md:px-16 md:rounded-panel-tablet md:pb-88 md:pt-80 md:max-xl:px-gutter xl:rounded-panel xl:py-112">
        <div className="mx-auto flex flex-col gap-36 md:gap-48 xl:max-w-section xl:gap-64">
          <SectionHeading id="h-env" title={texts.title} lead={texts.lead} />
          <div className="flex flex-col gap-44 md:grid md:grid-cols-2 md:items-start md:gap-x-28 md:gap-y-52 xl:grid-cols-12 xl:gap-x-gutter xl:gap-y-56">
            {ideaKeys.map((key) => {
              const route = routes[key];
              return (
                <IdeaCard
                  key={key}
                  title={texts.moods[key].title}
                  text={texts.moods[key].text}
                  route={
                    route && {
                      href: localizedPath(locale, `/r/${route.id}`),
                      display: describeExampleRoute(route, locale, messages),
                    }
                  }
                  layout={layouts[key]}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
