/**
 * RAG Response Generator Service
 * 
 * Generates enhanced diagnosis responses using retrieved documents and LLM.
 * Implements prompt engineering, citation extraction, and recommendation filtering.
 * 
 * Requirements:
 * - 4.1: Combine disease identification with retrieved documents
 * - 4.2: Call Nova Pro or Claude via AWS Bedrock
 * - 4.3: Parse LLM response into structured format
 * - 4.4: Include evidence-based recommendations
 * - 4.5: Include regional and seasonal context
 * - 4.7: Extract and format citations
 * - 4.8: Calculate confidence scores
 * - 4.9: Filter unsupported recommendations
 * - 4.11: Check for contradictory recommendations
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClientForModel, DEFAULT_BEDROCK_CONFIG } from './bedrock.service';
import { RetrievedDocument } from './rag-retrieval.service';

/**
 * Disease identification result from Nova Pro
 */
export interface DiseaseIdentification {
  name: string;
  scientificName: string;
  type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  symptoms: string[];
  affectedParts: string[];
}

/**
 * Citation linking recommendation to source document
 */
export interface Citation {
  citationId: string;
  documentId: string;
  title: string;
  excerpt: string;
  source: string;
  author?: string;
  publicationDate?: string;
  url?: string;
  relevanceScore: number;
}

/**
 * Chemical treatment recommendation
 */
export interface ChemicalRecommendation {
  name: string;
  activeIngredient: string;
  dosage: string;
  applicationMethod: string;
  frequency: string;
  precautions: string[];
  effectivenessRate?: number;
  citationIds: string[];
  confidence: number;
}

/**
 * Organic treatment recommendation
 */
export interface OrganicRecommendation {
  name: string;
  ingredients: string[];
  preparation: string;
  applicationMethod: string;
  frequency: string;
  effectivenessRate?: number;
  citationIds: string[];
  confidence: number;
}

/**
 * Preventive measure recommendation
 */
export interface PreventiveRecommendation {
  measure: string;
  description: string;
  timing: string;
  effectivenessRate?: number;
  citationIds: string[];
  confidence: number;
}

/**
 * Enhanced diagnosis response with RAG
 */
export interface EnhancedDiagnosisResponse {
  disease: DiseaseIdentification;
  detailedDescription: string;
  chemicalTreatments: ChemicalRecommendation[];
  organicTreatments: OrganicRecommendation[];
  preventiveMeasures: PreventiveRecommendation[];
  regionalNotes?: string;
  seasonalNotes?: string;
  citations: Citation[];
  generationTimeMs: number;
}

/**
 * Generation request parameters
 */
export interface GenerationRequest {
  disease: DiseaseIdentification;
  cropType: string;
  retrievedDocuments: RetrievedDocument[];
  location?: {
    state: string;
    district?: string;
  };
  season?: 'kharif' | 'rabi' | 'zaid';
  language: string;
}

/**
 * RAG Response Generator Configuration
 */
export interface RAGGeneratorConfig {
  modelId: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  minCitationsPerRecommendation: number;
  minConfidenceScore: number;
}

export const DEFAULT_RAG_GENERATOR_CONFIG: RAGGeneratorConfig = {
  modelId: process.env.RAG_MODEL_ID || 'amazon.nova-pro-v1:0',
  maxTokens: 4000,
  temperature: 0.3,
  timeout: parseInt(process.env.GENERATION_TIMEOUT_MS || '10000', 10), // Default 10 seconds
  minCitationsPerRecommendation: 1,
  minConfidenceScore: 0.5,
};

/**
 * RAG Response Generator Service
 * 
 * Orchestrates enhanced response generation:
 * 1. Constructs prompt with disease info and retrieved documents
 * 2. Calls LLM (Nova Pro or Claude)
 * 3. Parses structured JSON response
 * 4. Extracts and validates citations
 * 5. Filters unsupported recommendations
 * 6. Calculates confidence scores
 */
export class RAGResponseGenerator {
  private bedrockClient: BedrockRuntimeClient;
  private config: RAGGeneratorConfig;

