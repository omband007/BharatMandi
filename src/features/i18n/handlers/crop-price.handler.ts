import type { DatabaseManager } from '../../../shared/database/db-abstraction';
import type { Listing } from '../../marketplace/marketplace.types';
import { translationService } from '../translation.service';

export interface CropPriceResponse {
  crop: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  lastUpdated: Date;
  sampleSize: number;
}

export interface FormattedCropPriceResponse {
  text: string;
  data: CropPriceResponse;
}

/**
 * Handler for crop price queries
 * Queries marketplace database for active listings and calculates price statistics
 */
export class CropPriceHandler {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Handle crop price query
   * @param crop - Crop name to query
   * @param location - Optional location filter
   * @returns Price statistics and trend
   */
  async handle(crop: string, location?: string): Promise<CropPriceResponse> {
    // 1. Normalize crop name
    const normalizedCrop = this.normalizeCropName(crop);

    // 2. Query marketplace database for active listings
    const listings = await this.getActiveListings(normalizedCrop, location);

    // 3. Check if crop was found
    if (listings.length === 0) {
      // Get suggestions for similar crops
      const suggestions = await this.getSimilarCrops(normalizedCrop);
      const suggestionText = suggestions.length > 0 
        ? ` Did you mean: ${suggestions.join(', ')}?`
        : '';
      
      throw new Error(`No listings found for "${normalizedCrop}".${suggestionText}`);
    }

    // 4. Calculate statistics
    const prices = listings.map(l => l.pricePerKg);
    const avgPrice = this.average(prices);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // 5. Calculate trend (compare with last 7 days)
    const trend = await this.calculateTrend(normalizedCrop, avgPrice);

    return {
      crop: normalizedCrop,
      averagePrice: Math.round(avgPrice * 100) / 100, // Round to 2 decimal places
      minPrice: Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      trend,
      unit: 'kg',
      lastUpdated: new Date(),
      sampleSize: listings.length,
    };
  }

  /**
   * Format crop price response in user's language
   * @param priceData - Price statistics
   * @param language - Target language code
   * @returns Formatted response with translated text
   */
  async formatResponse(
    priceData: CropPriceResponse,
    language: string
  ): Promise<FormattedCropPriceResponse> {
    // Create English response template with farm gate and retail prices
    const trendText = priceData.trend === 'up' ? 'increasing' : 
                     priceData.trend === 'down' ? 'decreasing' : 'stable';
    
    // Calculate estimated retail price (typically 30-50% markup from farm gate)
    const retailMarkup = 1.4; // 40% markup
    const estimatedRetailPrice = Math.round(priceData.averagePrice * retailMarkup * 100) / 100;
    const retailMinPrice = Math.round(priceData.minPrice * retailMarkup * 100) / 100;
    const retailMaxPrice = Math.round(priceData.maxPrice * retailMarkup * 100) / 100;
    
    const englishText = `📊 ${priceData.crop.toUpperCase()} PRICE INFORMATION\n\n` +
      `🌾 FARM GATE PRICE (What farmers are selling at):\n` +
      `Average: ₹${priceData.averagePrice} per ${priceData.unit}\n` +
      `Range: ₹${priceData.minPrice} - ₹${priceData.maxPrice} per ${priceData.unit}\n\n` +
      `🏪 ESTIMATED RETAIL PRICE (Market price for consumers):\n` +
      `Average: ₹${estimatedRetailPrice} per ${priceData.unit}\n` +
      `Range: ₹${retailMinPrice} - ₹${retailMaxPrice} per ${priceData.unit}\n\n` +
      `📈 Price Trend: ${trendText.toUpperCase()}\n` +
      `📍 Based on ${priceData.sampleSize} active farmer listings`;

    // Translate to user's language if needed
    let responseText = englishText;
    if (language !== 'en') {
      try {
        const translation = await translationService.translateText({
          text: englishText,
          sourceLanguage: 'en',
          targetLanguage: language,
        });
        responseText = translation.translatedText;
      } catch (error) {
        console.error('[CropPriceHandler] Translation failed:', error);
        // Fall back to English if translation fails
      }
    }

    return {
      text: responseText,
      data: priceData,
    };
  }

  /**
   * Normalize crop name for consistent querying
   * Converts to lowercase and trims whitespace
   */
  private normalizeCropName(crop: string): string {
    return crop.toLowerCase().trim();
  }

  /**
   * Get active listings for a specific crop
   * @param crop - Normalized crop name
   * @param location - Optional location filter (not implemented yet)
   * @returns Array of matching listings
   */
  private async getActiveListings(crop: string, location?: string): Promise<Listing[]> {
    // Get all active listings
    const allListings = await this.dbManager.getActiveListings();

    // Filter by crop name (case-insensitive partial match)
    const filteredListings = allListings.filter(listing => 
      listing.produceType.toLowerCase().includes(crop)
    );

    // TODO: Add location filtering when location data is available
    // if (location) {
    //   filteredListings = filteredListings.filter(listing => 
    //     listing.location?.toLowerCase().includes(location.toLowerCase())
    //   );
    // }

    return filteredListings;
  }

  /**
   * Calculate average of an array of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    return sum / numbers.length;
  }

  /**
   * Calculate price trend by comparing current price with historical data
   * @param crop - Normalized crop name
   * @param currentAvgPrice - Current average price
   * @returns Trend indicator
   */
  private async calculateTrend(
    crop: string,
    currentAvgPrice: number
  ): Promise<'up' | 'down' | 'stable'> {
    // Get historical data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all active listings (in a real implementation, we'd query by date range)
    const allListings = await this.dbManager.getActiveListings();
    
    // Filter by crop and date
    const historicalListings = allListings.filter(listing => 
      listing.produceType.toLowerCase().includes(crop) &&
      listing.createdAt < sevenDaysAgo
    );

    // If no historical data, trend is stable
    if (historicalListings.length === 0) {
      return 'stable';
    }

    // Calculate historical average
    const historicalPrices = historicalListings.map(l => l.pricePerKg);
    const historicalAvgPrice = this.average(historicalPrices);

    // Compare current vs historical (5% threshold for stability)
    const percentChange = ((currentAvgPrice - historicalAvgPrice) / historicalAvgPrice) * 100;

    if (percentChange > 5) {
      return 'up';
    } else if (percentChange < -5) {
      return 'down';
    } else {
      return 'stable';
    }
  }

  /**
   * Get similar crop names for suggestions
   * Uses simple string similarity (Levenshtein distance)
   * @param crop - Crop name that wasn't found
   * @returns Array of similar crop names
   */
  private async getSimilarCrops(crop: string): Promise<string[]> {
    // Get all active listings
    const allListings = await this.dbManager.getActiveListings();
    
    // Extract unique crop names
    const uniqueCrops = [...new Set(allListings.map(l => l.produceType.toLowerCase()))];
    
    // Calculate similarity scores
    const similarities = uniqueCrops.map(existingCrop => ({
      crop: existingCrop,
      score: this.calculateSimilarity(crop, existingCrop),
    }));
    
    // Sort by similarity and return top 3
    return similarities
      .filter(s => s.score > 0.5) // Only return if similarity > 50%
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.crop);
  }

  /**
   * Calculate string similarity using simple character overlap
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity score between 0 and 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    // Check if shorter is contained in longer (but only if lengths are close)
    const lengthRatio = shorter.length / longer.length;
    if (longer.includes(shorter) && lengthRatio > 0.7) {
      return 0.85;
    }
    
    // Count matching characters
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }
    
    return matches / longer.length;
  }
}
