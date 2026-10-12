import {
  ChatCircleDotsIcon,
  ClockCounterClockwiseIcon,
  FlagIcon,
  HandshakeIcon,
  LinkSimpleIcon,
  MagicWandIcon,
  MapTrifoldIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
  TranslateIcon,
  UsersIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { AdminSection } from '@widoo/shared';

/** Phosphor icon of each section, the ones of the board « Coque » (wiki Ecrans › Admin web). */
export const sectionIcons: Record<AdminSection, Icon> = {
  dashboard: SquaresFourIcon,
  moderation: ShieldCheckIcon,
  reports: FlagIcon,
  support: ChatCircleDotsIcon,
  catalog: MapTrifoldIcon,
  aiDrafts: MagicWandIcon,
  translations: TranslateIcon,
  users: UsersIcon,
  affiliation: LinkSimpleIcon,
  b2bClients: HandshakeIcon,
  settings: SlidersHorizontalIcon,
  actionLog: ClockCounterClockwiseIcon,
};
