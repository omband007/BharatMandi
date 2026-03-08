/**
 * Integration Example for Nova Vision Service
 * 
 * This file demonstrates how to use the Nova Vision Service
 * for crop disease diagnosis with real AWS Bedrock integration.
 * 
 * NOTE: This is an example file, not a test file.
 * To run this example, you need:
 * 1. Valid AWS credentials configured
 * 2. Access to Amazon Bedrock Nova Pro model
 * 3. A real crop image file
 */

import { novaVisionService, ImageAnalysisRequest } from '../nova-vision.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example: Analyze a crop image for disease diagnosis
 */
async function exampleAnalyzeCropImage() {
  try {
    // Load a sample crop image
    // Replace with your actual image path
    const imagePath = path.join(__dirname, 'sample-crop-image.jpg');
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.log('Sample image not found. Please provide a crop image at:', imagePath);
      return;
    }

    const imageBuffer = fs.readFileSync(imagePath);

    // Create analysis request
    const request: ImageAnalysisRequest = {
      imageBuffer,
      imageFormat: 'jpeg',
      cropHint: 'tomato', // Optional: helps improve accuracy
    };

    console.log('Analyzing crop image...');
    const startTime = Date.now();

    // Analyze the image
    const result = await novaVisionService.analyzeImage(request);

    const totalTime = Date.now() - startTime;

    // Display results
    console.log('\n=== Crop Disease Diagnosis Results ===\n');
    console.log(`Crop Type: ${result.cropType}`);
    console.log(`Overall Confidence: ${result.confidence}%`);
    console.log(`Image Quality Score: ${(result.imageQualityScore * 100).toFixed(0)}%`);
    console.log(`Processing Time: ${result.processingTimeMs}ms`);
    console.log(`Total Time: ${totalTime}ms`);

    if (result.diseases.length > 0) {
      console.log('\n--- Diseases Detected ---');
      result.diseases.forEach((disease, index) => {
        console.log(`\n${index + 1}. ${disease.name}`);
        console.log(`   Scientific Name: ${disease.scientificName}`);
        console.log(`   Type: ${disease.type}`);
        console.log(`   Severity: ${disease.severity}`);
        console.log(`   Confidence: ${disease.confidence}%`);
        console.log(`   Affected Parts: ${disease.affectedParts.join(', ')}`);
      });
    } else {
      console.log('\n✓ No diseases detected - crop appears healthy!');
    }

    if (result.symptoms.length > 0) {
      console.log('\n--- Symptoms Observed ---');
      result.symptoms.forEach((symptom, index) => {
        console.log(`${index + 1}. ${symptom}`);
      });
    }

    // Check if expert review is needed
    if (result.confidence < 80) {
      console.log('\n⚠️  Low confidence - Expert review recommended');
    }

    console.log('\n=====================================\n');
  } catch (error) {
    console.error('Error analyzing crop image:', error);
  }
}

/**
 * Example: Batch analyze multiple crop images
 */
async function exampleBatchAnalysis() {
  const imageFiles = [
    'tomato-late-blight.jpg',
    'wheat-rust.jpg',
    'rice-blast.jpg',
  ];

  console.log('Starting batch analysis...\n');

  for (const filename of imageFiles) {
    try {
      const imagePath = path.join(__dirname, 'samples', filename);
      
      if (!fs.existsSync(imagePath)) {
        console.log(`Skipping ${filename} - file not found`);
        continue;
      }

      const imageBuffer = fs.readFileSync(imagePath);

      const request: ImageAnalysisRequest = {
        imageBuffer,
        imageFormat: 'jpeg',
      };

      console.log(`Analyzing ${filename}...`);
      const result = await novaVisionService.analyzeImage(request);

      console.log(`  Crop: ${result.cropType}`);
      console.log(`  Diseases: ${result.diseases.length}`);
      console.log(`  Confidence: ${result.confidence}%`);
      console.log(`  Time: ${result.processingTimeMs}ms\n`);
    } catch (error) {
      console.error(`Error analyzing ${filename}:`, error);
    }
  }

  console.log('Batch analysis complete!');
}

/**
 * Example: Handle different image formats
 */
async function exampleDifferentFormats() {
  const formats: Array<{ file: string; format: 'jpeg' | 'png' | 'webp' }> = [
    { file: 'crop.jpg', format: 'jpeg' },
    { file: 'crop.png', format: 'png' },
    { file: 'crop.webp', format: 'webp' },
  ];

  for (const { file, format } of formats) {
    try {
      const imagePath = path.join(__dirname, 'samples', file);
      
      if (!fs.existsSync(imagePath)) {
        console.log(`Skipping ${file} - file not found`);
        continue;
      }

      const imageBuffer = fs.readFileSync(imagePath);

      const request: ImageAnalysisRequest = {
        imageBuffer,
        imageFormat: format,
      };

      console.log(`Analyzing ${format.toUpperCase()} image...`);
      const result = await novaVisionService.analyzeImage(request);

      console.log(`  Success! Crop: ${result.cropType}, Confidence: ${result.confidence}%\n`);
    } catch (error) {
      console.error(`Error with ${format}:`, error);
    }
  }
}

/**
 * Example: Error handling
 */
async function exampleErrorHandling() {
  try {
    // Example 1: Invalid image buffer
    const invalidRequest: ImageAnalysisRequest = {
      imageBuffer: Buffer.from('not-an-image'),
      imageFormat: 'jpeg',
    };

    await novaVisionService.analyzeImage(invalidRequest);
  } catch (error) {
    console.log('Expected error for invalid image:', (error as Error).message);
  }

  try {
    // Example 2: Empty buffer
    const emptyRequest: ImageAnalysisRequest = {
      imageBuffer: Buffer.alloc(0),
      imageFormat: 'jpeg',
    };

    await novaVisionService.analyzeImage(emptyRequest);
  } catch (error) {
    console.log('Expected error for empty buffer:', (error as Error).message);
  }
}

// Uncomment to run examples:
// exampleAnalyzeCropImage();
// exampleBatchAnalysis();
// exampleDifferentFormats();
// exampleErrorHandling();

export {
  exampleAnalyzeCropImage,
  exampleBatchAnalysis,
  exampleDifferentFormats,
  exampleErrorHandling,
};

