// Geofencing utilities for attendance validation

export interface OfficeLocation {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  address: string;
}

export interface GeofenceConfig {
  enabled: boolean;
  radius_meters: number;
  strict_mode: boolean;
}

export interface GeofenceResult {
  valid: boolean;
  distance: number;
  radius: number;
  office_lat: number;
  office_lon: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validate if user location is within office geofence
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param officeLocation Office location configuration
 * @returns Geofence validation result
 */
export function validateGeofence(
  userLat: number,
  userLon: number,
  officeLocation: OfficeLocation
): GeofenceResult {
  const distance = calculateDistance(
    userLat,
    userLon,
    officeLocation.latitude,
    officeLocation.longitude
  );

  return {
    valid: distance <= officeLocation.radius,
    distance: Math.round(distance),
    radius: officeLocation.radius,
    office_lat: officeLocation.latitude,
    office_lon: officeLocation.longitude
  };
}

/**
 * Get office location from system settings
 * @param supabase Supabase client
 * @returns Office location configuration
 */
export async function getOfficeLocation(supabase: any): Promise<OfficeLocation | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'office_location')
      .single();

    if (error) {
      console.error('Error fetching office location:', error);
      return null;
    }

    return data.value as OfficeLocation;
  } catch (error) {
    console.error('Error fetching office location:', error);
    return null;
  }
}

/**
 * Get geofencing configuration
 * @param supabase Supabase client
 * @returns Geofencing configuration
 */
export async function getGeofenceConfig(supabase: any): Promise<GeofenceConfig | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'geofencing')
      .single();

    if (error) {
      console.error('Error fetching geofence config:', error);
      return null;
    }

    return data.value as GeofenceConfig;
  } catch (error) {
    console.error('Error fetching geofence config:', error);
    return null;
  }
}

/**
 * Format distance for display
 * @param distance Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${distance}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
}

/**
 * Get location accuracy description
 * @param accuracy GPS accuracy in meters
 * @returns Accuracy description
 */
export function getAccuracyDescription(accuracy: number): string {
  if (accuracy <= 5) {
    return 'Excellent';
  } else if (accuracy <= 10) {
    return 'Good';
  } else if (accuracy <= 20) {
    return 'Fair';
  } else {
    return 'Poor';
  }
}



