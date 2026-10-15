import type { Translation } from '../translation';

/** English strings shared by the screens: formats, badges, sign-in (E-10) and consent (E-18). */
export const common = {
  // Unbreakable spaces in the written forms: « 7 h » never splits over two lines.
  duration: {
    short: {
      minutes: '{{minutes}} min',
      hours: '{{hours}} h',
      hoursMinutes: '{{hours}} h {{minutes}}',
    },
    spoken: {
      minutes_one: '{{count}} minute',
      minutes_other: '{{count}} minutes',
      hours_one: '{{count}} hour',
      hours_other: '{{count}} hours',
      hoursMinutes_one: '{{count}} hour {{minutes}} minutes',
      hoursMinutes_other: '{{count}} hours {{minutes}} minutes',
    },
  },
  // A screen reader says « 10:35 » well in English: the time as written.
  clock: {
    spoken: {
      time_one: '{{time}}',
      time_other: '{{time}}',
      onTheHour_one: '{{time}}',
      onTheHour_other: '{{time}}',
    },
  },
  budget: {
    amount: '≈ €{{euros}}',
    perPerson: 'per person',
    spoken: 'about {{euros}} euros per person',
    free: 'Free',
  },
  distance: {
    short: {
      meters: '{{count}} m',
      kilometers: '{{value}} km',
    },
    spoken: {
      meters_one: '{{count}} metre',
      meters_other: '{{count}} metres',
      kilometers_one: '{{value}} kilometre',
      kilometers_other: '{{value}} kilometres',
    },
  },
  rating: {
    label: 'Rated {{value}} out of 5',
  },
  favorite: {
    add: 'Add to favourites',
    remove: 'Remove from favourites',
    comingSoon: 'Favourites are coming soon.',
  },
  badges: {
    verified: 'Verified',
    signature: 'Signature',
    premium: 'Premium',
    private: 'Private',
    new: 'New',
    certified: 'Certified creator',
  },
  auth: {
    dialog: 'Sign-in',
    close: 'Close the sign-in',
    intent: {
      favorite: {
        title: 'Sign in to save this route',
        body: 'Your favourites follow you on all your devices.',
      },
      plan: {
        title: 'Sign in to plan this route',
        body: 'Your outings follow you on all your devices.',
      },
      go: {
        title: 'Sign in to start this route',
        body: 'Your outings follow you on all your devices.',
      },
      create: {
        title: 'Sign in to create a route',
        body: 'Your routes follow you on all your devices.',
      },
      signal: {
        title: 'Sign in to report this place',
        body: 'Your report helps the next walkers.',
      },
      profile: {
        title: 'Create your account or sign in',
        body: 'Your favourites and your outings follow you on all your devices.',
      },
    },
    // The label of the Google button says what the Google SDK draws on it.
    google: 'Sign in with Google',
    email: 'Continue with email',
    legal: {
      before: 'By continuing, you accept the ',
      terms: 'terms of use',
      between: ' and the ',
      privacy: 'privacy policy',
      after: ' of Widoo.',
    },
    error: {
      failed: 'The sign-in did not go through. Try again.',
      offline: 'Offline. Try again once connected.',
    },
    back: 'Back to the sign-in choices',
    emailStep: {
      label: 'Email address',
      help: 'We send you a sign-in link. No password to remember.',
      confirmHelp: 'Confirm the address the link was sent to.',
      submit: 'Get the link',
      confirm: 'Continue',
    },
    sent: {
      title: 'Check your email',
      body: 'We sent a sign-in link to',
      hint: 'Open it on this phone. Remember to look in your spam.',
      openMail: 'Open my email app',
      resendIn: 'Resend in {{seconds}} s',
      resendInSpoken: 'Resend in 30 seconds',
      resend: 'Resend the link',
      resent: 'New link sent',
      changeAddress: 'Change address',
      back: 'Back to the email address',
    },
    expired: {
      title: 'This link is no longer valid',
      body: 'It has expired or was already used. Get a new one at {{email}}.',
      bodyNoEmail: 'It has expired or was already used.',
      resend: 'Get a new link',
    },
    welcome: {
      title: 'Welcome to Widoo',
      body: 'Your first name shows on your profile and on your routes.',
      bodyRequired: 'Choose the name shown on your profile and on your routes.',
      label: 'First name or nickname',
      placeholder: 'Your first name or a nickname',
      prefilledGoogle: 'Taken from your Google account. You can use a nickname.',
      submit: 'Continue',
    },
  },
  consent: {
    title: 'Audience measurement',
    body: 'With your consent, Widoo measures how the app is used to improve it, with PostHog, hosted in the European Union. Crash reports are still sent, with no information about you.',
    changeLater: 'You can change your mind in Settings.',
    accept: 'Accept',
    refuse: 'Refuse',
  },
} satisfies Pick<
  Translation,
  | 'duration'
  | 'clock'
  | 'budget'
  | 'distance'
  | 'rating'
  | 'favorite'
  | 'badges'
  | 'auth'
  | 'consent'
>;
