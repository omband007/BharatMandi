/**
 * Nova Vision Service for Crop Disease Diagnosis
 * 
 * Integrates with Amazon Bedrock Nova Pro for multimodal image analysis.
 * Analyzes crop images to identify diseases, pests, and crop types.
 * 
 * Requirements:
 * - 2.1: Analyze images using Amazon Bedrock Nova Pro
 * - 2.2: Identify crop type from image
 * - 2.3: Identify diseases or pests affecting the crop
 * - 2.4: Complete analysis within 2000ms
 * - 2.7: Extract visible symptoms from image
 */

import { ConverseCommand, ContentBlock, Message } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClientForModel, DEFAULT_BEDROCK_CONFIG } from './bedrock.service';
import { retryBedrockCall } from '../utils/retry.util';
import { calculateConfidence, normalizeConfidence } from '../utils/confidence-scorer.util';
import {
  mapAwsErrorToBedrockError,
  BedrockInvalidResponseError,
  BedrockTimeoutError,
} from '../errors/bedrock.errors';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Request parameters for image analysis
 */
export interface ImageAnalysisRequest {
  imageBuffer: Buffer;
  imageFormat: 'jpeg' | 'png' | 'webp';
  cropHint?: string;
  language?: string;
}

/**
 * Disease information from analysis
 */
export interface Disease {
  name: string;
  localName?: string;
  scientificName: string;
  type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  affectedParts: string[];
}

/**
 * Complete image analysis result
 */
export interface ImageAnalysisResult {
  cropType: string;
  cropLocalName?: string;
  diseases: Disease[];
  symptoms: string[];
  confidence: number;
  imageQualityScore: number;
  processingTimeMs: number;
}

/**
 * Nova Pro API response structure
 */
interface NovaProResponse {
  cropType: string;
  cropLocalName?: string;
  diseases: Array<{
    name: string;
    localName?: string;
    scientificName: string;
    type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    affectedParts: string[];
  }>;
  symptoms: string[];
  overallConfidence: number;
  imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

// ============================================================================
// PROMPT ENGINEERING
// ============================================================================

/**
 * Structured prompt for Nova Pro to ensure consistent JSON responses
 * Focuses on Indian agriculture and common crop diseases
 */
const DIAGNOSIS_PROMPT = `You are an expert agricultural pathologist specializing in Indian crops. 
Analyze the provided crop image and identify:

1. Crop type (e.g., rice, wheat, tomato, cotton, sugarcane, maize, potato, onion, chili, brinjal)
2. Any diseases or pests visible in the image
3. Symptoms observed (leaf spots, discoloration, wilting, insect damage, holes, etc.)
4. Severity level (low/medium/high) for each disease
5. Confidence in your diagnosis (0-100) for each disease

Focus on diseases and pests common in Indian agriculture, including:
- Fungal: Late blight, powdery mildew, rust, leaf spot, anthracnose
- Bacterial: Bacterial wilt, bacterial blight, soft rot
- Viral: Mosaic virus, leaf curl virus, yellow vein mosaic
- Pests: Aphids, whiteflies, bollworms, stem borers, leaf miners
- Nutrient deficiencies: Nitrogen, phosphorus, potassium, iron, magnesium

Respond ONLY with valid JSON in this exact format (no additional text):
{
  "cropType": "string",
  "diseases": [{
    "name": "string",
    "scientificName": "string",
    "type": "fungal|bacterial|viral|pest|nutrient_deficiency",
    "severity": "low|medium|high",
    "confidence": number (0-100),
    "affectedParts": ["string"]
  }],
  "symptoms": ["string"],
  "overallConfidence": number (0-100),
  "imageQuality": "excellent|good|fair|poor"
}

If the image quality is poor (blurry, dark, or unclear), indicate this in the imageQuality field and reduce confidence accordingly.
If no crop is visible, set cropType to "unknown" and diseases to empty array.
If the crop appears healthy with no visible diseases, return an empty diseases array.`;

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * Nova Vision Service for crop disease diagnosis
 */
export class NovaVisionService {
  private readonly modelId: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly topP: number;

  constructor(config = DEFAULT_BEDROCK_CONFIG) {
    this.modelId = config.modelId;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
    this.topP = config.topP;
  }

