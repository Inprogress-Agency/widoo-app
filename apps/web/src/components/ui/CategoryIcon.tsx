import type { Icon } from '@phosphor-icons/react';
import {
  BankIcon,
  BreadIcon,
  CastleTurretIcon,
  CoffeeIcon,
  ForkKnifeIcon,
  FrameCornersIcon,
  LightningIcon,
  MapPinIcon,
  MountainsIcon,
  PersonSimpleWalkIcon,
  ShoppingBagIcon,
  TicketIcon,
  TreeIcon,
  WineIcon,
} from '@phosphor-icons/react/ssr';
import type { PlaceCategory } from '@widoo/shared';
import { placeCategories } from '@widoo/tokens';

type CategoryIconName = (typeof placeCategories)[PlaceCategory]['icon'];

/** Web component of each icon that tokens.json gives a place category (same as the app). */
const categoryIcons: Record<CategoryIconName, Icon> = {
  'fork-knife': ForkKnifeIcon,
  coffee: CoffeeIcon,
  wine: WineIcon,
  bread: BreadIcon,
  bank: BankIcon,
  'frame-corners': FrameCornersIcon,
  'castle-turret': CastleTurretIcon,
  tree: TreeIcon,
  mountains: MountainsIcon,
  'person-simple-walk': PersonSimpleWalkIcon,
  'shopping-bag': ShoppingBagIcon,
  lightning: LightningIcon,
  ticket: TicketIcon,
  'map-pin': MapPinIcon,
};

/** Icon of a place category (tokens.json › placeCategories), decorative. */
export function CategoryIcon({
  category,
  className,
}: {
  category: PlaceCategory;
  className?: string;
}) {
  const Component = categoryIcons[placeCategories[category].icon];
  return <Component aria-hidden weight="fill" className={className} />;
}
