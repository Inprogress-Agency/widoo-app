/**
 * Where a photo comes from (`media.source`, D-050): sent by its author, or a free photo of
 * Wikimedia Commons, whose credit (author, licence, source page) is shown wherever it appears.
 * Technical only: the credit is the visible part, never the key.
 */
export const mediaSources = ['upload', 'commons'] as const;
export type MediaSource = (typeof mediaSources)[number];
