import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ConsentBanner } from '../../src/components/ConsentBanner';
import { TabBar } from '../../src/components/TabBar';

/**
 * The three tabs of the wiki Ecrans page: Accueil (E-01), Parcours (E-08), Profil (E-09). The
 * tab bar floats over the screens; the consent banner floats with it, just above the pill, and
 * the screens keep their content above both.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} accessory={<ConsentBanner />} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="routes" options={{ title: t('tabs.routes') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
