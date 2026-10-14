import { router, useLocalSearchParams } from 'expo-router';
import { PublicProfileScreen } from '../../src/creator/PublicProfileScreen';

/** Back where the profile was opened from; to the map when it was opened by a link. */
function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

/**
 * E-16, the public profile of a creator, pushed over the tabs and the route sheet (M-03); `name`
 * and `avatar` are what the card or the sheet knew, shown while it loads.
 */
export default function CreatorRoute() {
  const { id, name, avatar } = useLocalSearchParams<{
    id: string;
    name?: string;
    avatar?: string;
  }>();
  return (
    <PublicProfileScreen
      id={id}
      known={name ? { firstName: name, avatarUrl: avatar ?? null } : null}
      onBack={goBack}
    />
  );
}
