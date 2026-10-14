import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RouteDetail, type RouteCard } from '@widoo/shared';
import { accessibility } from '@widoo/tokens';
import fixtures from './generated/route-sheets.json';
import { RouteSheet, type RouteSheetProps } from './RouteSheet';
import type { RouteSheetState } from './useRouteSheet';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

const nbsp = ' ';
// The demo sheets: the ten seed routes, then the locked Premium, private and reported copies.
const sheets = fixtures.routes.map((sheet) => RouteDetail.parse(sheet));
const [marais] = sheets as [RouteDetail];
const premium = sheets[10] as RouteDetail;
const shared = sheets[11] as RouteDetail;
const reported = sheets[12] as RouteDetail;
// Monday 12 October 2026, 9:00 in Paris.
const now = new Date('2026-10-12T07:00:00.000Z');

/** The card of the list of a sheet: what the sheet knows before its detail answers. */
const cardOf = (sheet: RouteDetail): RouteCard => ({
  ...sheet,
  steps: sheet.steps.flatMap((step) =>
    step.isLocked
      ? []
      : [
          {
            category: step.place.category,
            location: step.place.location,
            name: step.place.name,
            durationMin: step.durationMin,
          },
        ],
  ),
});

async function renderSheet(state: RouteSheetState, props: Partial<RouteSheetProps> = {}) {
  const handlers = {
    onRetry: jest.fn(),
    onClose: jest.fn(),
    onShare: jest.fn(),
    onGo: jest.fn(),
    onPlan: jest.fn(),
    onNearby: jest.fn(),
    onScrollDepth: jest.fn(),
  };
  const view = await render(
    <RouteSheet
      state={state}
      onSeeOnMap={null}
      plannedDate={null}
      now={now}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, view };
}

const ready = (route: RouteDetail): RouteSheetState => ({ status: 'ready', route });

