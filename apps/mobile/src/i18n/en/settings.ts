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
} satisfies Pick<Translation, 'notifications'>;
