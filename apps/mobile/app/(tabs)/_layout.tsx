import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Text, type ColorValue } from 'react-native';

function icon(name: SymbolViewProps['name']) {
  return ({ color }: { color: ColorValue }) => (
    <SymbolView name={name} size={24} tintColor={color} />
  );
}

// Dense component: labels follow the system text size up to 1.3× (Direction-Artistique).
function label({ color, children }: { color: ColorValue; children: string }) {
  return (
    <Text maxFontSizeMultiplier={1.3} style={{ color, fontSize: 12 }}>
      {children}
    </Text>
  );
}

/** The three tabs of the wiki Ecrans page: Accueil (E-01), Parcours (E-08), Profil (E-09). */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarLabel: label }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: icon({ ios: 'house.fill', android: 'home' }),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{ title: t('tabs.routes'), tabBarIcon: icon({ ios: 'map.fill', android: 'map' }) }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: icon({ ios: 'person.fill', android: 'person' }),
        }}
      />
    </Tabs>
  );
}
