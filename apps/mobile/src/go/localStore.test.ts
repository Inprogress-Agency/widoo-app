import { describe, expect, it } from 'vitest';
import { createGoLocalStore, type GoLocalStorage } from './localStore';

function memory(initial?: string): GoLocalStorage & { value?: string } {
  const box: { value?: string } = { value: initial };
  return Object.assign(box, {
    get: () => box.value,
    set: (value: string) => {
      box.value = value;
    },
  });
}

const at = new Date('2026-10-24T08:30:00.000Z');
const later = new Date('2026-10-24T08:40:00.000Z');

describe('createGoLocalStore', () => {
  it('keeps the actions not sent, in their order, across launches', () => {
    const storage = memory();
    const first = createGoLocalStore(storage);
    first.queue('go-1', 'arrived', 'step-1', at);
    first.queue('go-1', 'done', 'step-1', later);
    const again = createGoLocalStore(storage);
    expect(again.localOf('go-1').pending).toEqual([
      { action: 'arrived', stepId: 'step-1', at: at.toISOString() },
      { action: 'done', stepId: 'step-1', at: later.toISOString() },
    ]);
  });

  it('keeps an action once per step, with its first time', () => {
    const store = createGoLocalStore(memory());
    store.queue('go-1', 'arrived', 'step-1', at);
    store.queue('go-1', 'arrived', 'step-1', later);
    expect(store.localOf('go-1').pending).toEqual([
      { action: 'arrived', stepId: 'step-1', at: at.toISOString() },
    ]);
  });

  it('cancels a « Passer » and its « Annuler » while neither is sent', () => {
    const store = createGoLocalStore(memory());
    store.queue('go-1', 'skip', 'step-1', at);
    store.queue('go-1', 'unskip', 'step-1', later);
    expect(store.localOf('go-1').pending).toEqual([]);
    // Once the skip is sent, its « Annuler » has to leave too.
    store.queue('go-1', 'unskip', 'step-2', later);
    expect(store.localOf('go-1').pending).toEqual([
      { action: 'unskip', stepId: 'step-2', at: later.toISOString() },
    ]);
  });

  it('forgets an action once sent, and everything for another Go', () => {
    const store = createGoLocalStore(memory());
    store.queue('go-1', 'arrived', 'step-1', at);
    store.queue('go-1', 'done', 'step-1', at);
    store.sent('go-1', { action: 'arrived', stepId: 'step-1' });
    expect(store.localOf('go-1').pending.map((entry) => entry.action)).toEqual(['done']);
    expect(store.localOf('go-2').pending).toEqual([]);
    store.queue('go-2', 'done', 'step-9', at);
    expect(store.localOf('go-1').pending).toEqual([]);
  });

  it('sends the arrivals and steps done kept by the version of #42', () => {
    const legacy = JSON.stringify({
      plannedId: 'go-1',
      local: {
        arrivedStepIds: ['step-1', 'step-2'],
        pendingDone: [{ stepId: 'step-1', at: at.toISOString() }],
      },
    });
    const store = createGoLocalStore(memory(legacy), () => later);
    expect(store.localOf('go-1').pending).toEqual([
      { action: 'arrived', stepId: 'step-1', at: later.toISOString() },
      { action: 'arrived', stepId: 'step-2', at: later.toISOString() },
      { action: 'done', stepId: 'step-1', at: at.toISOString() },
    ]);
  });

  it('starts from nothing on an unreadable copy', () => {
    expect(createGoLocalStore(memory('{nope')).localOf('go-1').pending).toEqual([]);
    expect(createGoLocalStore(memory('{"plannedId":"go-1"}')).localOf('go-1').pending).toEqual([]);
  });
});
