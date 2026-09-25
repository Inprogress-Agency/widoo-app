import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ConsentBanner } from '../../src/components/ConsentBanner';
import { TabBar } from '../../src/components/TabBar';
import { ModalSheetShield } from '../../src/ui/ModalSheetShield';

/**
 * The three tabs of the wiki Ecrans page: Accueil (E-01), Parcours (E-08), Profil (E-09). The
 * consent banner sits above the tab bar, pushing the screen up rather than covering it.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => (
        // A modal sheet, such as « Trier par », covers them: hidden from screen readers meanwhile.
        <ModalSheetShield>
          <ConsentBanner />
          <TabBar {...props} />
        </ModalSheetShield>
      )}
      screenOptions={{ headerShown: false }}
    >
      {/* Accueil is a stack: « Voir tout » pushes over the map and its sheet (E-04). */}
      <Tabs.Screen name="(home)" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="routes" options={{ title: t('tabs.routes') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
