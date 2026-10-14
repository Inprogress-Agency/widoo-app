import type { RouteCard } from '@widoo/shared';
import { router } from 'expo-router';
import { analytics } from '../analytics';

/** Where a public profile is opened from: « Par Camille » on a card, the creator box of a sheet. */
export type CreatorProfileSource = 'card' | 'route';

type Author = NonNullable<RouteCard['author']>;

/** The page of a public profile, with what is known of the creator for its loading. */
export function creatorHref(author: Author) {
  return {
    pathname: '/creator/[id]' as const,
    params: {
      id: author.id,
      name: author.firstName,
      ...(author.avatarUrl ? { avatar: author.avatarUrl } : {}),
    },
  };
}

/**
 * The public profile of a creator (E-16), pushed (M-03), with `creator_profile_opened`. A route
 * whose creator is not public has no `author` (« Membre Widoo »): there is nothing to open.
 */
export function openCreatorProfile(author: Author, source: CreatorProfileSource) {
  analytics.track('creator_profile_opened', { creator_id: author.id, source });
  router.push(creatorHref(author));
}
