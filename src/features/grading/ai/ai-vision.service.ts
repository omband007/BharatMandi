import axios from 'axios';
import sharp from 'sharp';
import { ProduceGrade } from '../../../shared/types/common.types';

interface HuggingFaceResult {
  label: string;
  score: number;
}

interface CropAnalysis {
  cropType: string;
  grade: ProduceGrade;
  confidence: number;
  details: {
    size: string;
    color: string;
    defects: string;
  };
}

export class AIVisionService {
  private readonly HF_API_URL = 'https://api-inference.huggingface.co/models/google/vit-base-patch16-224';
  
  // Crop keywords mapping
  private readonly cropKeywords: { [key: string]: string[] } = {
    'wheat': ['wheat', 'grain', 'cereal'],
    'rice': ['rice', 'paddy', 'grain'],
    'tomato': ['tomato', 'vegetable', 'fruit'],
    'potato': ['potato', 'vegetable', 'tuber'],
    'onion': ['onion', 'vegetable', 'bulb'],
    'corn': ['corn', 'maize', 'grain'],
    'apple': ['apple', 'fruit'],
    'banana': ['banana', 'fruit'],
    'carrot': ['carrot', 'vegetable', 'root'],
    'cabbage': ['cabbage', 'vegetable', 'leafy']
  };

