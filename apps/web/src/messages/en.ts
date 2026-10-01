import type { Messages } from './fr';

// Texts of the site in English. Draft translation, to be proofread by the project lead (#233).
export const en: Messages = {
  meta: {
    home: {
      title: 'What to do in Paris? Outing ideas and walks | Widoo',
      description:
        'Ready-to-go outing ideas in Paris: walks, romantic, family or free outings, with duration, budget and opening hours. Free app.',
    },
    notFound: {
      title: 'Page not found | Widoo',
    },
  },
  home: {
    title: 'What to do in Paris today?',
    tagline:
      'Outing ideas in Paris, ready to go: the stops, the duration, the budget and the opening hours.',
  },
  notFound: {
    title: 'This page does not exist',
    body: 'The link may be incomplete, or the page may have moved.',
    home: 'Back to the home page',
  },
  error: {
    title: 'Something went wrong',
    body: 'The page could not be displayed. Try again in a moment.',
    retry: 'Try again',
  },
  sharedRoute: {
    heading: 'Someone shared this route with you',
    openInApp: 'Open in the app',
    openInAppHint:
      'Without the app, the button takes you to the store: the route will open once installed.',
    scanHint: 'Scan to open it on your phone. Without the app, the route will open once installed.',
    qrLabel: 'QR code of the link to this route',
    photoLabel: 'Photo of the route {title}',
    byWidoo: 'By Widoo',
    byMember: 'By {name}',
    private: 'Private',
    premium: 'Premium',
    premiumNote:
      'Premium route: all its steps in the app, with a pass, a subscription or this route alone.',
    sharedBy: 'Shared by {name}, visible only with the link',
    reviews: '({count} reviews)',
    ratingSpoken: 'Rated {rating} out of 5, {count} reviews',
    free: 'Free',
    budgetSpoken: 'about {amount} per person',
    steps: { one: '{count} stop', other: '{count} stops' },
    tiles: { duration: 'Duration', budget: 'Per pers.', distance: 'Distance', steps: 'Stops' },
    removedTitle: 'This route is no longer available',
    removedBody: 'Its creator removed it on {date}. More routes are waiting for you in the app.',
    removedBodyUndated: 'Its creator removed it. More routes are waiting for you in the app.',
    metaTitle: '{title} | Widoo',
    metaDescription: '{details}. A route to open in the Widoo app.',
    previewTagline: 'Ready-made outings in Paris',
  },
  plan: {
    walk: '{minutes} min walk',
  },
  // Text alternatives of the official badges (the badges carry their own text).
  stores: {
    appStore: 'Download on the App Store',
    googlePlay: 'Get it on Google Play',
  },
  placeCategories: {
    restaurant: 'Restaurant',
    cafe: 'Café',
    bar: 'Bar',
    bakery: 'Bakery',
    museum: 'Museum',
    gallery: 'Gallery',
    monument: 'Monument',
    park: 'Park',
    viewpoint: 'Viewpoint',
    shop: 'Shop',
    activity: 'Activity',
    event_venue: 'Show',
    walk: 'Walk',
    other: 'Other',
  },
  moods: {
    culture: 'Culture',
    nature: 'Nature',
    shopping: 'Shopping',
    food: 'Food',
    romantic: 'Romantic',
    unusual: 'Unusual',
    instagrammable: 'Instagrammable',
    relax: 'Relaxing',
    sport: 'Active',
  },
  structuredData: {
    appDescription:
      'Ready-made outings in Paris: the stops, the duration, the budget and the opening hours.',
  },
};
