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

describe('createGoLocalStore', () => {
  it("keeps « J'y suis » and the steps done offline, across launches", () => {
    const storage = memory();
    const first = createGoLocalStore(storage);
    first.arrive('go-1', 'step-1');
    first.queueDone('go-1', 'step-1', at);
    const again = createGoLocalStore(storage);
    expect(again.localOf('go-1')).toEqual({
      arrivedStepIds: ['step-1'],
      pendingDone: [{ stepId: 'step-1', at: at.toISOString() }],
    });
  });

  it('forgets a step once sent, and everything for another Go', () => {
    const store = createGoLocalStore(memory());
    store.queueDone('go-1', 'step-1', at);
    store.sent('go-1', 'step-1');
    expect(store.localOf('go-1').pendingDone).toEqual([]);
    store.arrive('go-1', 'step-2');
    expect(store.localOf('go-2').arrivedStepIds).toEqual([]);
    store.arrive('go-2', 'step-9');
    expect(store.localOf('go-1').arrivedStepIds).toEqual([]);
  });

  it('starts from nothing on an unreadable copy', () => {
    expect(createGoLocalStore(memory('{nope')).localOf('go-1').arrivedStepIds).toEqual([]);
  });
});