  /**
   * Build diagnosis prompt with language-specific local name requests
   */
  private buildDiagnosisPrompt(language?: string): string {
    const languageMap: Record<string, string> = {
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'mr': 'Marathi',
      'bn': 'Bengali',
      'gu': 'Gujarati',
      'pa': 'Punjabi'
    };

    const localLanguage = language && languageMap[language] ? languageMap[language] : null;
    const localNameInstruction = localLanguage 
      ? `\n\nIMPORTANT: Include local names in ${localLanguage} for both the crop type and diseases. Add these as "cropLocalName" and "localName" fields in your response.`
      : '';

    return `You are an expert agricultural pathologist specializing in Indian crops. 
Analyze the provided crop image and identify:

1. Crop type (e.g., rice, wheat, tomato, cotton, sugarcane, maize, potato, onion, chili, brinjal)
2. Any diseases or pests visible in the image
3. Symptoms observed (leaf spots, discoloration, wilting, insect damage, holes, etc.)
4. Severity level (low/medium/high) for each disease
5. Confidence in your diagnosis (0-100) for each disease

Focus on diseases and pests common in Indian agriculture, including:
- Fungal: Late blight, powdery mildew, rust, leaf spot, anthracnose
- Bacterial: Bacterial wilt, bacterial blight, soft rot
- Viral: Mosaic virus, leaf curl virus, yellow vein mosaic
- Pests: Aphids, whiteflies, bollworms, stem borers, leaf miners
- Nutrient deficiencies: Nitrogen, phosphorus, potassium, iron, magnesium${localNameInstruction}

Respond ONLY with valid JSON in this exact format (no additional text):
{
  "cropType": "string",
  "cropLocalName": "string (optional, local name in specified language)",
  "diseases": [{
    "name": "string",
    "localName": "string (optional, local name in specified language)",
    "scientificName": "string",
    "type": "fungal|bacterial|viral|pest|nutrient_deficiency",
    "severity": "low|medium|high",
    "confidence": number (0-100),
    "affectedParts": ["string"]
  }],
  "symptoms": ["string"],
  "overallConfidence": number (0-100),
  "imageQuality": "excellent|good|fair|poor"
}

If the image quality is poor (blurry, dark, or unclear), indicate this in the imageQuality field and reduce confidence accordingly.
If no crop is visible, set cropType to "unknown" and diseases to empty array.
If the crop appears healthy with no visible diseases, return an empty diseases array.`;
  }

  /**
   * Analyze crop image using Amazon Bedrock Nova Pro
   * 
   * @param request - Image analysis request parameters
   * @returns Image analysis result with crop type, diseases, and symptoms
   * @throws BedrockError if analysis fails or times out
   */
  async analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResult> {
    const startTime = Date.now();

    try {
      // Get Bedrock client for Nova Pro model
      const bedrockClient = getBedrockClientForModel(this.modelId);

      // Build multimodal content blocks
      const contentBlocks: ContentBlock[] = [
        {
          image: {
            format: request.imageFormat,
            source: {
              bytes: request.imageBuffer,
            },
          },
        },
        {
          text: this.buildDiagnosisPrompt(request.language),
        },
      ];

      // Add crop hint if provided
      if (request.cropHint) {
        contentBlocks.push({
          text: `Note: The farmer indicates this is a ${request.cropHint} plant.`,
        });
      }

      // Build message for Converse API
      const messages: Message[] = [
        {
          role: 'user',
          content: contentBlocks,
        },
      ];

      // Call Nova Pro via Converse API with retry logic
      const command = new ConverseCommand({
        modelId: this.modelId,
        messages,
        inferenceConfig: {
          maxTokens: this.maxTokens,
          temperature: this.temperature,
          topP: this.topP,
        },
      });

      // Use retry logic for Bedrock API call
      // Handles throttling, network errors, and timeouts automatically
      const response = await retryBedrockCall(() => bedrockClient.send(command));

      // Extract text response from Nova Pro
      const outputMessage = response.output?.message;
      if (!outputMessage || !outputMessage.content || outputMessage.content.length === 0) {
        throw new BedrockInvalidResponseError('No response content from Nova Pro');
      }

      const textContent = outputMessage.content.find((block) => 'text' in block);
      if (!textContent || !('text' in textContent) || !textContent.text) {
        throw new BedrockInvalidResponseError('No text content in Nova Pro response');
      }

      const responseText = textContent.text;

      // Parse JSON response
      const novaResponse = this.parseNovaResponse(responseText);

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;

      // Check if processing exceeded timeout
      if (processingTimeMs > DEFAULT_BEDROCK_CONFIG.timeout) {
        throw new BedrockTimeoutError(processingTimeMs, {
          expectedTimeout: DEFAULT_BEDROCK_CONFIG.timeout,
        });
      }

      // Convert to ImageAnalysisResult
      return this.convertToAnalysisResult(novaResponse, processingTimeMs);
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      
      // If it's already a BedrockInvalidResponseError or BedrockTimeoutError from our own code, re-throw it
      if (error instanceof BedrockInvalidResponseError || error instanceof BedrockTimeoutError) {
        throw error;
      }
      
      // Map AWS SDK errors to custom Bedrock errors
      // This handles errors from the Bedrock API call
      throw mapAwsErrorToBedrockError(error);
    }
  }

