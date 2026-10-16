import { describe, expect, it } from 'vitest';
import { toActionsParams, type ActionsListQuery } from './actions-list';

const query = (filters: ActionsListQuery['filters'], cursor: string | null = null) =>
  ({
    search: '',
    filters,
    sort: { column: 'date', direction: 'desc' },
    cursor,
  }) as ActionsListQuery;

describe('toActionsParams', () => {
  it('asks for the filters of the address', () => {
    const actorId = '0199d1ec-0000-7000-8000-000000000000';
    expect(
      toActionsParams(
        query(
          { auteur: actorId, action: 'route.publish', cible: 'route', periode: 'semaine' },
          'abc',
        ),
      ),
    ).toEqual({
      actorId,
      action: 'route.publish',
      targetType: 'route',
      period: '7d',
      cursor: 'abc',
    });
  });

  it('drops an author that is no identifier and a period it does not know', () => {
    expect(toActionsParams(query({ auteur: 'tout le monde', periode: 'siecle' }))).toEqual({
      actorId: undefined,
      action: undefined,
      targetType: undefined,
      period: undefined,
      cursor: undefined,
    });
  });
});
