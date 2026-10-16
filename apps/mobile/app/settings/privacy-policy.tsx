import { useLocalSearchParams } from 'expo-router';
import { LegalScreen } from '../../src/legal/LegalScreen';

/**
 * Réglages › Politique de confidentialité (E-19), in a native page; also opened from the
 * « Mesure d'audience » sheet of the home (`from=home`, E-18), which its back button names.
 */
export default function PrivacyPolicyRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  return <LegalScreen doc="privacy" backTo={from === 'home' ? 'home' : 'settings'} />;
}
