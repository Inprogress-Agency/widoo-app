import type {
  B2bClient,
  B2bClientInput,
  B2bClientPatch,
  B2bClientStatus,
  B2bClientType,
} from '@widoo/shared';

/** A partner as the form holds it: everything is text until it is saved. */
export type PartnerFormValues = {
  name: string;
  /** Typed at the creation only: the slug never changes. */
  slug: string;
  type: B2bClientType;
  status: B2bClientStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  /** Euros excluding tax, « 49 » or « 49,50 »; empty while unknown. */
  monthlyPrice: string;
  /** A day, `2026-11-01`; empty until the contract is signed. */
  startedAt: string;
  notes: string;
};

/** The form of a new partner: a prospect, a hotel. */
export const emptyPartnerForm: PartnerFormValues = {
  name: '',
  slug: '',
  type: 'hotel',
  status: 'prospect',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  monthlyPrice: '',
  startedAt: '',
  notes: '',
};

/** Pattern of the price field, as the browser checks it before the form is sent. */
export const monthlyPricePattern = '\\d{1,6}([.,]\\d{1,2})?';

/** The form filled with an existing partner. */
export function partnerFormOf(partner: B2bClient): PartnerFormValues {
  return {
    name: partner.name,
    slug: partner.slug,
    type: partner.type,
    status: partner.status,
    contactName: partner.contactName ?? '',
    contactEmail: partner.contactEmail ?? '',
    contactPhone: partner.contactPhone ?? '',
    address: partner.address ?? '',
    monthlyPrice: partner.monthlyPriceCents === null ? '' : centsToEuros(partner.monthlyPriceCents),
    startedAt: partner.startedAt ?? '',
    notes: partner.notes ?? '',
  };
}

/** The slug a name suggests: lowercase words without accents, joined by hyphens. */
export function slugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 60)
    .replaceAll(/-+$/g, '');
}

/** Cents as euros typed with a comma: 4950 gives « 49,50 », 4900 gives « 49 ». */
export function centsToEuros(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(euros) : `${euros},${String(rest).padStart(2, '0')}`;
}

/**
 * The price typed as cents: « 49 » gives 4900, « 49,5 » 4950, « 49.50 » 4950. Null when nothing
 * is typed, and `'invalid'` for anything else; the whole is read as text, never as a float.
 */
export function eurosToCents(text: string): number | null | 'invalid' {
  const typed = text.trim();
  if (typed === '') {
    return null;
  }
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(typed);
  if (!match) {
    return 'invalid';
  }
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

const textOrNull = (text: string) => text.trim() || null;

/** What to send to register a partner, or null while the price cannot be read. */
export function partnerInputOf(values: PartnerFormValues): B2bClientInput | null {
  const monthlyPriceCents = eurosToCents(values.monthlyPrice);
  if (monthlyPriceCents === 'invalid') {
    return null;
  }
  return {
    slug: values.slug.trim(),
    name: values.name.trim(),
    type: values.type,
    status: values.status,
    contactName: textOrNull(values.contactName),
    contactEmail: textOrNull(values.contactEmail),
    contactPhone: textOrNull(values.contactPhone),
    address: textOrNull(values.address),
    monthlyPriceCents,
    startedAt: textOrNull(values.startedAt),
    notes: textOrNull(values.notes),
  };
}

/** The fields of a partner that can change: every one but its slug. */
const changeableFields = [
  'name',
  'type',
  'status',
  'contactName',
  'contactEmail',
  'contactPhone',
  'address',
  'monthlyPriceCents',
  'startedAt',
  'notes',
] as const satisfies readonly (keyof B2bClientPatch)[];

/** The fields of the form that differ from the partner: only those are sent to change it. */
export function partnerPatchOf(
  partner: B2bClient,
  values: PartnerFormValues,
): B2bClientPatch | null {
  const input = partnerInputOf(values);
  if (!input) {
    return null;
  }
  const patch: B2bClientPatch = {};
  for (const key of changeableFields) {
    if (input[key] !== partner[key]) {
      Object.assign(patch, { [key]: input[key] });
    }
  }
  return patch;
}
