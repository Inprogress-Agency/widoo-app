import type { AffiliateProgram, AffiliateProgramInput, AffiliateProgramPatch } from '@widoo/shared';

/** A program as the form holds it: everything is text until it is saved. */
export type ProgramFormValues = {
  name: string;
  network: string;
  /** Empty for no note. */
  commissionNote: string;
  cookieDays: string;
  isActive: boolean;
};

/** The form of a new program: active, a month of cookie. */
export const emptyProgramForm: ProgramFormValues = {
  name: '',
  network: '',
  commissionNote: '',
  cookieDays: '30',
  isActive: true,
};

/** The form filled with an existing program. */
export function programFormOf(program: AffiliateProgram): ProgramFormValues {
  return {
    name: program.name,
    network: program.network,
    commissionNote: program.commissionNote ?? '',
    cookieDays: String(program.cookieDays),
    isActive: program.isActive,
  };
}

/** The whole number of days typed, or null for anything else. The API holds it to 0 to 365. */
const daysOf = (text: string): number | null =>
  /^\d{1,3}$/.test(text.trim()) ? Number(text.trim()) : null;

/** What to send to create a program, or null while the cookie cannot be read as days. */
export function programInputOf(values: ProgramFormValues): AffiliateProgramInput | null {
  const cookieDays = daysOf(values.cookieDays);
  if (cookieDays === null) {
    return null;
  }
  return {
    name: values.name.trim(),
    network: values.network.trim(),
    commissionNote: values.commissionNote.trim() || null,
    cookieDays,
    isActive: values.isActive,
  };
}

/** The fields of the form that differ from the program: only those are sent to change it. */
export function programPatchOf(
  program: AffiliateProgram,
  values: ProgramFormValues,
): AffiliateProgramPatch | null {
  const input = programInputOf(values);
  if (!input) {
    return null;
  }
  const patch: AffiliateProgramPatch = {};
  if (input.name !== program.name) patch.name = input.name;
  if (input.network !== program.network) patch.network = input.network;
  if (input.commissionNote !== program.commissionNote) patch.commissionNote = input.commissionNote;
  if (input.cookieDays !== program.cookieDays) patch.cookieDays = input.cookieDays;
  if (input.isActive !== program.isActive) patch.isActive = input.isActive;
  return patch;
}
