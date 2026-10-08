/**
 * Technical keys of the sections of the results sheet (Ecrans › E-01), as the discovery events
 * send them (wiki Analytics › Découverte): « À proximité », the weather section, « Les Signature
 * Widoo ». A section added to E-01 adds its key here before it is sent. Never shown as a label.
 */
export const discoverySections = ['nearby', 'weather', 'signature'] as const;
export type DiscoverySection = (typeof discoverySections)[number];
