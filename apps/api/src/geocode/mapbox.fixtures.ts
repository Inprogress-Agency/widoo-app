// Answers in the shape of the Mapbox APIs, with fictitious ids.
export const token = 'sk.fictitious-mapbox-token-0123456789';
export const neighborhood = {
  properties: {
    mapbox_id: 'geo-montmartre',
    feature_type: 'neighborhood',
    name: 'Montmartre',
    coordinates: { longitude: 2.3431, latitude: 48.8867 },
    bbox: [2.3305, 48.8805, 2.3485, 48.8925],
    context: { locality: { name: 'Paris 18e Arrondissement' }, place: { name: 'Paris' } },
  },
};
export const district = {
  properties: {
    mapbox_id: 'geo-paris-11',
    feature_type: 'locality',
    name: 'Paris 11e Arrondissement',
    coordinates: { longitude: 2.3796, latitude: 48.8592 },
    bbox: [2.3637, 48.8487, 2.3984, 48.8713],
    context: { place: { name: 'Paris' } },
  },
};
export const address = {
  properties: {
    mapbox_id: 'geo-address',
    feature_type: 'address',
    name: '1 rue Fictive',
    coordinates: { longitude: 2.35, latitude: 48.86 },
  },
};
export const station = {
  properties: {
    mapbox_id: 'poi-republique',
    feature_type: 'poi',
    name: 'République',
    coordinates: { longitude: 2.3637, latitude: 48.8675 },
    poi_category_ids: ['transportation', 'subway_station'],
    context: { locality: { name: 'Paris 10e Arrondissement' } },
  },
};
export const cafe = {
  properties: {
    mapbox_id: 'poi-cafe',
    feature_type: 'poi',
    name: 'Café de la République',
    coordinates: { longitude: 2.364, latitude: 48.868 },
    poi_category_ids: ['food_and_drink', 'cafe'],
    maki: 'cafe',
  },
};
