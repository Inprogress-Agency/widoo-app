import type { SupportTopic } from '@widoo/shared';
import { Platform } from 'react-native';
import { createStore } from 'zustand/vanilla';

/** The message of « Nous écrire » being written: kept when sending fails or the app is offline. */
export interface ContactDraft {
  topic: SupportTopic;
  message: string;
  /** Null until the user types one: the address of the account is offered meanwhile. */
  replyEmail: string | null;
}

const emptyDraft: ContactDraft = { topic: 'question', message: '', replyEmail: null };

/** In memory for the session: leaving the page and coming back finds the message again. */
export const contactDraft = createStore<ContactDraft>(() => emptyDraft);

export const clearContactDraft = () => contactDraft.setState(emptyDraft, true);

interface AndroidConstants {
  Brand?: string;
  Model?: string;
  Release?: string;
}

/**
 * The phone joined to the message (« La version de l'app et le modèle du téléphone sont
 * joints »): brand, model and Android version; on iOS, which does not give its model without a
 * native module, the system and its version.
 */
export function deviceDescription(): string {
  if (Platform.OS === 'android') {
    const { Brand, Model, Release } = Platform.constants as AndroidConstants;
    return [[Brand, Model].filter(Boolean).join(' '), `Android ${Release ?? Platform.Version}`]
      .filter(Boolean)
      .join(', ')
      .slice(0, 100);
  }
  return `iPhone, iOS ${String(Platform.Version)}`;
}
