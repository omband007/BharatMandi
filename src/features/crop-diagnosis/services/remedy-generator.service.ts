/**
 * Remedy Generator Service
 * 
 * Generates treatment recommendations based on disease diagnosis.
 * 
 * Requirements:
 * - 4.1: Provide at least one chemical remedy with confidence ≥80%
 * - 4.8: Provide crop-specific chemical recommendations
 * - 5.1: Provide at least one organic remedy alternative
 * - 6.1: Include at least three preventive measures
 */

import path from 'path';
import fs from 'fs/promises';
import { translationService } from '../../i18n/translation.service';

// ============================================================================
// TYPES
// ============================================================================

export interface Disease {
  name: string;
  scientificName: string;
  type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  affectedParts: string[];
}

export interface RemedyRequest {
  disease: Disease;
  cropType: string;
  location?: {
    state: string;
    district?: string;
  };
  language?: string;
  growthStage?: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'maturity';
  currentDate?: Date;
}

export interface ChemicalRemedy {
  name: string;
  genericName: string;
  brandNames: string[];
  dosage: string;
  applicationMethod: string;
  frequency: string;
  duration?: string;
  preHarvestInterval: number;
  safetyPrecautions: string[];
  estimatedCost: string;
  source?: 'rag' | 'basic'; // Indicates if remedy is from RAG or basic
  citationIds?: string[]; // Citation IDs if from RAG
  confidence?: number; // Confidence score
}

export interface OrganicRemedy {
  name: string;
  ingredients: string[];
  preparation: string[];
  applicationMethod: string;
  frequency: string;
  effectiveness: string;
  commercialProducts?: string[];
  source?: 'rag' | 'basic'; // Indicates if remedy is from RAG or basic
  citationIds?: string[]; // Citation IDs if from RAG
  confidence?: number; // Confidence score
}

export interface PreventiveMeasure {
  category: 'crop_rotation' | 'irrigation' | 'spacing' | 'soil_health' | 'timing';
  description: string;
  timing?: string;
  frequency?: string;
  source?: 'rag' | 'basic'; // Indicates if remedy is from RAG or basic
  citationIds?: string[]; // Citation IDs if from RAG
  confidence?: number; // Confidence score
}

export interface RemedyResponse {
  chemical: ChemicalRemedy[];
  organic: OrganicRemedy[];
  preventive: PreventiveMeasure[];
  regionalNotes?: string;
  seasonalNotes?: string;
}

// Indian agricultural seasons
type Season = 'kharif' | 'rabi' | 'zaid';

// Regional product availability by state
interface RegionalAvailability {
  [state: string]: {
    preferredBrands: string[];
    localProducts: string[];
  };
}

interface KnowledgeBaseDisease {
  name: string;
  scientificName: string;
  affectedCrops: string[];
  chemicalRemedies: Array<{
    genericName: string;
    brandNames: string[];
    dosage: string;
    applicationMethod: string;
    frequency: string;
    preHarvestInterval: number;
    safetyPrecautions: string[];
    costEstimate: string;
  }>;
  organicRemedies: Array<{
    name: string;
    ingredients: string[];
    preparation: string[];
    applicationMethod: string;
    frequency: string;
    effectiveness: string;
    commercialProducts?: string[];
  }>;
  preventiveMeasures: Array<{
    category: string;
    description: string;
    timing?: string;
    frequency?: string;
  }>;
}

interface KnowledgeBase {
  fungal: KnowledgeBaseDisease[];
  bacterial: KnowledgeBaseDisease[];
  viral: KnowledgeBaseDisease[];
  pests: KnowledgeBaseDisease[];
  nutrient_deficiency: KnowledgeBaseDisease[];
}

// ============================================================================
// REMEDY GENERATOR SERVICE
// ============================================================================

export class RemedyGenerator {
  private knowledgeBase: KnowledgeBase | null = null;
  private readonly knowledgeBasePath: string;
  private readonly TRANSLATION_CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

