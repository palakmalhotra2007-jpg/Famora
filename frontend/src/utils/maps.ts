import { Linking, Platform, Alert } from 'react-native';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
  label?: string;
}

function destinationParam(latitude: number, longitude: number, label?: string): string {
  if (label?.trim()) {
    return encodeURIComponent(`${label.trim()}@${latitude},${longitude}`);
  }
  return `${latitude},${longitude}`;
}

/** Open Google Maps to view a pin */
export async function openGoogleMapsView(
  latitude: number,
  longitude: number,
  label?: string
): Promise<void> {
  const query = destinationParam(latitude, longitude, label);
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  if (Platform.OS === 'ios') {
    const appUrl = `comgooglemaps://?q=${query}&center=${latitude},${longitude}&zoom=15`;
    if (await Linking.canOpenURL(appUrl)) {
      await Linking.openURL(appUrl);
      return;
    }
  }

  await Linking.openURL(webUrl);
}

/** Open Google Maps turn-by-turn directions to a family member */
export async function openGoogleMapsDirections(
  latitude: number,
  longitude: number,
  label?: string
): Promise<void> {
  const dest = destinationParam(latitude, longitude, label);
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

  if (Platform.OS === 'ios') {
    const appUrl = `comgooglemaps://?daddr=${dest}&directionsmode=driving`;
    if (await Linking.canOpenURL(appUrl)) {
      await Linking.openURL(appUrl);
      return;
    }
  }

  if (Platform.OS === 'android') {
    const navUrl = `google.navigation:q=${latitude},${longitude}`;
    if (await Linking.canOpenURL(navUrl)) {
      await Linking.openURL(navUrl);
      return;
    }
  }

  await Linking.openURL(webUrl);
}

export function promptMapsAction(
  latitude: number,
  longitude: number,
  label: string
): void {
  Alert.alert(
    label,
    'Open in Google Maps',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'View on map',
        onPress: () => {
          void openGoogleMapsView(latitude, longitude, label);
        },
      },
      {
        text: 'Get directions',
        onPress: () => {
          void openGoogleMapsDirections(latitude, longitude, label);
        },
      },
    ]
  );
}

/** Embed URL for web preview (no API key required) */
export function getGoogleMapsEmbedUrl(members: MapCoordinate[]): string | null {
  const withCoords = members.filter(
    (m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude)
  );
  if (withCoords.length === 0) return null;

  if (withCoords.length === 1) {
    const { latitude, longitude } = withCoords[0];
    return `https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=15&output=embed`;
  }

  const lats = withCoords.map((m) => m.latitude);
  const lngs = withCoords.map((m) => m.longitude);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  const zoom = span > 2 ? 8 : span > 0.5 ? 10 : span > 0.1 ? 12 : 14;

  return `https://maps.google.com/maps?q=${centerLat},${centerLng}&hl=en&z=${zoom}&output=embed`;
}

export function getGoogleMapsExternalUrl(members: MapCoordinate[]): string | null {
  const withCoords = members.filter(
    (m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude)
  );
  if (withCoords.length === 0) return null;
  if (withCoords.length === 1) {
    const m = withCoords[0];
    return `https://www.google.com/maps/search/?api=1&query=${m.latitude},${m.longitude}`;
  }
  const first = withCoords[0];
  return `https://www.google.com/maps/search/?api=1&query=${first.latitude},${first.longitude}`;
}
