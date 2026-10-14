/** Dates of the export, ISO 8601 UTC like every date of the API. */
export const iso = (date: Date) => date.toISOString();
export const isoOrNull = (date: Date | null) => date?.toISOString() ?? null;
