import { ProduceGrade, Location } from '../../shared/types/common.types';

export interface GradingResult {
  grade: ProduceGrade;
  confidence: number;
  timestamp: Date;
  location: Location;
  metrics?: {
    size?: number;
    shape?: number;
    color?: number;
    defects?: number;
  };
}

export interface DigitalQualityCertificate {
  id: string;
  farmerId: string;
  produceType: string;
  grade: ProduceGrade;
  timestamp: Date;
  location: Location;
  imageHash: string;
  detectedCrop?: string;
}

export interface CropAnalysis {
  detectedCrop: string;
  confidence: number;
  alternativeCrops?: Array<{
    name: string;
    confidence: number;
  }>;
}
