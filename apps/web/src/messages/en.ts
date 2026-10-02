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
      title: 'Page not found · Widoo',
    },
  },
  header: {
    skip: 'Skip to content',
    home: 'Widoo, home',
    sections: 'Sections of the page',
    nav: { ideas: 'Outing ideas', districts: 'Neighbourhoods', questions: 'Questions' },
    download: 'Get the app',
    language: 'Language',
  },
  home: {
    title: 'What to do in Paris today?',
    tagline:
      'Outing ideas in Paris, ready to go: the stops, the duration, the budget and the opening hours.',
    reviews: 'Reviews of the app',
    reviewSource: { appStore: 'App Store review', googlePlay: 'Google Play review' },
    ratingSpoken: 'Rated {rating} out of 5',
    stickerMeta: '{steps} in {duration}',
    qrLabel: 'QR code to download the app',
  },
  howItWorks: {
    title: 'Walks in Paris, all ready to go',
    lead: 'A place to see, a café, a street to climb: each route links the stops together. All you have to do is go.',
    steps: [
      {
        title: 'Choose your outing',
        text: 'Duration, budget, distance and stops: everything is shown, and checked on site by those who did it.',
      },
      {
        title: 'Plan it',
        text: 'Pick the day. Widoo tells you exactly {strong}, checks the opening hours and reminds you of the outing the evening before at 6 pm.',
        strong: 'what to bring and what to book',
      },
      {
        title: 'Let yourself be guided',
        text: 'On site, follow the path from one stop to the next, without missing anything on the way.',
      },
    ],
  },
  ideas: {
    title: 'Outing ideas for every mood',
    lead: 'As a couple, with friends, with the family or in the rain: choose by mood, budget and time.',
    moods: {
      romantic: {
        title: 'Romantic outing',
        text: 'A walk by the water, a drink at sunset, a slightly hidden table.',
      },
      friends: {
        title: 'With friends',
        text: 'Thrift shops, foodie spots and terraces, for a long afternoon.',
      },
      freeFamily: {
        title: 'Free and family outings',
        text: 'Parks, viewpoints and open-air games, without spending a thing.',
      },
      rainy: {
        title: 'What to do when it rains',
        text: 'Covered passages, museums and cafés: sheltered routes, made for rainy days.',
      },
      fullDay: {
        title: 'A whole day',
        text: 'From morning to evening, a whole neighbourhood, breaks included.',
      },
    },
    routeMeta: '{duration}, {budget}, {author}',
    free: 'free',
    byWidoo: 'by Widoo',
    byMember: 'by {name}',
  },
  districts: {
    title: 'Walks in Paris, neighbourhood by neighbourhood',
    lead: 'Each neighbourhood has its routes, made by the Widoo team and by the people who live there.',
    banks: { right: 'Right Bank', left: 'Left Bank' },
    allParis: 'All of Paris is in the app',
    items: {
      montmartre: {
        name: 'Montmartre',
        text: 'Stairs, vineyards and workshops, away from the Place du Tertre.',
      },
      buttesChaumont: {
        name: 'Buttes-Chaumont and Belleville',
        text: 'A hillside park and streets climbing up to the viewpoints.',
      },
      canalSaintMartin: {
        name: 'Canal Saint-Martin',
        text: 'Locks, footbridges and picnics by the water.',
      },
      passages: {
        name: 'The covered passages',
        text: 'Galerie Vivienne and its neighbours, to stroll under cover.',
      },
      marais: {
        name: 'Le Marais',
        text: 'Mansions, thrift shops and bakeries, a stone’s throw from each other.',
      },
      saintGermain: {
        name: 'Saint-Germain-des-Prés',
        text: 'Bookshops, galleries and cafés of the Left Bank.',
      },
      latinQuarter: {
        name: 'The Latin Quarter',
        text: 'Lanes, art-house cinemas and the Luxembourg Gardens.',
      },
    },
  },
  faq: {
    title: 'Frequently asked questions',
    lead: 'All you need to know before your first outing.',
    items: [
      {
        question: 'Is Widoo free?',
        answer:
          'Yes. The app is free, free routes open without an account and creating your own routes costs nothing. Premium routes open with a subscription (7-day free trial), a 7-day pass or one by one.',
      },
      {
        question: 'Do I need an account?',
        answer:
          'No, to browse the map and open the free routes. A free account lets you save your favourites, plan an outing and get its reminders.',
      },
      {
        question: 'What is a Widoo route?',
        answer:
          'A ready-made outing: several stops in a row, with the duration, the budget, the distance and the opening hours of each place.',
      },
      {
        question: 'Is the information up to date?',
        answer:
          'Routes are checked on site by those who walk them, and Widoo checks the opening hours when you plan an outing. A place can change without notice: check before booking.',
      },
      {
        question: 'Can I create my own route?',
        answer:
          'Yes, from the app, for free and without limit. Each route is published after a review by the Widoo team.',
      },
      {
        question: 'Is Widoo available outside Paris?',
        answer: 'Not yet: Widoo starts with Paris.',
      },
    ],
    contactTitle: 'Another question?',
    contactText: 'The Widoo team answers by email.',
  },
  banner: {
    title: 'Your next outing starts here',
    lead: 'Free, on iPhone and Android.',
  },
  notFound: {
    title: 'This page does not exist',
    body: 'The address may be incomplete. Outing ideas are waiting for you on the home page and in the app.',
    ideas: 'See the outing ideas',
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
