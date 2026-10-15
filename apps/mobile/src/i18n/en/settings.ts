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
  contact: {
    title: 'Write to us',
    back: 'Back to help',
    topic: 'Subject',
    topics: { question: 'Question', problem: 'Problem', data: 'Data', other: 'Other' },
    message: 'Message',
    replyEmail: 'Reply e-mail',
    emailInvalid: 'Check the address: it looks incomplete.',
    joined: 'The version of the app and the model of the phone are joined, to help us.',
    offline: 'Offline: your message is kept, send it once you are back online.',
    send: 'Send',
    sent: 'Message sent',
    sentBody: 'We answer by e-mail.',
    error: 'Could not send',
    errorBody: 'Your message is kept.',
    retry: 'Try again',
  },
  privacy: {
    title: 'Privacy',
    back: 'Back to the settings',
    analytics: 'Audience measurement',
    analyticsHelp: 'Helps improve the app.',
    analyticsOn: 'Audience measurement on',
    analyticsOff: 'Audience measurement off',
    analyticsOffBody: 'No usage data is sent any more.',
    withoutAccount:
      'Without an account, Widoo keeps no profile about you: your settings stay on this phone.',
    yourData: 'Your data',
    yourDataBody:
      'A file with your profile, your favourites, your outings and the routes you created.',
    download: 'Download my data',
    preparing: 'Preparing the file…',
    offline: 'Offline: reconnect to download your data.',
    exportError: 'Could not download',
    exportErrorBody: 'Try again in a moment.',
    retry: 'Try again',
    learnMore: 'Learn more',
    writeAboutData: 'Write to us about your data',
  },
} satisfies Pick<Translation, 'notifications' | 'legal' | 'help' | 'contact' | 'privacy'>;
