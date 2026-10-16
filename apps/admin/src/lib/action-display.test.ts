import { describe, expect, it } from 'vitest';
import {
  actionLabelOf,
  isTargetGone,
  targetNameOf,
  targetPathOf,
  targetTypeLabelOf,
} from './action-display';

describe('actionLabelOf and targetTypeLabelOf', () => {
  it('translate what is known and show the rest as it is', () => {
    expect(actionLabelOf('user.suspend')).toBe('Compte suspendu');
    expect(actionLabelOf('thing.done')).toBe('thing.done');
    expect(targetTypeLabelOf('route')).toBe('Parcours');
    expect(targetTypeLabelOf('thing')).toBe('thing');
  });
});

describe('targetPathOf', () => {
  it('points at the page of the object', () => {
    expect(targetPathOf('route', 'r1')).toBe('/catalogue/parcours/r1');
    expect(targetPathOf('place', 'p1')).toBe('/catalogue/lieux?lieu=p1');
    expect(targetPathOf('user', 'u1')).toBe('/utilisateurs?compte=u1');
    expect(targetPathOf('setting', 'premium.min_steps')).toBe(
      '/reglages?reglage=premium.min_steps',
    );
  });

  it('has none for a report or an unknown kind', () => {
    expect(targetPathOf('route_report', 'x')).toBeNull();
    expect(targetPathOf('thing', 'x')).toBeNull();
  });
});

describe('targetNameOf', () => {
  it('prefers the name of the API, then the label of a setting', () => {
    expect(targetNameOf({ targetType: 'user', targetId: 'u1', targetLabel: 'Camille' })).toBe(
      'Camille',
    );
    expect(
      targetNameOf({ targetType: 'setting', targetId: 'premium.min_steps', targetLabel: null }),
    ).toBe("Étapes d'un parcours Premium");
  });

  it('has none for an object that is gone or a kind without a name', () => {
    expect(targetNameOf({ targetType: 'user', targetId: 'u1', targetLabel: null })).toBeNull();
    expect(
      targetNameOf({ targetType: 'route_report', targetId: 'x', targetLabel: null }),
    ).toBeNull();
  });
});

describe('isTargetGone', () => {
  it('is true for an account, route or place the API no longer names', () => {
    expect(isTargetGone({ targetType: 'user', targetLabel: null })).toBe(true);
    expect(isTargetGone({ targetType: 'route', targetLabel: null })).toBe(true);
    expect(isTargetGone({ targetType: 'user', targetLabel: 'Camille' })).toBe(false);
  });

  it('is false for a kind that has no name to lose', () => {
    expect(isTargetGone({ targetType: 'setting', targetLabel: null })).toBe(false);
    expect(isTargetGone({ targetType: 'route_report', targetLabel: null })).toBe(false);
  });
});
