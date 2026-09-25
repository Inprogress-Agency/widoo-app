// NativeWind compiles `className` into styles: its JSX runtime replaces React's, and its Babel
// preset brings the Reanimated (Worklets) plugin that babel-preset-expo would otherwise add.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
