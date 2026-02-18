// AI-powered grading service with real image analysis
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { ProduceGrade } from '../../shared/types/common.types';
import type { GradingResult, DigitalQualityCertificate } from './grading.types';
import { db } from '../../shared/database/memory-db';
import { aiVisionService } from './ai/ai-vision.service';

export class GradingService {
  // AI-powered grading with real image analysis
  async gradeProduceImage(
    imageBuffer: Buffer,
    location: { lat: number; lng: number }
  ): Promise<{ gradingResult: GradingResult; analysis: any }> {
    // Use AI to analyze the image
    const analysis = await aiVisionService.analyzeImage(imageBuffer);

    const gradingResult: GradingResult = {
      grade: analysis.grade,
      confidence: analysis.confidence,
      timestamp: new Date(),
      location: {
        latitude: location.lat,
        longitude: location.lng,
        address: '' // Empty for now, can be filled with reverse geocoding
      }
    };

    return {
      gradingResult,
      analysis: {
        detectedCrop: analysis.cropType,
        details: analysis.details
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
