import type { RouteCluster } from '@widoo/shared';
import { size } from '@widoo/tokens';
import type { FeatureCollection, Point } from 'geojson';
import { toLngLat } from './geo';

/**
 * Clusters of a zone too large to list its routes (Filtres-et-Recherche › Recherche par zone):
 * a blue disc per area with its count, drawn by a circle layer and a symbol layer.
 */

export interface ClusterProperties {
  clusterId: string;
  count: number;
  /** The count as the map writes it. */
  label: string;
  /** Radius of the disc, in points. */
  radius: number;
}

/**
 * The disc grows with its count, from the 44 points of a touch target: the size of a round
 * button, then of a marker, then of a selected marker (tokens.json has no cluster size).
 */
export function clusterRadius(count: number): number {
  if (count < 10) {
    return size.disc / 2;
  }
  return count < 100 ? size.marker / 2 : size['marker-active'] / 2;
}

/** A stable id of a cluster, from its place: the answer does not give one. */
export const clusterId = ({ center }: RouteCluster) => `${center.lat},${center.lng}`;

export function clusterPoints(
  clusters: readonly RouteCluster[],
): FeatureCollection<Point, ClusterProperties> {
  return {
    type: 'FeatureCollection',
    features: clusters.map((cluster) => ({
      type: 'Feature',
      id: clusterId(cluster),
      geometry: { type: 'Point', coordinates: toLngLat(cluster.center) },
      properties: {
        clusterId: clusterId(cluster),
        count: cluster.count,
        label: String(cluster.count),
        radius: clusterRadius(cluster.count),
      },
    })),
  };
}

/** Zoom levels a tap on a cluster goes in: two, each a zone four times smaller. */
export const clusterZoomStep = 2;

/**
 * Zoom a tap on a cluster goes to, from `zoom`. A badge « 1 » goes at least to `listedZoom`, that
 * of the opening view of about 3 km, a zone always under the threshold of the clusters
 * (Filtres-et-Recherche › Recherche par zone): its route is listed there, and selected (D-108).
 */
export function clusterZoom(
  cluster: Pick<RouteCluster, 'count'>,
  zoom: number,
  listedZoom: number,
): number {
  const zoomIn = zoom + clusterZoomStep;
  return cluster.count === 1 ? Math.max(zoomIn, listedZoom) : zoomIn;
}
