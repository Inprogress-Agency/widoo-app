import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react-native';
import { GoSections } from './GoSections';
import { emptyGoLocal, goProgress } from './progress';
import { plannedFixture } from './testPlanned';

jest.mock('../analytics', () => ({ analytics: { track: jest.fn() } }));

const now = new Date('2026-10-24T08:22:00.000Z');

// Without the full route, as offline: the points and the photos come with the planning.
function renderSections(progress = goProgress(plannedFixture(), emptyGoLocal)) {
  return render(<GoSections progress={progress} route={null} now={now} />);
}

/** The Go on the second step, the museum, which has two points and two photos. */
const onMuseum = () =>
  goProgress(plannedFixture({ 0: { doneAt: '2026-10-24T08:20:00.000Z' } }), emptyGoLocal);

describe('GoSections', () => {
  it('shows neither « À ne pas manquer » nor « En images » on a step without any', async () => {
    await renderSections();
    expect(screen.queryByText('À ne pas manquer')).toBeNull();
    expect(screen.queryByText('En images')).toBeNull();
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('numbers the points of the step, each read as one element', async () => {
    await renderSections(onMuseum());
    expect(screen.getByRole('header', { name: 'À ne pas manquer' })).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('La salle fictive')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText("L'atelier fictif")).toBeTruthy();
    // The number and its point make one element for the screen reader.
    let point = screen.getByText('1').parent;
    while (point && point.props.accessible !== true) {
      point = point.parent;
    }
    expect(point && within(point).getByText('La salle fictive')).toBeTruthy();
    expect(point && within(point).queryByText("L'atelier fictif")).toBeNull();
  });

  it('labels each photo, the credit on the free one only', async () => {
    await renderSections(onMuseum());
    expect(screen.getByRole('header', { name: 'En images' })).toBeTruthy();
    expect(screen.getByText('2 photos')).toBeTruthy();
    const photos = screen.getAllByRole('image');
    expect(photos.map((photo) => photo.props.accessibilityLabel)).toEqual([
      'Photo 1 sur 2',
      'Photo 2 sur 2',
    ]);
    const credits = screen.getAllByRole('button', { name: /^Photo de / });
    expect(credits).toHaveLength(1);
    const [credit] = credits;
    expect(credit?.props.accessibilityLabel).toBe('Photo de J. Moreau, licence CC BY-SA 4.0');
    expect(credit && within(credit).getByText('© J. Moreau')).toBeTruthy();
  });

  it('keeps the sections in the order of the mockup', async () => {
    await renderSections(onMuseum());
    const titles = screen
      .getAllByText(/^(Le mot de .+|À ne pas manquer|En images|Ensuite)$/)
      .map((title) => title.props.children as string);
    expect(titles).toEqual(['Le mot de Widoo', 'À ne pas manquer', 'En images', 'Ensuite']);
  });
});