  // Regional product availability mapping
  private readonly regionalAvailability: RegionalAvailability = {
    'Maharashtra': {
      preferredBrands: ['Dhanuka', 'UPL', 'Bayer CropScience'],
      localProducts: ['Jivamrut', 'Panchagavya']
    },
    'Punjab': {
      preferredBrands: ['Syngenta', 'Bayer CropScience', 'Rallis India'],
      localProducts: ['Neem cake', 'Vermicompost']
    },
    'Karnataka': {
      preferredBrands: ['UPL', 'Coromandel', 'Rallis India'],
      localProducts: ['Jeevamrutha', 'Beejamrutha']
    },
    'Tamil Nadu': {
      preferredBrands: ['Coromandel', 'Rallis India', 'PI Industries'],
      localProducts: ['Panchagavya', 'Amudha Karaisal']
    },
    'Uttar Pradesh': {
      preferredBrands: ['Bayer CropScience', 'Syngenta', 'UPL'],
      localProducts: ['Neem oil', 'Cow urine']
    },
    'Gujarat': {
      preferredBrands: ['UPL', 'Dhanuka', 'Rallis India'],
      localProducts: ['Neem extract', 'Buttermilk spray']
    },
    'Rajasthan': {
      preferredBrands: ['Rallis India', 'Dhanuka', 'PI Industries'],
      localProducts: ['Neem cake', 'Garlic extract']
    },
    'Madhya Pradesh': {
      preferredBrands: ['Bayer CropScience', 'UPL', 'Coromandel'],
      localProducts: ['Neem oil', 'Cow dung slurry']
    },
    'West Bengal': {
      preferredBrands: ['Rallis India', 'Coromandel', 'PI Industries'],
      localProducts: ['Neem oil', 'Turmeric powder']
    },
    'Andhra Pradesh': {
      preferredBrands: ['Coromandel', 'UPL', 'Rallis India'],
      localProducts: ['Panchagavya', 'Neem cake']
    },
    'Telangana': {
      preferredBrands: ['Coromandel', 'UPL', 'Bayer CropScience'],
      localProducts: ['Panchagavya', 'Jeevamrutha']
    },
    'Haryana': {
      preferredBrands: ['Syngenta', 'Bayer CropScience', 'UPL'],
      localProducts: ['Neem oil', 'Vermicompost']
    }
  };

  constructor() {
    // Path to knowledge base directory
    this.knowledgeBasePath = path.join(
      __dirname,
      '..',
      'data',
      'knowledge-base'
    );
  }