  /**
   * Parse Nova Pro JSON response with error handling
   * 
   * @param responseText - Raw text response from Nova Pro
   * @returns Parsed Nova Pro response
   * @throws BedrockInvalidResponseError if JSON is invalid or missing required fields
   */
  private parseNovaResponse(responseText: string): NovaProResponse {
    try {
      // Extract JSON from response (handle cases where model adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new BedrockInvalidResponseError('No JSON found in response', {
          responsePreview: responseText.substring(0, 200),
        });
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.cropType || typeof parsed.cropType !== 'string') {
        throw new BedrockInvalidResponseError('Missing or invalid cropType in response', {
          receivedFields: Object.keys(parsed),
        });
      }

      if (!Array.isArray(parsed.diseases)) {
        throw new BedrockInvalidResponseError('Missing or invalid diseases array in response', {
          receivedType: typeof parsed.diseases,
        });
      }

      if (!Array.isArray(parsed.symptoms)) {
        throw new BedrockInvalidResponseError('Missing or invalid symptoms array in response', {
          receivedType: typeof parsed.symptoms,
        });
      }

      if (typeof parsed.overallConfidence !== 'number') {
        throw new BedrockInvalidResponseError('Missing or invalid overallConfidence in response', {
          receivedType: typeof parsed.overallConfidence,
        });
      }

      if (!parsed.imageQuality || typeof parsed.imageQuality !== 'string') {
        throw new BedrockInvalidResponseError('Missing or invalid imageQuality in response', {
          receivedValue: parsed.imageQuality,
        });
      }

      return parsed as NovaProResponse;
    } catch (error) {
      // If it's already a BedrockInvalidResponseError, re-throw it
      if (error instanceof BedrockInvalidResponseError) {
        throw error;
      }
      
      // Wrap other errors (like JSON parse errors)
      if (error instanceof Error) {
        throw new BedrockInvalidResponseError(
          `Failed to parse Nova Pro response: ${error.message}`,
          { originalError: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Convert Nova Pro response to ImageAnalysisResult
   * 
   * @param novaResponse - Parsed Nova Pro response
   * @param processingTimeMs - Time taken for analysis
   * @returns Structured image analysis result
   */
  private convertToAnalysisResult(
    novaResponse: NovaProResponse,
    processingTimeMs: number
  ): ImageAnalysisResult {
    // Map image quality to numeric score
    const qualityScores = {
      excellent: 1.0,
      good: 0.85,
      fair: 0.70,
      poor: 0.50,
    };

    const imageQualityScore = qualityScores[novaResponse.imageQuality] || 0.50;

    // Convert diseases to our format
    const diseases: Disease[] = novaResponse.diseases.map((disease) => ({
      name: disease.name,
      localName: disease.localName,
      scientificName: disease.scientificName || '',
      type: disease.type,
      severity: disease.severity,
      confidence: normalizeConfidence(disease.confidence), // Normalize individual disease confidence
      affectedParts: disease.affectedParts || [],
    }));

    // Calculate overall confidence using confidence scoring algorithm
    // This applies image quality and multiple disease adjustments
    const confidenceScore = calculateConfidence({
      novaConfidence: normalizeConfidence(novaResponse.overallConfidence), // Normalize first
      imageQuality: novaResponse.imageQuality,
      diseaseCount: diseases.length,
    });

    return {
      cropType: novaResponse.cropType,
      cropLocalName: novaResponse.cropLocalName,
      diseases,
      symptoms: novaResponse.symptoms,
      confidence: confidenceScore.score, // Use calculated confidence score
      imageQualityScore,
      processingTimeMs,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default Nova Vision Service instance
 * Uses default Bedrock configuration
 */
export const novaVisionService = new NovaVisionService();

