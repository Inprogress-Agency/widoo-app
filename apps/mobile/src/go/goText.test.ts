import { describe, expect, it } from 'vitest';
import { i18next } from '../i18n';
import { emptyGoLocal, goProgress } from './progress';
import { plannedFixture, stepIds } from './testPlanned';
import {
  headerSpoken,
  lineText,
  miniPlayerLabel,
  progressText,
  statusText,
  timelineState,
} from './goText';

const t = i18next.t.bind(i18next);
const at = '2026-10-24T08:22:00.000Z';

describe('E-07 texts, in French', () => {
  it('says the step en route, with the distance once known', () => {
    const progress = goProgress(plannedFixture(), emptyGoLocal);
    expect(statusText(t, progress).short).toBe("En route vers l'étape 1");
    expect(lineText(t, progress, 900)?.short).toBe('Parc, 45 min, à 900 m de vous');
    expect(lineText(t, progress, null)?.short).toBe('Parc, 45 min');
    expect(headerSpoken(t, progress, 900)).toBe(
      "En route vers l'étape 1 sur 3. Place fictive. Parc, 45 minutes, à 900 mètres de vous.",
    );
  });

  it('says the step on site, until when', () => {
    const planned = plannedFixture({ 0: { doneAt: at } });
    const progress = goProgress(planned, { ...emptyGoLocal, arrivedStepIds: [stepIds[1]] });
    expect(statusText(t, progress).short).toBe('Étape 2 sur 3, vous y êtes');
    expect(lineText(t, progress, 10)?.short).toBe("Musée, 45 min prévues, jusqu'à 12:45 environ");
    expect(miniPlayerLabel(t, progress)).toBe(
      'Parcours en cours, étape 2 sur 3, Musée fictif, vous y êtes. Rouvrir',
    );
    expect(progressText(t, planned, progress)).toEqual({
      start: 'Départ 10:00',
      end: 'Fin vers 14:00',
      spoken: '1 étape faite sur 3, départ 10 heures, fin vers 14 heures',
    });
    expect(progress.steps.map((entry) => timelineState(t, entry, progress.phase).text)).toEqual([
      'Fait à 10:22',
      'Vous y êtes',
      'Café',
    ]);
  });

  it('says when every step is done', () => {
    const planned = plannedFixture({ 0: { doneAt: at }, 1: { doneAt: at }, 2: { doneAt: at } });
    const progress = goProgress(planned, emptyGoLocal);
    expect(statusText(t, progress).short).toBe('Toutes les étapes sont faites');
    expect(lineText(t, progress, null)).toBeNull();
  });

  it('says the skipped steps left once none is current, never « all done »', () => {
    const planned = plannedFixture({ 0: { doneAt: at }, 1: { doneAt: at }, 2: { skippedAt: at } });
    const progress = goProgress(planned, emptyGoLocal);
    expect(statusText(t, progress).short).toBe('Il reste 1 étape passée');
    expect(miniPlayerLabel(t, progress)).toBe(
      'Parcours en cours, il reste 1 étape passée. Rouvrir',
    );
    const several = plannedFixture({
      0: { doneAt: at },
      1: { skippedAt: at },
      2: { skippedAt: at },
    });
    const left = goProgress(several, emptyGoLocal);
    expect(statusText(t, left).short).toBe('Il reste 2 étapes passées');
    expect(miniPlayerLabel(t, left)).toBe(
      'Parcours en cours, il reste 2 étapes passées. Rouvrir',
    );
  });
});
