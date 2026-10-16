import type { Translation } from '../translation';

/** E-08, my routes (D-035, D-038). */
export const routes = {
  routes: {
    title: 'Routes',
    segments: 'Your routes',
    segmentSpoken: '{{label}}, {{position}} of {{total}}',
    segment: {
      upcoming: 'Upcoming',
      favorites: 'Favourites',
      past: 'Past',
      created: 'Created',
    },
    offline: 'Offline, your routes as kept on the phone',
    error: {
      title: 'Your routes are not loading',
      body: 'Check the connection, then try again.',
      retry: 'Try again',
    },
    signedOut: {
      title: 'Your outings, all in one place',
      free: 'The account is free.',
      plan: { title: 'Plan with reminders', body: 'The day before and on the day.' },
      favorites: { title: 'Your favourites', body: 'On all your devices.' },
      past: { title: 'Your routes done and rated', body: 'To remember them.' },
      signIn: 'Create an account or sign in',
    },
    upcoming: {
      badge: '{{day}}, {{time}}',
      window: '{{day}}, {{start}} to about {{end}}',
      windowSpoken: '{{day}}, from {{start}} to about {{end}}',
      toPrepare_one: '{{count}} thing to prepare',
      toPrepare_other: '{{count}} things to prepare',
      go: "Let's go",
      goSpoken: "Let's go, {{title}}",
      later: 'Later',
      line: '{{day}}, {{time}}',
      empty: {
        title: 'No outing planned',
        body: 'Plan a route from its page: it will wait for you here.',
        discover: 'Discover routes',
      },
    },
    // « Votre sortie », pushed from « À venir » (D-035, D-038).
    outing: {
      title: 'Your outing',
      back: 'Back',
      hours: 'Start {{start}}, ends around {{end}}',
      change: 'Change',
      changeSpoken: 'Change the date',
      seeRoute: 'See the route page',
      cancel: 'Cancel the outing',
      cancelAlert: {
        title: 'Cancel the outing?',
        body: 'The reminders will be removed. You can plan it again from the route page.',
        confirm: 'Cancel the outing',
        keep: 'Keep',
      },
      toast: {
        cancelled: 'Outing cancelled',
        restore: 'Restore',
        restored: 'Outing restored',
        cancelFailed: 'The outing could not be cancelled',
        restoreFailed: 'The outing could not be restored',
        failedBody: 'Check the connection, then try again.',
        checkFailed: 'The box could not be saved',
      },
      error: {
        title: 'Your outing is not loading',
        body: 'Check the connection, then try again.',
        retry: 'Try again',
      },
      gone: {
        title: 'This outing is no longer upcoming',
        body: 'Find your outings in Routes.',
      },
    },
    favorites: {
      empty: {
        title: 'No favourites yet',
        body: 'Favourites are coming soon: the heart of a route page will keep them here.',
      },
    },
    past: {
      done: 'Done on {{day}}',
      planned: 'Planned for {{day}}',
      myRating: 'Your rating, {{label}}',
      myRatingSpoken: 'Your rating, {{rating}} out of 5, {{label}}',
      rate: 'Rate',
      rateSpoken: 'Rate, {{title}}',
      relaunch: 'Restart',
      relaunchSpoken: 'Restart, {{title}}',
      reschedule: 'Reschedule',
      rescheduleSpoken: 'Reschedule, {{title}}',
      stopped: 'Stopped',
      missed: 'Not done',
      empty: {
        title: 'No route done',
        body: 'Your finished outings will show here, with your rating.',
      },
    },
    created: {
      untitled: 'New route',
      status: {
        draft: 'Draft',
        pending: 'In review',
        published: 'Published',
        toFix: 'To fix',
        private: 'Private',
        rejected: 'Rejected',
        unpublished: 'Withdrawn',
      },
      edited: {
        today: 'Edited today',
        yesterday: 'Edited yesterday',
        daysAgo: 'Edited {{count}} days ago',
      },
      privateLink: 'Visible by link only',
      steps_one: '{{count}} stop',
      steps_other: '{{count}} stops',
      empty: {
        title: 'No route created yet',
        body: 'Your creations will show here, with their status.',
      },
    },
  },
} satisfies Pick<Translation, 'routes'>;
