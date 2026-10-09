// SVG pipeline (pnpm --filter @widoo/mobile svgr): the files of assets/svg/, copied as is from
// the wiki (design/design-system/), become react-native-svg components in src/ui/svg/generated/,
// never edited by hand. Each color of a source becomes a prop, so that the app paints it with a
// token of @widoo/tokens and no color is written by hand in the code.

/** Color of a source file → prop of the component that receives it. */
const colorProps = {
  // avatar-widoo.svg: disc `blue-on-strong`, W in a gradient (tokens.json › firstLaunch.logo).
  '#5A7FCF': 'color',
  '#FAF9F6': 'gradientFrom',
  '#BFD7EA': 'gradientTo',
};

// Every component takes the color props of the pipeline: those its source does not use are ignored.
const template = ({ imports, componentName, jsx }, { tpl }) => tpl`
${imports};

interface Props extends SvgProps {
  /** Width and height, in points. */
  size: number;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

const ${componentName} = ({ size, ...props }: Props) => ${jsx};

export default ${componentName};
`;

module.exports = {
  native: true,
  typescript: true,
  dimensions: false,
  expandProps: 'end',
  svgProps: { width: '{size}', height: '{size}' },
  replaceAttrValues: Object.fromEntries(
    Object.entries(colorProps).map(([hex, prop]) => [hex, `{props.${prop}}`]),
  ),
  template,
  index: false,
  plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
  svgoConfig: {
    plugins: [
      // The viewBox scales one file to every size; ids of gradients and clips stay readable.
      {
        name: 'preset-default',
        params: { overrides: { removeViewBox: false, cleanupIds: false } },
      },
      // react-native-svg has no xmlns prop.
      'removeXMLNS',
    ],
  },
};
