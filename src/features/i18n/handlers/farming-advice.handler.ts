import { FarmingTipModel } from '../../../shared/database/mongodb-models';
import { translationService } from '../translation.service';

export interface FarmingAdviceResponse {
  crop: string;
  topic: string;
  advice: string;
  tips: string[];
  references: string[];
}

export interface FormattedFarmingAdviceResponse {
  text: string;
  data: FarmingAdviceResponse;
}

/**
 * Handler for farming advice queries
 * Queries MongoDB knowledge base for farming tips and advice
 */
export class FarmingAdviceHandler {
  /**
   * Handle farming advice query
   * @param crop - Crop name to query
   * @param topic - Topic (planting, irrigation, pest-control, harvesting)
   * @param language - User's language for response
   * @returns Farming advice and tips
   */
  async handle(crop: string, topic: string, language: string = 'en'): Promise<FarmingAdviceResponse> {
    // 1. Normalize inputs
    const normalizedCrop = this.normalizeCropName(crop);
    const normalizedTopic = this.normalizeTopic(topic);

    // 2. Query knowledge base with fuzzy matching
    const tips = await this.queryKnowledgeBase(normalizedCrop, normalizedTopic, language);

    // 3. Check if advice was found
    if (tips.length === 0) {
      // Try to find similar crops
      const suggestions = await this.getSimilarCrops(normalizedCrop, language);
      const suggestionText = suggestions.length > 0 
        ? ` Similar crops available: ${suggestions.join(', ')}`
        : '';
      
      throw new Error(`No farming advice found for ${normalizedCrop} on ${normalizedTopic}.${suggestionText}`);
    }

    // 4. Aggregate advice from multiple tips
    const aggregatedAdvice = this.aggregateAdvice(tips);

    return aggregatedAdvice;
  }

  /**
   * Format farming advice response in user's language
   * @param adviceData - Farming advice data
   * @param language - Target language code
   * @returns Formatted response with translated text
   */
  async formatResponse(
    adviceData: FarmingAdviceResponse,
    language: string
  ): Promise<FormattedFarmingAdviceResponse> {
    // Data is already in the user's language from the query
    // Create formatted text response
    const tipsText = adviceData.tips.map((tip, index) => `${index + 1}. ${tip}`).join('\n');
    const referencesText = adviceData.references.length > 0 
      ? `\n\nReferences: ${adviceData.references.join(', ')}`
      : '';

    const responseText = `${adviceData.advice}\n\nKey Tips:\n${tipsText}${referencesText}`;

    return {
      text: responseText,
      data: adviceData,
    };
  }

  /**
   * Normalize crop name for consistent querying
   */
  private normalizeCropName(crop: string): string {
    return crop.toLowerCase().trim();
  }

  /**
   * Normalize topic name and map variations to standard topics
   */
  private normalizeTopic(topic: string): string {
    const normalized = topic.toLowerCase().trim();
    
    // Map common variations to standard topics
    const topicMap: Record<string, string> = {
      'plant': 'planting',
      'sow': 'planting',
      'sowing': 'planting',
      'water': 'irrigation',
      'watering': 'irrigation',
      'pest': 'pest-control',
      'disease': 'pest-control',
      'insects': 'pest-control',
      'harvest': 'harvesting',
      'reap': 'harvesting',
      'reaping': 'harvesting',
    };

    return topicMap[normalized] || normalized;
  }

  /**
   * Query knowledge base with fuzzy matching for crop names
   * @param crop - Normalized crop name
   * @param topic - Normalized topic
   * @param language - User's language
   * @returns Array of matching farming tips
   */
  private async queryKnowledgeBase(
    crop: string,
    topic: string,
    language: string
  ): Promise<any[]> {
    try {
      // Query with exact match first
      let tips = await FarmingTipModel.find({
        crop: { $regex: new RegExp(`^${crop}$`, 'i') },
        topic: { $regex: new RegExp(`^${topic}$`, 'i') },
        language: language,
      }).lean();

      // If no exact match, try fuzzy matching on crop name
      if (tips.length === 0) {
        tips = await FarmingTipModel.find({
          crop: { $regex: new RegExp(crop, 'i') },
          topic: { $regex: new RegExp(`^${topic}$`, 'i') },
          language: language,
        }).lean();
      }

      // If still no match and language is not English, try English as fallback
      if (tips.length === 0 && language !== 'en') {
        tips = await FarmingTipModel.find({
          crop: { $regex: new RegExp(crop, 'i') },
          topic: { $regex: new RegExp(`^${topic}$`, 'i') },
          language: 'en',
        }).lean();
      }

      return tips;
    } catch (error) {
      console.error('[FarmingAdviceHandler] Database query error:', error);
      throw new Error('Failed to query farming advice database');
    }
  }

  /**
   * Aggregate advice from multiple tips
   * Combines advice, tips, and references from all matching entries
   */
  private aggregateAdvice(tips: any[]): FarmingAdviceResponse {
    if (tips.length === 0) {
      throw new Error('No tips to aggregate');
    }

    // Use the first tip as base
    const firstTip = tips[0];
    
    // Combine advice from all tips
    const allAdvice = tips.map(t => t.advice).join(' ');
    
    // Combine all tips (remove duplicates)
    const allTips = [...new Set(tips.flatMap(t => t.tips))];
    
    // Combine all references (remove duplicates)
    const allReferences = [...new Set(tips.flatMap(t => t.references))];

    return {
      crop: firstTip.crop,
      topic: firstTip.topic,
      advice: allAdvice,
      tips: allTips,
      references: allReferences,
    };
  }

  /**
   * Get similar crop names for suggestions
   * @param crop - Crop name that wasn't found
   * @param language - User's language
   * @returns Array of similar crop names
   */
  private async getSimilarCrops(crop: string, language: string): Promise<string[]> {
    try {
      // Get all unique crops in the user's language
      const allCrops = await FarmingTipModel.distinct('crop', { language });
      
      // Calculate similarity scores
      const similarities = allCrops.map(existingCrop => ({
        crop: existingCrop,
        score: this.calculateSimilarity(crop, existingCrop),
      }));
      
      // Sort by similarity and return top 3
      return similarities
        .filter(s => s.score > 0.5) // Only return if similarity > 50%
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(s => s.crop);
    } catch (error) {
      console.error('[FarmingAdviceHandler] Error getting similar crops:', error);
      return [];
    }
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
    
    // Check if shorter is contained in longer
    if (longer.includes(shorter)) return 0.8;
    
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
