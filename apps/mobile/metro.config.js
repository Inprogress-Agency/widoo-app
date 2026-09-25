const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// `global.css` holds the Tailwind directives; NativeWind turns the classes it finds into styles.
module.exports = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' });