  constructor(config: Partial<RAGGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_RAG_GENERATOR_CONFIG, ...config };
    this.bedrockClient = getBedrockClientForModel(this.config.modelId);
  }

  /**
   * Generate enhanced diagnosis response
   * 
   * @param request - Generation request with disease and retrieved documents
   * @returns Enhanced diagnosis response with citations
   */
  async generateEnhancedResponse(request: GenerationRequest): Promise<EnhancedDiagnosisResponse> {
    const startTime = Date.now();

    // Construct prompt
    const prompt = this.constructPrompt(request);
    console.log(`[RAGGenerator] Generating response for ${request.disease.name}`);

    // Call LLM with timeout
    const llmResponse = await this.callLLMWithTimeout(prompt);

    // Parse response
    const parsedResponse = this.parseLLMResponse(llmResponse);

    // Extract citations
    const citations = this.extractCitations(parsedResponse, request.retrievedDocuments);

    // Filter recommendations
    const filteredResponse = this.filterRecommendations(parsedResponse, citations);

    // Calculate confidence scores
    const enhancedResponse = this.calculateConfidenceScores(filteredResponse, citations);

    // Add regional and seasonal notes
    const finalResponse = this.addContextualNotes(enhancedResponse, request);

    const generationTimeMs = Date.now() - startTime;
    console.log(`[RAGGenerator] Generated response in ${generationTimeMs}ms with ${citations.length} citations`);

    return {
      ...finalResponse,
      citations,
      generationTimeMs,
    };
  }

  /**
   * Construct prompt for LLM
   * 
   * Includes:
   * - Disease identification details
   * - Retrieved document context
   * - Instructions for evidence-based recommendations
   * - JSON output format specification
   * 
   * @param request - Generation request
   * @returns Formatted prompt string
   */
  private constructPrompt(request: GenerationRequest): string {
    const { disease, cropType, retrievedDocuments, location, season } = request;

    // Build document context
    const documentContext = retrievedDocuments
      .map((doc, index) => {
        return `[Doc${index + 1}] ${doc.title}\n${doc.content}\nSource: ${doc.metadata.source}`;
      })
      .join('\n\n');

    const prompt = `You are an agricultural expert providing evidence-based treatment recommendations for crop diseases.

DISEASE IDENTIFICATION:
- Disease: ${disease.name} (${disease.scientificName})
- Type: ${disease.type}
- Severity: ${disease.severity}
- Confidence: ${(disease.confidence * 100).toFixed(1)}%
- Crop: ${cropType}
- Symptoms: ${disease.symptoms.join(', ')}
- Affected Parts: ${disease.affectedParts.join(', ')}
${location ? `- Location: ${location.state}${location.district ? `, ${location.district}` : ''}` : ''}
${season ? `- Season: ${season}` : ''}

RETRIEVED AGRICULTURAL DOCUMENTS:
${documentContext}

INSTRUCTIONS:
1. Provide a detailed description of the disease based on the retrieved documents
2. Recommend chemical treatments with specific products, dosages, and application methods
3. Recommend organic/biological treatments with preparation and application details
4. Recommend preventive measures to avoid future occurrences
5. Include regional considerations if location is provided
6. Include seasonal considerations if season is provided
7. CRITICAL: Every recommendation MUST cite at least one source document using [Doc1], [Doc2], etc.
8. CRITICAL: Only recommend treatments explicitly mentioned in the retrieved documents
9. Do NOT recommend treatments not supported by the provided documents
10. Include effectiveness rates when mentioned in documents
11. Provide confidence scores (0-100) for each recommendation based on evidence strength

OUTPUT FORMAT (JSON):
{
  "detailedDescription": "Comprehensive disease description with scientific backing [Doc1]",
  "chemicalTreatments": [
    {
      "name": "Treatment name",
      "activeIngredient": "Active ingredient",
      "dosage": "Specific dosage",
      "applicationMethod": "How to apply",
      "frequency": "How often",
      "precautions": ["Safety precaution 1", "Safety precaution 2"],
      "effectivenessRate": 85,
      "citations": ["Doc1", "Doc2"]
    }
  ],
  "organicTreatments": [
    {
      "name": "Treatment name",
      "ingredients": ["Ingredient 1", "Ingredient 2"],
      "preparation": "How to prepare",
      "applicationMethod": "How to apply",
      "frequency": "How often",
      "effectivenessRate": 75,
      "citations": ["Doc2"]
    }
  ],
  "preventiveMeasures": [
    {
      "measure": "Preventive measure name",
      "description": "Detailed description",
      "timing": "When to implement",
      "effectivenessRate": 90,
      "citations": ["Doc1", "Doc3"]
    }
  ],
  "regionalNotes": "Regional considerations if applicable",
  "seasonalNotes": "Seasonal considerations if applicable"
}

Generate the JSON response now:`;

    return prompt;
  }

  /**
   * Call LLM with timeout enforcement
   * 
   * @param prompt - Formatted prompt
   * @returns LLM response text
   * @throws Error if timeout exceeded or LLM call fails
   */
  private async callLLMWithTimeout(prompt: string): Promise<string> {
    console.log(`[RAGGenerator] Starting LLM call with ${this.config.timeout}ms timeout`);
    const startTime = Date.now();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        console.log(`[RAGGenerator] Timeout triggered after ${elapsed}ms`);
        reject(new Error('LLM generation timeout'));
      }, this.config.timeout);
    });

    const llmPromise = this.callLLM(prompt);

    try {
      const response = await Promise.race([llmPromise, timeoutPromise]);
      const elapsed = Date.now() - startTime;
      console.log(`[RAGGenerator] LLM call completed in ${elapsed}ms`);
      return response;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[RAGGenerator] LLM call failed after ${elapsed}ms:`, error);
      throw error;
    }
  }

  /**
   * Call LLM via AWS Bedrock
   * 
   * @param prompt - Formatted prompt
   * @returns LLM response text
   */
  private async callLLM(prompt: string): Promise<string> {
    console.log(`[RAGGenerator] Calling Bedrock model: ${this.config.modelId}`);
    console.log(`[RAGGenerator] Prompt length: ${prompt.length} chars`);
    
    const payload = {
      messages: [
        {
          role: 'user',
          content: [
            {
              text: prompt,
            },
          ],
        },
      ],
      inferenceConfig: {
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        topP: 0.9,
      },
    };

    const command = new InvokeModelCommand({
      modelId: this.config.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    console.log(`[RAGGenerator] Sending request to Bedrock...`);
    const bedrockStartTime = Date.now();
    const response = await this.bedrockClient.send(command);
    const bedrockElapsed = Date.now() - bedrockStartTime;
    console.log(`[RAGGenerator] Bedrock responded in ${bedrockElapsed}ms`);
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log(`[RAGGenerator] Response body size: ${JSON.stringify(responseBody).length} chars`);

    // Extract text from response (format varies by model)
    if (responseBody.output && responseBody.output.message) {
      return responseBody.output.message.content[0].text;
    } else if (responseBody.content && responseBody.content[0]) {
      return responseBody.content[0].text;
    } else {
      console.error('[RAGGenerator] Unexpected response format:', JSON.stringify(responseBody).substring(0, 500));
      throw new Error('Unexpected LLM response format');
    }
  }

  /**
   * Parse LLM response into structured format
   * 
   * @param llmResponse - Raw LLM response text
   * @returns Parsed response object
   */
  private parseLLMResponse(llmResponse: string): any {
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       llmResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const jsonString = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonString);

      return parsed;
    } catch (error) {
      console.error('[RAGGenerator] Failed to parse LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }

  /**
   * Extract citations from parsed response
   * 
   * Finds all [DocN] references and creates Citation objects
   * 
   * @param parsedResponse - Parsed LLM response
   * @param retrievedDocuments - Retrieved documents with metadata
   * @returns Array of citations
   */
  private extractCitations(
    parsedResponse: any,
    retrievedDocuments: RetrievedDocument[]
  ): Citation[] {
    const citations: Citation[] = [];
    const citationMap = new Map<string, Citation>();

    // Find all [DocN] references in the response
    const responseText = JSON.stringify(parsedResponse);
    const citationRegex = /\[Doc(\d+)\]/g;
    const matches = responseText.matchAll(citationRegex);

    for (const match of matches) {
      const docIndex = parseInt(match[1], 10) - 1; // Convert to 0-based index
      
      if (docIndex >= 0 && docIndex < retrievedDocuments.length) {
        const doc = retrievedDocuments[docIndex];
        const citationId = `cite-${docIndex + 1}`;

        if (!citationMap.has(citationId)) {
          const citation: Citation = {
            citationId,
            documentId: doc.documentId,
            title: doc.title,
            excerpt: doc.content.substring(0, 200) + '...', // First 200 chars
            source: doc.metadata.source,
            author: doc.metadata.author,
            publicationDate: doc.metadata.publicationDate instanceof Date 
              ? doc.metadata.publicationDate.toISOString() 
              : doc.metadata.publicationDate,
            url: doc.metadata.url,
            relevanceScore: doc.similarityScore,
          };
          citationMap.set(citationId, citation);
        }
      }
    }

    return Array.from(citationMap.values());
  }

  /**
   * Filter recommendations without sufficient citations
   * 
   * Removes recommendations that:
   * - Have no citations
   * - Have citations below minimum threshold
   * 
   * @param parsedResponse - Parsed LLM response
   * @param citations - Extracted citations
   * @returns Filtered response
   */
  private filterRecommendations(parsedResponse: any, citations: Citation[]): any {
    const validCitationIds = new Set(citations.map(c => c.citationId));

    const filterArray = (recommendations: any[]) => {
      return recommendations.filter(rec => {
        if (!rec.citations || rec.citations.length === 0) {
          console.log(`[RAGGenerator] Filtered recommendation without citations: ${rec.name || rec.measure}`);
          return false;
        }

        // Check if at least one citation is valid
        const hasValidCitation = rec.citations.some((cite: string) => {
          const citationId = `cite-${cite.replace(/[^\d]/g, '')}`;
          return validCitationIds.has(citationId);
        });

        if (!hasValidCitation) {
          console.log(`[RAGGenerator] Filtered recommendation with invalid citations: ${rec.name || rec.measure}`);
        }

        return hasValidCitation;
      });
    };

    return {
      ...parsedResponse,
      chemicalTreatments: filterArray(parsedResponse.chemicalTreatments || []),
      organicTreatments: filterArray(parsedResponse.organicTreatments || []),
      preventiveMeasures: filterArray(parsedResponse.preventiveMeasures || []),
    };
  }

  /**
   * Calculate confidence scores for recommendations
   * 
   * Confidence based on:
   * - Number of supporting citations
   * - Source credibility (research paper > extension guide > blog)
   * - Similarity scores of cited documents
   * 
   * @param filteredResponse - Filtered response
   * @param citations - Extracted citations
   * @returns Response with confidence scores
   */
  private calculateConfidenceScores(filteredResponse: any, citations: Citation[]): any {
    const calculateScore = (rec: any): number => {
      if (!rec.citations || rec.citations.length === 0) {
        return 0;
      }

      // Base score from number of citations (max 50 points)
      const citationScore = Math.min(rec.citations.length * 15, 50);

      // Source credibility score (max 30 points)
      let credibilityScore = 0;
      rec.citations.forEach((cite: string) => {
        const citationId = `cite-${cite.replace(/[^\d]/g, '')}`;
        const citation = citations.find(c => c.citationId === citationId);
        
        if (citation) {
          const source = citation.source.toLowerCase();
          if (source.includes('research') || source.includes('journal')) {
            credibilityScore += 10;
          } else if (source.includes('extension') || source.includes('university')) {
            credibilityScore += 7;
          } else {
            credibilityScore += 5;
          }
        }
      });
      credibilityScore = Math.min(credibilityScore, 30);

      // Similarity score (max 20 points)
      let similarityScore = 0;
      rec.citations.forEach((cite: string) => {
        const citationId = `cite-${cite.replace(/[^\d]/g, '')}`;
        const citation = citations.find(c => c.citationId === citationId);
        
        if (citation) {
          similarityScore += citation.relevanceScore * 20;
        }
      });
      similarityScore = Math.min(similarityScore / rec.citations.length, 20);

      return Math.round(citationScore + credibilityScore + similarityScore);
    };

    const addConfidence = (recommendations: any[]) => {
      return recommendations.map(rec => ({
        ...rec,
        confidence: calculateScore(rec),
      }));
    };

    return {
      ...filteredResponse,
      chemicalTreatments: addConfidence(filteredResponse.chemicalTreatments || []),
      organicTreatments: addConfidence(filteredResponse.organicTreatments || []),
      preventiveMeasures: addConfidence(filteredResponse.preventiveMeasures || []),
    };
  }

  /**
   * Add regional and seasonal contextual notes
   * 
   * @param enhancedResponse - Response with confidence scores
   * @param request - Generation request with context
   * @returns Response with contextual notes
   */
  private addContextualNotes(enhancedResponse: any, request: GenerationRequest): any {
    // Regional notes are already in the response from LLM
    // Seasonal notes are already in the response from LLM
    // This method can be extended to add additional context if needed

    return enhancedResponse;
  }
}

/**
 * Create a singleton instance of RAGResponseGenerator
 */
let ragResponseGeneratorInstance: RAGResponseGenerator | null = null;

export function getRAGResponseGenerator(
  config: Partial<RAGGeneratorConfig> = {}
): RAGResponseGenerator {
  if (!ragResponseGeneratorInstance) {
    ragResponseGeneratorInstance = new RAGResponseGenerator(config);
  }
  return ragResponseGeneratorInstance;
}

export function resetRAGResponseGenerator(): void {
  ragResponseGeneratorInstance = null;
}
