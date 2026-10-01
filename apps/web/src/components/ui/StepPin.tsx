import type { PlaceCategory } from '@widoo/shared';
import { placeCategories } from '@widoo/tokens';
import clsx from 'clsx';
import { CategoryIcon } from './CategoryIcon';

type Family = (typeof placeCategories)[PlaceCategory]['family'];

/** Color of each activity family, written in full so that Tailwind keeps the classes. */
const familyBackground: Record<Family, string> = {
  food: 'bg-family-food',
  culture: 'bg-family-culture',
  nature: 'bg-family-nature',
  shop: 'bg-family-shop',
  leisure: 'bg-family-leisure',
  other: 'bg-family-other',
};

/**
 * Pin of a step (E-01 › Étapes sur la carte): disc in the color of its family, white border
 * around it (outside the disc, as on the mockups of E-21), white icon of its category.
 * Decorative: the name of the step is written next to it.
 */
export function StepPin({
  category,
  small = false,
  className,
}: {
  category: PlaceCategory;
  /** Phone plan (E-21): 24 px disc and 2 px border instead of 34 and 3. */
  small?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        'box-content flex items-center justify-center rounded-pill border-bg text-on-strong',
        small ? 'size-icon-l border-2' : 'size-step-dot-active border-pin',
        familyBackground[placeCategories[category].family],
        className,
      )}
    >
      <CategoryIcon category={category} className={small ? 'size-12' : 'size-icon-s'} />
    </span>
  );
}