describe('RouteSheet (E-05)', () => {
  it('reads as the dialog of the route, its title as a header, its key figures in a list', async () => {
    await renderSheet(ready(marais));
    await screen.findByRole('header', { name: marais.title });
    expect(screen.getByLabelText(`Fiche du parcours ${marais.title}`)).toBeTruthy();
    expect(screen.getByLabelText('Infos clés').props.accessibilityRole).toBe('list');
    expect(screen.getByLabelText('environ 15 euros par personne')).toBeTruthy();
    expect(screen.getByText(`≈${nbsp}15${nbsp}€`)).toBeTruthy();
    // No review yet: « Nouveau » in place of the rating (D-023).
    expect(screen.getByLabelText('Nouveau')).toBeTruthy();
  });

  it('caps the tiles, the badges on the photo and the sticky bar at 1.3 (D-046)', async () => {
    await renderSheet(ready(premium));
    const cap = (text: string) =>
      screen.getAllByText(text, { includeHiddenElements: true })[0]?.props.maxFontSizeMultiplier;
    expect(cap('Durée')).toBe(accessibility.maxFontSizeMultiplierDense);
    expect(cap('Premium')).toBe(accessibility.maxFontSizeMultiplierDense);
    expect(cap('Débloquer avec Premium')).toBe(accessibility.maxFontSizeMultiplierDense);
  });

  it('lists the steps with their times and trips, and unfolds one at a time', async () => {
    await renderSheet(ready(marais));
    const first = await screen.findByRole('button', {
      name: /^Étape 1 sur 4, 14 heures, Maison de Victor Hugo, Musée, 45 minutes, replié$/,
    });
    expect(first.props.accessibilityState).toMatchObject({ expanded: false });
    await fireEvent.press(first);
    expect(screen.getByRole('button', { name: /^Étape 1 sur 4.*déplié$/ })).toBeTruthy();
    expect(screen.getByText(/^Vérifié par \d+ visiteurs le /)).toBeTruthy();
    expect(screen.getByText(/Le conseil de Widoo/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^Étape 2 sur 4/ }));
    expect(screen.getByRole('button', { name: /^Étape 1 sur 4.*replié$/ })).toBeTruthy();
    expect(screen.getAllByText(/min à pied \(/).length).toBe(3);
    expect(screen.getByLabelText(/^Fin du parcours, /)).toBeTruthy();
  });

  it('tells a reported place under the tiles, its step marked and unfolded with the banner', async () => {
    await renderSheet(ready(reported));
    const place = (reported.steps[1] as { place: { name: string } }).place.name;
    expect(await screen.findByLabelText(`${place} signalé, peut-être fermé`)).toBeTruthy();
    expect(screen.getByRole('button', { name: `Voir l'étape ${place}` })).toBeTruthy();
    const step = screen.getByRole('button', { name: /^Étape 2 sur 4.*lieu signalé, replié$/ });
    await fireEvent.press(step);
    expect(
      screen.getByText(/^Signalé fermé par 3 visiteurs le .* Vérifiez avant d'y aller\.$/),
    ).toBeTruthy();
    expect(screen.getByText(/^Horaires habituels /)).toBeTruthy();
    expect(screen.getByText(/^Dernière visite sans problème le /)).toBeTruthy();
    // The third place was not verified for months: said under its line, folded.
    expect(screen.getByText(/^Dernière vérification il y a \d+ mois$/)).toBeTruthy();
  });

  it('shows its reviews with their rating as a figure after a star', async () => {
    await renderSheet(ready(reported));
    expect(await screen.findByRole('header', { name: 'Avis' })).toBeTruthy();
    expect(screen.getByLabelText(/^Inès, .*, note 5 sur 5, /)).toBeTruthy();
    expect(screen.getByLabelText('Note moyenne 4,7 sur 5, 3 avis')).toBeTruthy();
  });

  it('opens the profile of its creator from « Voir le profil », not for a route of Widoo', async () => {
    const camille = sheets[2] as RouteDetail;
    const onOpenCreator = jest.fn();
    await renderSheet(ready(camille), { onOpenCreator });
    await fireEvent.press(await screen.findByRole('link', { name: 'Voir le profil de Camille' }));
    expect(onOpenCreator).toHaveBeenCalledWith(camille.author);
    await renderSheet(ready(marais), { onOpenCreator });
    expect(screen.queryByRole('link', { name: /^Voir le profil/ })).toBeNull();
  });

  it('marks a private route and who shared it, without Vérifié nor Signature', async () => {
    await renderSheet(ready(shared));
    expect(await screen.findByLabelText('Privé')).toBeTruthy();
    expect(screen.queryByLabelText('Vérifié')).toBeNull();
    expect(screen.getByText('Partagé par Camille, visible seulement avec le lien')).toBeTruthy();
  });

  it('locks the steps after the start of a Premium route, with one ink button (D-014)', async () => {
    await renderSheet(ready(premium));
    expect(await screen.findByRole('button', { name: /^Étape 1 sur 5/ })).toBeTruthy();
    expect(screen.getByLabelText(/^Étape 2 sur 5, .*, réservée à Premium$/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Étape 2 sur 5/ })).toBeNull();
    expect(screen.getAllByText('Réservé à Premium')).toHaveLength(4);
    expect(screen.getByText('Parcours Premium')).toBeTruthy();
    expect(screen.getByText('Débloquez les 4 autres étapes.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Débloquer avec Premium' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: "C'est parti" })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Programmer' })).toBeNull();
  });

  it('shows what the card knows while loading, the description in grey bars, busy', async () => {
    await renderSheet({ status: 'loading', known: cardOf(marais) });
    expect(await screen.findByRole('header', { name: marais.title })).toBeTruthy();
    expect(
      screen.getByLabelText('Chargement de la description').props.accessibilityState,
    ).toMatchObject({
      busy: true,
    });
    expect(screen.queryByText('Les étapes')).toBeNull();
    // The buttons stay there.
    expect(screen.getByRole('button', { name: "C'est parti" })).toBeTruthy();
  });

  it('keeps what is known on an error, with « Réessayer »; offline, « Hors connexion »', async () => {
    const { onRetry, view } = await renderSheet({
      status: 'error',
      isOffline: false,
      known: cardOf(marais),
    });
    expect(
      await screen.findByLabelText('Impossible de charger le détail du parcours'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer le chargement' }));
    expect(onRetry).toHaveBeenCalled();
    await view.rerender(
      <RouteSheet
        state={{ status: 'error', isOffline: true, known: cardOf(marais) }}
        onSeeOnMap={null}
        now={now}
        onRetry={onRetry}
        onClose={jest.fn()}
        onShare={jest.fn()}
        onGo={jest.fn()}
        onPlan={jest.fn()}
        plannedDate={null}
        onNearby={jest.fn()}
        onScrollDepth={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Hors connexion')).toBeTruthy();
    expect(screen.getByRole('header', { name: marais.title })).toBeTruthy();
  });

  it('says a withdrawn route is no longer there, with the date and nearby routes', async () => {
    const { onNearby, onClose } = await renderSheet({
      status: 'removed',
      removedAt: '2026-09-20T08:00:00.000Z',
      known: null,
    });
    expect(await screen.findByText("Ce parcours n'est plus disponible")).toBeTruthy();
    expect(screen.getByText(/l'a retiré le 20 sept\. Des parcours/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Voir des parcours proches' }));
    expect(onNearby).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer la fiche' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shares, goes and shows the route on the map', async () => {
    const onSeeOnMap = jest.fn();
    const { onShare, onGo, onPlan } = await renderSheet(ready(marais), { onSeeOnMap });
    await fireEvent.press(await screen.findByRole('button', { name: 'Partager le parcours' }));
    expect(onShare).toHaveBeenCalledWith(expect.objectContaining({ id: marais.id }));
    await fireEvent.press(screen.getByRole('button', { name: "C'est parti" }));
    expect(onGo).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('link', { name: 'Voir sur la carte' }));
    expect(onSeeOnMap).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Programmer' }));
    expect(onPlan).toHaveBeenCalledWith(expect.objectContaining({ id: marais.id }));
  });

  it('shows the date of a planned route in place of « Programmer »', async () => {
    const plannedDate = {
      label: 'Sam. 26, 10:00',
      spoken: 'Sortie programmée le samedi 26 septembre à 10:00, modifier la sortie',
    };
    await renderSheet(ready(marais), { plannedDate });
    expect(await screen.findByRole('button', { name: plannedDate.spoken })).toBeTruthy();
    expect(screen.getByText('Sam. 26, 10:00').props.maxFontSizeMultiplier).toBe(1.3);
  });
});
