// AI-powered grading service with real image analysis using AWS Bedrock Nova Pro
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { ProduceGrade } from '../../shared/types/common.types';
import type { GradingResult, DigitalQualityCertificate } from './grading.types';
import { db } from '../../shared/database/memory-db';
import { ConverseCommand, ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClientForModel, DEFAULT_BEDROCK_CONFIG } from '../crop-diagnosis/services/bedrock.service';

export class GradingService {
  // AI-powered grading with real image analysis using Nova Pro
  async gradeProduceImage(
    imageBuffer: Buffer,
    location: { lat: number; lng: number }
  ): Promise<{ gradingResult: GradingResult; analysis: any }> {
    try {
      // Use Nova Pro to analyze the produce image
      const prompt = `Analyze this produce image and provide:
1. Crop type (e.g., tomato, onion, potato, wheat, rice, etc.)
2. Quality grade (A, B, or C) based on:
   - Visual appearance and freshness
   - Color uniformity and vibrancy
   - Size and shape consistency
   - Visible defects or blemishes
3. Confidence score (0-1)
4. Brief quality assessment

Respond in JSON format:
{
  "cropType": "crop name in lowercase",
  "grade": "A" | "B" | "C",
  "confidence": 0.0-1.0,
  "assessment": "brief quality description"
}`;

      const response = await this.analyzeImageWithNova(imageBuffer, prompt);

      // Parse the response
      let analysis;
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('[GradingService] Failed to parse Nova response:', response);
        // Fallback: try to extract info from text
        analysis = this.parseTextResponse(response);
      }

      const gradingResult: GradingResult = {
        grade: this.normalizeGrade(analysis.grade),
        confidence: analysis.confidence || 0.7,
        timestamp: new Date(),
        location: {
          latitude: location.lat,
          longitude: location.lng,
          address: ''
        }
      };

      return {
        gradingResult,
        analysis: {
          detectedCrop: analysis.cropType?.toLowerCase() || 'unknown',
          details: {
            assessment: analysis.assessment || 'Quality assessed by AI',
            rawResponse: response
          }
        }
      };
    } catch (error) {
      console.error('[GradingService] Nova Pro analysis failed:', error);
      // Fallback to basic analysis if Nova fails
      return this.fallbackAnalysis(imageBuffer, location);
    }
  }

  private async analyzeImageWithNova(imageBuffer: Buffer, prompt: string): Promise<string> {
    const client = getBedrockClientForModel(DEFAULT_BEDROCK_CONFIG.modelId);

    const imageContent: ContentBlock = {
      image: {
        format: 'jpeg',
        source: {
          bytes: imageBuffer
        }
      }
    };

    const textContent: ContentBlock = {
      text: prompt
    };

    const command = new ConverseCommand({
      modelId: DEFAULT_BEDROCK_CONFIG.modelId,
      messages: [
        {
          role: 'user',
          content: [imageContent, textContent]
        }
      ],
      inferenceConfig: {
        maxTokens: DEFAULT_BEDROCK_CONFIG.maxTokens,
        temperature: DEFAULT_BEDROCK_CONFIG.temperature,
        topP: DEFAULT_BEDROCK_CONFIG.topP
      }
    });

    const response = await client.send(command);
    
    if (!response.output?.message?.content) {
      throw new Error('No content in Nova response');
    }

    const textBlocks = response.output.message.content.filter(
      (block): block is { text: string } => 'text' in block
    );

    if (textBlocks.length === 0) {
      throw new Error('No text content in Nova response');
    }

    return textBlocks.map(block => block.text).join('\n');
  }

  private normalizeGrade(grade: string): ProduceGrade {
    const normalized = grade?.toUpperCase();
    if (normalized === 'A') return ProduceGrade.A;
    if (normalized === 'B') return ProduceGrade.B;
    return ProduceGrade.C;
  }

  private parseTextResponse(text: string): any {
    // Fallback parser for non-JSON responses
    const cropMatch = text.match(/crop[:\s]+([a-z]+)/i);
    const gradeMatch = text.match(/grade[:\s]+([ABC])/i);
    const confidenceMatch = text.match(/confidence[:\s]+([\d.]+)/i);

    return {
      cropType: cropMatch?.[1]?.toLowerCase() || 'unknown',
      grade: gradeMatch?.[1]?.toUpperCase() || 'B',
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7,
      assessment: 'Quality assessed by AI'
    };
  }

  private async fallbackAnalysis(
    imageBuffer: Buffer,
    location: { lat: number; lng: number }
  ): Promise<{ gradingResult: GradingResult; analysis: any }> {
    // Simple fallback when Nova is unavailable
    console.log('[GradingService] Using fallback analysis');
    
    const gradingResult: GradingResult = {
      grade: ProduceGrade.B,
      confidence: 0.6,
      timestamp: new Date(),
      location: {
        latitude: location.lat,
        longitude: location.lng,
        address: ''
      }
    };

    return {
      gradingResult,
      analysis: {
        detectedCrop: 'unknown',
        details: {
          assessment: 'Fallback analysis - AI service unavailable'
        }
      }
    };
  }

  // Generate digital quality certificate
  generateCertificate(
    farmerId: string,
    produceType: string,
    gradingResult: GradingResult,
    imageBuffer: Buffer,
    detectedCrop?: string
  ): DigitalQualityCertificate {
    // Generate image hash for certificate
    const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex').substring(0, 16);

    // Use detected crop if available
    const finalProduceType = detectedCrop && detectedCrop !== 'unknown' ? detectedCrop : produceType;

    const certificate: DigitalQualityCertificate = {
      id: uuidv4(),
      farmerId,
      produceType: finalProduceType,
      grade: gradingResult.grade,
      timestamp: gradingResult.timestamp,
      location: gradingResult.location,
      imageHash
    };

    return db.createCertificate(certificate);
  }
}

export const gradingService = new GradingService();
