import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TabBar } from '../../src/components/TabBar';
import { ModalSheetShield } from '../../src/ui/ModalSheetShield';

/**
 * The three tabs of the wiki Ecrans page: Accueil (E-01), Parcours (E-08), Profil (E-09). The
 * tab bar floats over the screens, which keep their content above it.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => (
        // A modal sheet, such as « Trier par », covers them: hidden from screen readers meanwhile.
        <ModalSheetShield>
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
