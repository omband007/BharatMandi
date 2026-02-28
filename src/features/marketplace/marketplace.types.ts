import { ProduceGrade } from '../../shared/types/common.types';

export interface Listing {
  id: string;
  farmerId: string;
  produceType: string;
  quantity: number;
  pricePerKg: number;
  certificateId: string;
  expectedHarvestDate?: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface TranslatedListing extends Listing {
  originalProduceType: string;
  translatedProduceType: string;
  isTranslated: boolean;
  sourceLanguage: string;
  targetLanguage: string;
}
