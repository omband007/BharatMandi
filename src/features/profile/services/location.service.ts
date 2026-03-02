/**
 * Location Service
 * 
 * Handles location capture (GPS/manual) and geocoding.
 */

import { UserProfileModel } from '../models/profile.model';
import { ContextualPromptService } from './contextual-prompt.service';
import { validateLocation } from '../utils/validators';
import type { Location } from '../types/profile.types';

export class LocationService {
  private promptService: ContextualPromptService;

  constructor() {
    this.promptService = new ContextualPromptService();
  }

  /**
   * Capture GPS location
   */
  async captureGPSLocation(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<boolean> {
    // Validate coordinates
    const validation = validateLocation({ latitude, longitude });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Create location object
    const location: Location = {
      latitude,
      longitude,
      country: 'India',
      locationType: 'gps',
      isVerified: true, // GPS locations are verified
      lastUpdated: new Date()
    };

    // Try to reverse geocode to get address details
    try {
      const addressDetails = await this.reverseGeocode(latitude, longitude);
      Object.assign(location, addressDetails);
    } catch (error) {
      console.error('[LocationService] Reverse geocoding failed:', error);
      // Continue without address details
    }

    profile.location = location;
    profile.updatedAt = new Date();
    await profile.save();

    // Record collection
    await this.promptService.recordFieldCollected(userId, 'location', 'implicit_update');

    return true;
  }

  /**
   * Capture manual location
   */
  async captureManualLocation(
    userId: string,
    locationData: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      district?: string;
      state?: string;
      pincode?: string;
    }
  ): Promise<boolean> {
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Try to geocode the address to get coordinates
    let coordinates: { latitude: number; longitude: number } | null = null;
    try {
      coordinates = await this.geocodeAddress(locationData);
    } catch (error) {
      console.error('[LocationService] Geocoding failed:', error);
      throw new Error('Could not validate the provided address');
    }

    if (!coordinates) {
      throw new Error('Could not find coordinates for the provided address');
    }

    // Validate coordinates
    const validation = validateLocation(coordinates);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create location object
    const location: Location = {
      ...coordinates,
      ...locationData,
      country: 'India',
      locationType: 'manual',
      isVerified: false, // Manual locations are not verified
      lastUpdated: new Date()
    };

    profile.location = location;
    profile.updatedAt = new Date();
    await profile.save();

    // Record collection
    await this.promptService.recordFieldCollected(userId, 'location', 'manual_edit');

    return true;
  }

  /**
   * Reverse geocode coordinates to address
   * TODO: Integrate with OpenStreetMap Nominatim or Google Maps API
   */
  private async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<Partial<Location>> {
    // Placeholder implementation
    // In production, use OpenStreetMap Nominatim or Google Maps Geocoding API
    
    console.log(`[LocationService] Reverse geocoding: ${latitude}, ${longitude}`);
    
    // Example with OpenStreetMap Nominatim:
    // const response = await fetch(
    //   `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    // );
    // const data = await response.json();
    // return {
    //   addressLine1: data.address.road,
    //   city: data.address.city || data.address.town || data.address.village,
    //   district: data.address.county,
    //   state: data.address.state,
    //   pincode: data.address.postcode
    // };

    return {};
  }

  /**
   * Geocode address to coordinates
   * TODO: Integrate with OpenStreetMap Nominatim or Google Maps API
   */
  private async geocodeAddress(
    locationData: {
      addressLine1?: string;
      city?: string;
      district?: string;
      state?: string;
      pincode?: string;
    }
  ): Promise<{ latitude: number; longitude: number } | null> {
    // Placeholder implementation
    // In production, use OpenStreetMap Nominatim or Google Maps Geocoding API
    
    const addressString = [
      locationData.addressLine1,
      locationData.city,
      locationData.district,
      locationData.state,
      locationData.pincode,
      'India'
    ].filter(Boolean).join(', ');

    console.log(`[LocationService] Geocoding: ${addressString}`);

    // Example with OpenStreetMap Nominatim:
    // const response = await fetch(
    //   `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressString)}&format=json&limit=1`
    // );
    // const data = await response.json();
    // if (data.length > 0) {
    //   return {
    //     latitude: parseFloat(data[0].lat),
    //     longitude: parseFloat(data[0].lon)
    //   };
    // }

    // For now, return a placeholder coordinate in India
    // This should be replaced with actual geocoding
    return {
      latitude: 28.6139, // Delhi coordinates as placeholder
      longitude: 77.2090
    };
  }

  /**
   * Update location
   */
  async updateLocation(userId: string, location: Partial<Location>): Promise<boolean> {
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }

    if (!profile.location) {
      throw new Error('No existing location to update');
    }

    // Merge with existing location
    profile.location = {
      ...profile.location,
      ...location,
      lastUpdated: new Date()
    };

    profile.updatedAt = new Date();
    await profile.save();

    return true;
  }

  /**
   * Get user location
   */
  async getLocation(userId: string): Promise<Location | null> {
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile?.location) {
      return null;
    }

    const location = profile.location as any;
    
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      addressLine1: location.addressLine1 || undefined,
      addressLine2: location.addressLine2 || undefined,
      city: location.city || undefined,
      district: location.district || undefined,
      state: location.state || undefined,
      pincode: location.pincode || undefined,
      country: location.country,
      locationType: location.locationType,
      isVerified: location.isVerified,
      lastUpdated: location.lastUpdated
    };
  }
}
