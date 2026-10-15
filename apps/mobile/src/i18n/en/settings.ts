import type { Translation } from '../translation';

/** English strings of the pages of the Réglages (E-19) and of the update screens (E-20). */
export const settings = {
  notifications: {
    title: 'Notifications',
    back: 'Back to the settings',
    intro: 'Choose what Widoo may send you.',
    reminders: {
      label: 'Outing reminders',
      help: 'The day before at 18:00 and one hour before you set off.',
    },
    nextDay: {
      label: 'The day after an outing',
      help: 'To rate an outing left open.',
    },
    myRoutes: {
      label: 'Your routes and reports',
      help: 'Publication, changes requested, what came of your reports.',
    },
    phoneOff: "Notifications are turned off in the phone's settings.",
    openSettings: 'Open settings',
    error: 'Could not save',
    errorBody: 'Try again in a moment.',
  },
  legal: {
    back: 'Back to the settings',
    updated: 'Updated on {{date}}',
    summary: 'In short',
  },
  help: {
    title: 'Help and contact',
    back: 'Back to the settings',
    faq: 'Frequent questions',
    planQuestion: 'How do I plan an outing?',
    planAnswer:
      'On the sheet of a route, tap "Plan", choose the day and the time you set off. We remind you the day before at 18:00 and one hour before.',
    premiumQuestion: 'Why are some routes Premium?',
    premiumAnswer:
      'They are routes crafted with more care, which keep Widoo going. They open with the Premium subscription, a 7-day pass, or one by one.',
    closedPlaceQuestion: 'A place is closed, what can I do?',
    closedPlaceAnswer:
      'Tell us with "Write to us", subject "Problem": we check and let the creator of the route know.',
    deleteAccountQuestion: 'How do I delete my account?',
    deleteAccountAnswer:
      'In the settings, at the very bottom: "Delete my account". Your published routes stay online, signed "Widoo member".',
    writeTitle: 'Write to us',
    writeBody: 'A question, a problem, an idea? We answer by e-mail.',
    write: 'Write to us',
  },
} satisfies Pick<Translation, 'notifications' | 'legal' | 'help'>;
