import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { isSectionId } from '../../../../src/discovery/sections';
import { useUserLocation } from '../../../../src/location/useUserLocation';
import { openRoute } from '../../../../src/results/navigation';
import { SectionList } from '../../../../src/results/SectionList';

/** Back to the sheet, as it was left; to the map when the list was opened by a link. */
function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

/** « Voir tout » of a section of the sheet (Ecrans › E-04): every route of the zone, sortable. */
export default function SectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { location, enable } = useUserLocation();
  if (!isSectionId(id)) {
    return <Redirect href="/" />;
  }
  return (
    <SectionList
      section={id}
      position={location.status === 'granted' ? location.position : null}
      onEnableLocation={() => void enable()}
      onBack={goBack}
      onOpenRoute={(route) => openRoute(route, 'card')}
    />
  );
}
