// Reverse geocoding utilities for getting address from coordinates

export interface AddressComponents {
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  street?: string;
  house_number?: string;
}

export interface GeocodingResult {
  address: string;
  city: string;
  components: AddressComponents;
  formatted_address: string;
}

/**
 * Get address from coordinates using OpenStreetMap Nominatim API
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with geocoding result
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      throw new Error(data.error || 'No data received');
    }

    const address = data.address || {};
    const components: AddressComponents = {
      city: address.city || address.town || address.village || address.municipality || address.hamlet || address.locality,
      state: address.state || address.province || address.region,
      country: address.country,
      postal_code: address.postcode,
      street: address.road || address.street,
      house_number: address.house_number
    };

    // Build formatted address
    const addressParts = [
      components.house_number,
      components.street,
      components.city,
      components.state,
      components.country
    ].filter(Boolean);

    const formatted_address = addressParts.join(', ');
    
    // Build city name for display - prioritize village/city name
    const cityParts = [
      components.city,
      components.state
    ].filter(Boolean);
    
    const city = cityParts.join(', ') || 'Unknown Location';

    return {
      address: data.display_name || formatted_address,
      city,
      components,
      formatted_address
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Get city name from coordinates (simplified version)
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with city name
 */
export async function getCityFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const result = await reverseGeocode(latitude, longitude);
    return result?.city || 'Unknown Location';
  } catch (error) {
    console.error('Error getting city:', error);
    return 'Unknown Location';
  }
}

/**
 * Get detailed location information for attendance records
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with detailed location info
 */
export async function getDetailedLocationInfo(
  latitude: number,
  longitude: number
): Promise<{
  city: string;
  village: string;
  state: string;
  country: string;
  fullAddress: string;
} | null> {
  try {
    const result = await reverseGeocode(latitude, longitude);
    if (!result) return null;

    return {
      city: result.components.city || 'Unknown',
      village: result.components.city || 'Unknown', // In many cases, city field contains village name
      state: result.components.state || 'Unknown',
      country: result.components.country || 'Unknown',
      fullAddress: result.formatted_address || 'Address not available'
    };
  } catch (error) {
    console.error('Error getting detailed location info:', error);
    return null;
  }
}

/**
 * Format coordinates for display
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @param precision Number of decimal places (default: 6)
 * @returns Formatted coordinate string
 */
export function formatCoordinates(
  latitude: number,
  longitude: number,
  precision: number = 6
): string {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

/**
 * Validate if coordinates are within reasonable bounds
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns True if coordinates are valid
 */
export function validateCoordinates(latitude: number, longitude: number): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
}