  /**
   * Load knowledge base from JSON files
   * 
   * Loads all disease-remedy mappings from JSON files:
   * - fungal.json
   * - bacterial.json
   * - viral.json
   * - pests.json
   * - nutrient-deficiency.json
   */
  private async loadKnowledgeBase(): Promise<void> {
    if (this.knowledgeBase) {
      return; // Already loaded
    }

    try {
      const [fungal, bacterial, viral, pests, nutrientDeficiency] = await Promise.all([
        this.loadJsonFile('fungal.json'),
        this.loadJsonFile('bacterial.json'),
        this.loadJsonFile('viral.json'),
        this.loadJsonFile('pests.json'),
        this.loadJsonFile('nutrient-deficiency.json')
      ]);

      this.knowledgeBase = {
        fungal: fungal.diseases,
        bacterial: bacterial.diseases,
        viral: viral.diseases,
        pests: pests.diseases,
        nutrient_deficiency: nutrientDeficiency.diseases
      };
    } catch (error) {
      throw new Error(
        `Failed to load knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load a JSON file from the knowledge base directory
   */
  private async loadJsonFile(filename: string): Promise<{ diseases: KnowledgeBaseDisease[] }> {
    const filePath = path.join(this.knowledgeBasePath, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Generate remedy recommendations for a diagnosed disease
   * 
   * Requirements:
   * - 4.1: Provide at least one chemical remedy
   * - 4.8: Provide crop-specific recommendations
   * - 5.1: Provide at least one organic remedy
   * - 6.1: Include at least three preventive measures
   * - 11.1: Provide region-specific remedy recommendations
   * - 11.2: Consider local climate and seasonal patterns
   * - 11.3: Recommend products available in local markets
   * - 11.4: Tailor recommendations to crop growth stage
   * - 11.5: Consider regional pest and disease prevalence patterns
   * - 8.1: Support multilingual translation
   * - 8.2: Translate disease names, remedy instructions, preventive measures
   * - 8.3: Preserve technical accuracy and dosage information
   * - 8.4: Cache translated content for 24 hours
   */
  async generateRemedies(request: RemedyRequest): Promise<RemedyResponse> {
    // Ensure knowledge base is loaded
    await this.loadKnowledgeBase();

    if (!this.knowledgeBase) {
      throw new Error('Knowledge base not loaded');
    }

    // Find disease in knowledge base
    const diseaseData = this.findDisease(request.disease);

    if (!diseaseData) {
      // Return empty remedies if disease not found
      return {
        chemical: [],
        organic: [],
        preventive: []
      };
    }

    // Check if disease affects the specified crop
    const affectsCrop = this.checkCropCompatibility(diseaseData, request.cropType);

    // Map chemical remedies
    let chemical = diseaseData.chemicalRemedies.map(remedy => ({
      name: remedy.genericName,
      genericName: remedy.genericName,
      brandNames: remedy.brandNames,
      dosage: remedy.dosage,
      applicationMethod: remedy.applicationMethod,
      frequency: remedy.frequency,
      preHarvestInterval: remedy.preHarvestInterval,
      safetyPrecautions: remedy.safetyPrecautions,
      estimatedCost: remedy.costEstimate
    }));

    // Map organic remedies
    let organic = diseaseData.organicRemedies.map(remedy => ({
      name: remedy.name,
      ingredients: remedy.ingredients,
      preparation: remedy.preparation,
      applicationMethod: remedy.applicationMethod,
      frequency: remedy.frequency,
      effectiveness: remedy.effectiveness,
      commercialProducts: remedy.commercialProducts
    }));

    // Map preventive measures
    let preventive = diseaseData.preventiveMeasures.map(measure => ({
      category: measure.category as PreventiveMeasure['category'],
      description: measure.description,
      timing: measure.timing,
      frequency: measure.frequency
    }));

    // Add crop compatibility note if disease doesn't typically affect this crop
    if (!affectsCrop && chemical.length > 0) {
      chemical[0].safetyPrecautions = [
        `Note: This disease is not commonly reported in ${request.cropType}. Verify diagnosis before treatment.`,
        ...chemical[0].safetyPrecautions
      ];
    }

    let response: RemedyResponse = {
      chemical,
      organic,
      preventive
    };

    // Apply regional customization if location is provided (Requirement 11.1, 11.3)
    if (request.location?.state) {
      response = this.applyRegionalCustomization(response, request.location.state);
    }

    // Add seasonal guidance (Requirement 11.2, 11.5)
    const currentDate = request.currentDate || new Date();
    const season = this.getCurrentSeason(currentDate);
    const diseaseType = request.disease.type === 'pest' ? 'pest' : request.disease.type;
    const seasonalGuidance = this.getSeasonalGuidance(season, diseaseType);
    
    if (seasonalGuidance) {
      response.seasonalNotes = seasonalGuidance;
    }

    // Customize for growth stage if provided (Requirement 11.4)
    if (request.growthStage) {
      response = this.customizeForGrowthStage(response, request.growthStage);
    }

    // Translate to target language if specified (Requirements 8.1, 8.2, 8.3, 8.4)
    if (request.language && request.language !== 'en') {
      response = await this.translateRemedies(response, request.language);
    }

    return response;
  }

  /**
   * Find disease in knowledge base by name and type
   */
  private findDisease(disease: Disease): KnowledgeBaseDisease | null {
    if (!this.knowledgeBase) {
      return null;
    }

    // Get diseases of the specified type
    const diseaseType = disease.type === 'pest' ? 'pests' : disease.type;
    const diseases = this.knowledgeBase[diseaseType];

    if (!diseases) {
      return null;
    }

    // Find by exact name match (case-insensitive)
    const diseaseName = disease.name.toLowerCase();
    let found = diseases.find(d => d.name.toLowerCase() === diseaseName);

    // If not found, try partial match
    if (!found) {
      found = diseases.find(d => 
        d.name.toLowerCase().includes(diseaseName) ||
        diseaseName.includes(d.name.toLowerCase())
      );
    }

    // If still not found, try scientific name match
    if (!found && disease.scientificName) {
      const scientificName = disease.scientificName.toLowerCase();
      found = diseases.find(d => 
        d.scientificName.toLowerCase() === scientificName ||
        d.scientificName.toLowerCase().includes(scientificName) ||
        scientificName.includes(d.scientificName.toLowerCase())
      );
    }

    return found || null;
  }

  /**
   * Check if disease affects the specified crop
   */
  private checkCropCompatibility(
    diseaseData: KnowledgeBaseDisease,
    cropType: string
  ): boolean {
    const normalizedCrop = cropType.toLowerCase().trim();
    return diseaseData.affectedCrops.some(
      crop => crop.toLowerCase() === normalizedCrop
    );
  }

  /**
   * Get all diseases from knowledge base (for testing/debugging)
   */
  async getAllDiseases(): Promise<KnowledgeBase> {
    await this.loadKnowledgeBase();
    if (!this.knowledgeBase) {
      throw new Error('Knowledge base not loaded');
    }
    return this.knowledgeBase;
  }

  /**
   * Determine current Indian agricultural season based on date
   * 
   * Kharif: June-October (monsoon crops)
   * Rabi: November-March (winter crops)
   * Zaid: April-May (summer crops)
   */
  private getCurrentSeason(date: Date = new Date()): Season {
    const month = date.getMonth() + 1; // 1-12
    
    if (month >= 6 && month <= 10) {
      return 'kharif';
    } else if (month >= 11 || month <= 3) {
      return 'rabi';
    } else {
      return 'zaid';
    }
  }

  /**
   * Get seasonal guidance based on current season
   */
  private getSeasonalGuidance(season: Season, diseaseType: string): string {
    const seasonalGuidance: Record<Season, Record<string, string>> = {
      kharif: {
        fungal: 'Monsoon season increases fungal disease risk. Apply preventive fungicides before heavy rains. Ensure good drainage.',
        bacterial: 'High humidity during monsoon favors bacterial diseases. Avoid overhead irrigation and ensure proper plant spacing.',
        viral: 'Vector insects are more active during monsoon. Control aphids and whiteflies to prevent virus spread.',
        pest: 'Pest activity increases during monsoon. Monitor crops regularly and apply organic neem spray preventively.',
        nutrient_deficiency: 'Heavy rains can leach nutrients. Apply balanced fertilizers and foliar sprays during breaks in rainfall.'
      },
      rabi: {
        fungal: 'Cool, dry winter conditions reduce fungal pressure. Focus on seed treatment and early season protection.',
        bacterial: 'Lower bacterial disease risk in winter. Maintain crop hygiene and remove infected plant debris.',
        viral: 'Vector activity is lower in winter. Good time for disease-free crop establishment.',
        pest: 'Pest pressure is moderate. Monitor for winter-active pests like aphids and caterpillars.',
        nutrient_deficiency: 'Apply organic manure before sowing. Winter crops benefit from phosphorus-rich fertilizers.'
      },
      zaid: {
        fungal: 'Hot, dry summer reduces fungal diseases. Focus on irrigation management to prevent stress.',
        bacterial: 'Bacterial wilt risk increases in hot weather. Ensure adequate soil moisture and avoid water stress.',
        viral: 'High vector activity in summer. Use reflective mulches and sticky traps to control whiteflies.',
        pest: 'Peak pest activity in summer. Regular monitoring and early intervention are critical.',
        nutrient_deficiency: 'High temperatures increase nutrient demand. Apply potassium-rich fertilizers for heat tolerance.'
      }
    };

    return seasonalGuidance[season][diseaseType] || '';
  }

  /**
   * Customize remedy dosage and timing based on crop growth stage
   */
  private customizeForGrowthStage(
    remedies: RemedyResponse,
    growthStage: string
  ): RemedyResponse {
    const stageGuidance: Record<string, string> = {
      seedling: 'Use half the recommended dosage for young seedlings. Focus on preventive measures.',
      vegetative: 'Apply standard dosage. This is the critical stage for disease prevention.',
      flowering: 'Avoid spraying during peak flowering hours (10 AM - 4 PM) to protect pollinators. Use lower dosage if needed.',
      fruiting: 'Check pre-harvest interval carefully. Consider organic alternatives if harvest is near.',
      maturity: 'Avoid chemical sprays if harvest is within 2 weeks. Use only organic remedies with no residue.'
    };

    // Add growth stage notes to chemical remedies
    if (remedies.chemical.length > 0 && stageGuidance[growthStage]) {
      remedies.chemical = remedies.chemical.map(remedy => ({
        ...remedy,
        safetyPrecautions: [
          `Growth Stage Note: ${stageGuidance[growthStage]}`,
          ...remedy.safetyPrecautions
        ]
      }));
    }

    // Adjust dosage for seedling stage
    if (growthStage === 'seedling' && remedies.chemical.length > 0) {
      remedies.chemical = remedies.chemical.map(remedy => ({
        ...remedy,
        dosage: `${remedy.dosage} (reduce to 50% for seedlings)`
      }));
    }

    // Prioritize organic remedies for maturity stage
    if (growthStage === 'maturity' && remedies.organic.length > 0) {
      remedies.organic = remedies.organic.map(remedy => ({
        ...remedy,
        effectiveness: `${remedy.effectiveness} (Recommended for crops near harvest)`
      }));
    }

    return remedies;
  }

  /**
   * Filter and prioritize remedies based on regional availability
   */
  private applyRegionalCustomization(
    remedies: RemedyResponse,
    state: string
  ): RemedyResponse {
    const regional = this.regionalAvailability[state];
    
    if (!regional) {
      return remedies; // No customization for unknown states
    }

    // Prioritize chemical remedies with regionally available brands
    if (remedies.chemical.length > 0) {
      remedies.chemical = remedies.chemical.map(remedy => {
        // Filter brand names to show regionally available ones first
        const availableBrands = remedy.brandNames.filter(brand =>
          regional.preferredBrands.some(preferred =>
            brand.toLowerCase().includes(preferred.toLowerCase())
          )
        );
        
        const otherBrands = remedy.brandNames.filter(brand =>
          !availableBrands.includes(brand)
        );

        return {
          ...remedy,
          brandNames: [...availableBrands, ...otherBrands]
        };
      });
    }

    // Add regional organic products
    if (remedies.organic.length > 0) {
      remedies.organic = remedies.organic.map(remedy => {
        const regionalProducts = remedy.commercialProducts || [];
        const localProducts = regional.localProducts.filter(product =>
          !regionalProducts.includes(product)
        );

        return {
          ...remedy,
          commercialProducts: [...regionalProducts, ...localProducts]
        };
      });
    }

    // Add regional note
    remedies.regionalNotes = `Recommendations customized for ${state}. Preferred brands and local products are listed first.`;

    return remedies;
  }

  /**
   * Translate remedy response to target language
   * 
   * Requirements:
   * - 8.2: Translate disease names, remedy instructions, preventive measures
   * - 8.3: Preserve numeric dosage values during translation
   * - 8.4: Cache translated content for 24 hours (handled by translationService)
   * 
   * Uses batch translation for efficiency to minimize API calls.
   * Numeric values (dosages, costs, intervals) are preserved.
   */
  private async translateRemedies(
    remedies: RemedyResponse,
    targetLanguage: string
  ): Promise<RemedyResponse> {
    try {
      // Collect all text fields that need translation
      const textsToTranslate: string[] = [];
      const textMap: Map<string, number> = new Map(); // Map text to index

      // Helper to add text and track its index
      const addText = (text: string): number => {
        if (!textMap.has(text)) {
          const index = textsToTranslate.length;
          textsToTranslate.push(text);
          textMap.set(text, index);
        }
        return textMap.get(text)!;
      };

      // Track indices for each field
      const chemicalIndices = remedies.chemical.map(remedy => ({
        nameIndex: addText(remedy.name),
        applicationMethodIndex: addText(remedy.applicationMethod),
        frequencyIndex: addText(remedy.frequency),
        durationIndex: remedy.duration ? addText(remedy.duration) : null,
        safetyPrecautionsIndices: remedy.safetyPrecautions.map(p => addText(p))
      }));

      const organicIndices = remedies.organic.map(remedy => ({
        nameIndex: addText(remedy.name),
        ingredientsIndices: remedy.ingredients.map(i => addText(i)),
        preparationIndices: remedy.preparation.map(p => addText(p)),
        applicationMethodIndex: addText(remedy.applicationMethod),
        frequencyIndex: addText(remedy.frequency),
        effectivenessIndex: addText(remedy.effectiveness),
        commercialProductsIndices: remedy.commercialProducts?.map(p => addText(p)) || []
      }));

      const preventiveIndices = remedies.preventive.map(measure => ({
        descriptionIndex: addText(measure.description),
        timingIndex: measure.timing ? addText(measure.timing) : null,
        frequencyIndex: measure.frequency ? addText(measure.frequency) : null
      }));

      // Add optional notes
      const regionalNotesIndex = remedies.regionalNotes ? addText(remedies.regionalNotes) : null;
      const seasonalNotesIndex = remedies.seasonalNotes ? addText(remedies.seasonalNotes) : null;

      // Batch translate all texts
      const translatedTexts = await translationService.translateBatch(
        textsToTranslate,
        'en',
        targetLanguage
      );

      // Reconstruct remedies with translated text
      const translatedChemical = remedies.chemical.map((remedy, i) => ({
        ...remedy,
        name: translatedTexts[chemicalIndices[i].nameIndex],
        applicationMethod: translatedTexts[chemicalIndices[i].applicationMethodIndex],
        frequency: translatedTexts[chemicalIndices[i].frequencyIndex],
        duration: chemicalIndices[i].durationIndex !== null 
          ? translatedTexts[chemicalIndices[i].durationIndex!]
          : remedy.duration,
        safetyPrecautions: chemicalIndices[i].safetyPrecautionsIndices.map(
          idx => translatedTexts[idx]
        ),
        // Preserve numeric/cost values - do not translate
        dosage: remedy.dosage,
        preHarvestInterval: remedy.preHarvestInterval,
        estimatedCost: remedy.estimatedCost,
        genericName: remedy.genericName, // Keep original for reference
        brandNames: remedy.brandNames // Keep brand names in original language
      }));

      const translatedOrganic = remedies.organic.map((remedy, i) => ({
        ...remedy,
        name: translatedTexts[organicIndices[i].nameIndex],
        ingredients: organicIndices[i].ingredientsIndices.map(idx => translatedTexts[idx]),
        preparation: organicIndices[i].preparationIndices.map(idx => translatedTexts[idx]),
        applicationMethod: translatedTexts[organicIndices[i].applicationMethodIndex],
        frequency: translatedTexts[organicIndices[i].frequencyIndex],
        effectiveness: translatedTexts[organicIndices[i].effectivenessIndex],
        commercialProducts: organicIndices[i].commercialProductsIndices.map(
          idx => translatedTexts[idx]
        )
      }));

      const translatedPreventive = remedies.preventive.map((measure, i) => ({
        ...measure,
        description: translatedTexts[preventiveIndices[i].descriptionIndex],
        timing: preventiveIndices[i].timingIndex !== null
          ? translatedTexts[preventiveIndices[i].timingIndex!]
          : measure.timing,
        frequency: preventiveIndices[i].frequencyIndex !== null
          ? translatedTexts[preventiveIndices[i].frequencyIndex!]
          : measure.frequency
      }));

      return {
        chemical: translatedChemical,
        organic: translatedOrganic,
        preventive: translatedPreventive,
        regionalNotes: regionalNotesIndex !== null 
          ? translatedTexts[regionalNotesIndex]
          : remedies.regionalNotes,
        seasonalNotes: seasonalNotesIndex !== null
          ? translatedTexts[seasonalNotesIndex]
          : remedies.seasonalNotes
      };
    } catch (error) {
      // If translation fails, log error and return original remedies
      console.error('[RemedyGenerator] Translation failed:', error);
      return remedies;
    }
  }
}

// Export singleton instance
export const remedyGenerator = new RemedyGenerator();
