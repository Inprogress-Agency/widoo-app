// One import per weight: the package root would bundle all 14 font files.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { fontFamilies, type FontWeight } from '@widoo/tokens';

/** Plus Jakarta Sans (OFL licence), one file per weight of tokens.json. */
const files: Record<FontWeight, number> = {
  '400': PlusJakartaSans_400Regular,
  '500': PlusJakartaSans_500Medium,
  '600': PlusJakartaSans_600SemiBold,
  '700': PlusJakartaSans_700Bold,
  '800': PlusJakartaSans_800ExtraBold,
};

/** Fonts loaded at startup, under the names the text styles of tokens.json use. */
export const fonts = Object.fromEntries(
  Object.entries(files).map(([weight, file]) => [fontFamilies[weight as FontWeight], file]),
);
