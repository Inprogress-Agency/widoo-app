/**
 * Theme of shadcn/ui for Widoo: each variable of shadcn names the color token of tokens.json it
 * takes its value from (wiki Ecrans › Admin web, « Thème shadcn/ui », validated on 2026-10-09,
 * D-086). No color is written here: the preset reads the values in @widoo/tokens.
 */
const shadcnColorTokens = {
  background: 'bg',
  foreground: 'ink',
  card: 'bg',
  'card-foreground': 'ink',
  popover: 'bg',
  'popover-foreground': 'ink',
  primary: 'blue',
  'primary-foreground': 'on-blue',
  secondary: 'surface',
  'secondary-foreground': 'ink',
  muted: 'surface',
  'muted-foreground': 'muted',
  accent: 'surface',
  'accent-foreground': 'ink',
  destructive: 'error-ink',
  // White on the red of a destructive button, 6.6:1 (board « Contrastes vérifiés »).
  'destructive-foreground': 'bg',
  border: 'line',
  input: 'control-border',
  ring: 'ink',
  sidebar: 'surface',
  'sidebar-foreground': 'ink',
  'sidebar-accent': 'bg',
  'sidebar-accent-foreground': 'ink',
  'sidebar-primary': 'blue',
  'sidebar-primary-foreground': 'on-blue',
  'sidebar-border': 'line',
  'sidebar-ring': 'ink',
};

/** Blocks, tiles, panels and tables: 12 px, the `--radius` of shadcn (`radius-photo`). */
const shadcnRadiusToken = 'photo';

module.exports = { shadcnColorTokens, shadcnRadiusToken };
