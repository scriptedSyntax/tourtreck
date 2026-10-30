const NAIROBI = { latitude: -1.2921, longitude: 36.8219 };

export function deliveryFeeForLocation(latitude: number, longitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(latitude - NAIROBI.latitude);
  const dLon = radians(longitude - NAIROBI.longitude);
  const lat1 = radians(NAIROBI.latitude);
  const lat2 = radians(latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.asin(Math.sqrt(a));
  if (distanceKm <= 35) return 650;
  if (distanceKm <= 100) return 1200;
  return 1450;
}
