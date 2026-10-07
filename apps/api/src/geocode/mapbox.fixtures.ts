// Answers in the shape of the Mapbox APIs, as they came on 2026-10-07, with fictitious ids.
export const token = 'sk.fictitious-mapbox-token-0123456789';
export const neighborhood = {
  properties: {
    mapbox_id: 'geo-montmartre',
    feature_type: 'neighborhood',
    name: 'Montmartre',
    coordinates: { longitude: 2.3431, latitude: 48.8867 },
    bbox: [2.3305, 48.8805, 2.3485, 48.8925],
    context: {
      postcode: { name: '75018' },
      locality: { name: '18e arrondissement' },
      place: { name: 'Paris' },
    },
  },
};
export const district = {
  properties: {
    mapbox_id: 'geo-paris-11',
    feature_type: 'locality',
    name: '11e arrondissement',
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
    poi_category_ids: ['light_rail_station', 'railway_station', 'transportation'],
    maki: 'rail-light',
    context: { postcode: { name: '75003' }, place: { name: 'Paris' } },
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
export const busStop = {
  properties: {
    mapbox_id: 'poi-bus',
    feature_type: 'poi',
    name: 'République',
    coordinates: { longitude: 2.363, latitude: 48.867 },
    poi_category_ids: ['bus_stop', 'transportation'],
    maki: 'bus',
  },
};
/** What Mapbox answers to « 12 rue de Rivoli » and to « Tour Eiffel »: zones of other names. */
export const looseMatches = [
  {
    properties: {
      mapbox_id: 'geo-tivoli',
      feature_type: 'neighborhood',
      name: 'Le Tivoli',
      coordinates: { longitude: 2.3, latitude: 48.9 },
      context: { place: { name: 'Ville fictive' } },
    },
  },
  {
    properties: {
      mapbox_id: 'geo-eiffel',
      feature_type: 'neighborhood',
      name: 'Eiffel',
      coordinates: { longitude: 2.29, latitude: 48.89 },
      context: { place: { name: 'Ville fictive' } },
    },
  },
];