  async analyzeImage(imageBuffer: Buffer): Promise<CropAnalysis> {
    try {
      // Resize and optimize image
      const processedImage = await this.preprocessImage(imageBuffer);
      
      // Analyze with Hugging Face (free tier)
      const cropType = await this.detectCrop(processedImage);
      
      // Analyze quality metrics
      const qualityMetrics = await this.analyzeQuality(processedImage);
      
      // Determine grade based on quality
      const grade = this.calculateGrade(qualityMetrics);
      
      return {
        cropType,
        grade,
        confidence: qualityMetrics.confidence,
        details: {
          size: qualityMetrics.size,
          color: qualityMetrics.color,
          defects: qualityMetrics.defects
        }
      };
    } catch (error) {
      console.error('AI Vision Error:', error);
      // Fallback to basic analysis
      return this.fallbackAnalysis(imageBuffer);
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    // Resize to 224x224 for model input, optimize quality
    return await sharp(imageBuffer)
      .resize(224, 224, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  private async detectCrop(imageBuffer: Buffer): Promise<string> {
    try {
      // Try Hugging Face API (no auth needed for public models)
      const response = await axios.post<HuggingFaceResult[]>(
        this.HF_API_URL,
        imageBuffer,
        {
          headers: { 'Content-Type': 'application/octet-stream' },
          timeout: 10000
        }
      );

      if (response.data && response.data.length > 0) {
        // Match detected labels with crop types
        const detectedLabel = response.data[0].label.toLowerCase();
        return this.matchCropType(detectedLabel);
      }
    } catch (error) {
      console.log('HF API unavailable, using color-based detection');
    }

    // Fallback: Use color-based detection
    return await this.detectCropByColor(imageBuffer);
  }

  private async detectCropByColor(imageBuffer: Buffer): Promise<string> {
    try {
      const stats = await sharp(imageBuffer).stats();
      
      // Get dominant color (average across channels)
      const avgRed = stats.channels[0].mean;
      const avgGreen = stats.channels[1].mean;
      const avgBlue = stats.channels[2].mean;

      // Calculate ratios for better detection
      const redGreenRatio = avgRed / (avgGreen + 1);
      const redBlueRatio = avgRed / (avgBlue + 1);
      const greenBlueRatio = avgGreen / (avgBlue + 1);

      console.log(`Color Analysis - R:${avgRed.toFixed(1)} G:${avgGreen.toFixed(1)} B:${avgBlue.toFixed(1)}`);
      console.log(`Ratios - R/G:${redGreenRatio.toFixed(2)} R/B:${redBlueRatio.toFixed(2)}`);

      // Onion (White/Yellow): High values across all channels, relatively balanced
      // White onions have high RGB values (>150) with small differences
      // Yellow onions have high R and G, moderate B
      if ((avgRed > 150 && avgGreen > 140 && avgBlue > 120 && // White onion
           Math.abs(avgRed - avgGreen) < 40 && Math.abs(avgGreen - avgBlue) < 40) ||
          (avgRed > 160 && avgGreen > 140 && avgBlue > 80 && avgBlue < 140 && // Yellow onion
           redGreenRatio < 1.3 && Math.abs(avgRed - avgGreen) < 50)) {
        console.log('Detected: ONION (white/yellow)');
        return 'onion';
      }

      // Onion (Purple/Red): High red and blue, lower green
      if (avgRed > 100 && avgBlue > 80 && avgGreen < 90 && redGreenRatio > 1.2) {
        console.log('Detected: ONION (purple/red)');
        return 'onion';
      }

      // Tomato: High red, red strongly dominates green and blue
      // More strict thresholds to avoid false positives with onions
      // Tomatoes should have red > 120 and strong red dominance
      if (avgRed > 120 && avgGreen < 110 && avgBlue < 100 &&
          redGreenRatio > 1.4 && redBlueRatio > 1.5 && 
          avgRed > avgGreen && avgRed > avgBlue) {
        console.log('Detected: TOMATO');
        return 'tomato';
      }
      
      // Carrot: Orange - high red and moderate green, but red > green
      // Red should be higher than green, but not as dominant as tomato
      if (avgRed > 160 && avgGreen > 80 && avgGreen < 160 && 
          redGreenRatio > 1.1 && redGreenRatio < 1.4 && avgBlue < 100) {
        console.log('Detected: CARROT');
        return 'carrot';
      }
      
      // Apple (Red): Similar to tomato but usually darker or lighter
      if (avgRed > 100 && avgRed < 180 && redGreenRatio > 1.2 && redBlueRatio > 1.3 &&
          (avgRed < 120 || avgRed > 160)) { // Exclude tomato range
        console.log('Detected: APPLE (red)');
        return 'apple';
      }
      
      // Potato: Brown/beige - balanced but muted, all channels similar
      // Must have low color difference between channels (not red-dominant like tomato)
      if (avgRed > 80 && avgRed < 160 && 
          avgGreen > 70 && avgGreen < 150 && 
          avgBlue > 50 && avgBlue < 130 &&
          Math.abs(avgRed - avgGreen) < 30 &&
          Math.abs(avgGreen - avgBlue) < 30 &&
          redGreenRatio < 1.2) { // Key: potato should NOT have high red dominance
        console.log('Detected: POTATO');
        return 'potato';
      }
      
      // Cabbage/Leafy greens: Green dominates
      if (avgGreen > avgRed + 20 && avgGreen > avgBlue + 20 && avgGreen > 100) {
        console.log('Detected: CABBAGE');
        return 'cabbage';
      }
      
      // Banana: Bright yellow - high red and green, low blue
      if (avgRed > 170 && avgGreen > 160 && avgBlue < 130 && 
          Math.abs(avgRed - avgGreen) < 20) {
        console.log('Detected: BANANA');
        return 'banana';
      }
      
      // Wheat/Grain: Golden yellow
      if (avgRed > 140 && avgGreen > 120 && avgBlue < 110 && 
          Math.abs(avgRed - avgGreen) < 40) {
        console.log('Detected: WHEAT');
        return 'wheat';
      }
      
      // Apple (Green): Green dominates but not as much as cabbage
      if (avgGreen > avgRed + 10 && avgGreen > avgBlue + 10 && 
          avgGreen > 120 && avgGreen < 180) {
        console.log('Detected: APPLE (green)');
        return 'apple';
      }

      console.log('Detected: UNKNOWN');
      return 'unknown';
    } catch (error) {
      console.error('Color detection error:', error);
      return 'unknown';
    }
  }


  private matchCropType(label: string): string {
    for (const [crop, keywords] of Object.entries(this.cropKeywords)) {
      if (keywords.some(keyword => label.includes(keyword))) {
        return crop;
      }
    }
    return label.split(',')[0].trim(); // Return first word if no match
  }

  private async analyzeQuality(imageBuffer: Buffer): Promise<{
    confidence: number;
    size: string;
    color: string;
    defects: string;
  }> {
    // Use sharp to analyze image properties
    const metadata = await sharp(imageBuffer).metadata();
    const stats = await sharp(imageBuffer).stats();

    // Analyze color uniformity
    const colorUniformity = this.calculateColorUniformity(stats);
    
    // Analyze brightness (proxy for freshness)
    const brightness = this.calculateBrightness(stats);
    
    // Analyze saturation (vibrant colors = fresh produce)
    const saturation = this.calculateSaturation(stats);
    
    // Calculate overall quality score with improved weights
    const qualityScore = (colorUniformity * 0.3) + (brightness * 0.3) + (saturation * 0.4);
    
    return {
      confidence: qualityScore,
      size: this.categorizeSize(metadata.width || 0, metadata.height || 0),
      color: colorUniformity > 0.7 ? 'Uniform' : 'Non-uniform',
      defects: qualityScore > 0.8 ? 'None detected' : qualityScore > 0.6 ? 'Minor' : 'Significant'
    };
  }

  private calculateSaturation(stats: sharp.Stats): number {
    // Calculate color saturation (difference between max and min channel values)
    const channels = stats.channels;
    const means = channels.map(ch => ch.mean);
    const maxMean = Math.max(...means);
    const minMean = Math.min(...means);
    
    // Higher difference = more saturated = fresher (for colorful produce)
    const saturation = (maxMean - minMean) / 255;
    
    // Normalize: moderate saturation is good (0.2-0.6 range is optimal)
    if (saturation >= 0.2 && saturation <= 0.6) {
      return 1.0;
    } else if (saturation > 0.6) {
      return 0.8; // Too saturated
    } else {
      return saturation / 0.2; // Too dull
    }
  }

  private calculateColorUniformity(stats: sharp.Stats): number {
    // Calculate standard deviation across channels
    const channels = stats.channels;
    const avgStdDev = channels.reduce((sum, ch) => sum + ch.stdev, 0) / channels.length;
    
    // Lower std dev = more uniform (normalize to 0-1)
    return Math.max(0, 1 - (avgStdDev / 50));
  }

  private calculateBrightness(stats: sharp.Stats): number {
    // Average brightness across channels
    const avgMean = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
    
    // Normalize to 0-1 (optimal brightness around 128)
    return 1 - Math.abs(128 - avgMean) / 128;
  }


  private categorizeSize(width: number, height: number): string {
    const area = width * height;
    if (area > 40000) return 'Large';
    if (area > 20000) return 'Medium';
    return 'Small';
  }

  private calculateGrade(metrics: { confidence: number }): ProduceGrade {
    if (metrics.confidence >= 0.8) return ProduceGrade.A;
    if (metrics.confidence >= 0.6) return ProduceGrade.B;
    return ProduceGrade.C;
  }

  private async fallbackAnalysis(imageBuffer: Buffer): Promise<CropAnalysis> {
    // Simple fallback when AI is unavailable
    const metadata = await sharp(imageBuffer).metadata();
    const stats = await sharp(imageBuffer).stats();
    
    const colorUniformity = this.calculateColorUniformity(stats);
    const brightness = this.calculateBrightness(stats);
    const saturation = this.calculateSaturation(stats);
    const qualityScore = (colorUniformity * 0.3) + (brightness * 0.3) + (saturation * 0.4);
    
    // Try color-based crop detection
    const cropType = await this.detectCropByColor(imageBuffer);
    
    return {
      cropType,
      grade: this.calculateGrade({ confidence: qualityScore }),
      confidence: qualityScore,
      details: {
        size: this.categorizeSize(metadata.width || 0, metadata.height || 0),
        color: colorUniformity > 0.7 ? 'Uniform' : 'Non-uniform',
        defects: qualityScore > 0.8 ? 'None detected' : qualityScore > 0.6 ? 'Minor' : 'Significant'
      }
    };
  }
}

export const aiVisionService = new AIVisionService();
