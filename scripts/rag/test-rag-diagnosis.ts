/**
 * Test RAG Diagnosis
 * 
 * Simulates a diagnosis request to test RAG enhancement
 */

import { diagnosisService } from '../src/features/crop-diagnosis/services/diagnosis.service';
import * as fs from 'fs';
import * as path from 'path';

async function testRAGDiagnosis() {
  console.log('='.repeat(60));
  console.log('RAG Diagnosis Test');
  console.log('='.repeat(60));
  console.log('');

  // Check environment
  console.log('Environment Check:');
  console.log(`  RAG_ENABLED: ${process.env.RAG_ENABLED}`);
  console.log(`  POSTGRES_HOST: ${process.env.POSTGRES_HOST}`);
  console.log(`  POSTGRES_PORT: ${process.env.POSTGRES_PORT}`);
  console.log(`  POSTGRES_DB: ${process.env.POSTGRES_DB}`);
  console.log('');

  // Create a mock image buffer (1x1 pixel PNG)
  const mockImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  try {
    console.log('Calling diagnosis service...');
    console.log('');

    const result = await diagnosisService.diagnose({
      imageBuffer: mockImageBuffer,
      originalFilename: 'test-tomato.png',
      userId: 'test-user-123',
      cropHint: 'tomato',
      language: 'en',
      location: {
        latitude: 18.5204,
        longitude: 73.8567,
        state: 'Maharashtra',
        district: 'Pune'
      }
    });

    console.log('='.repeat(60));
    console.log('Diagnosis Result:');
    console.log('='.repeat(60));
    console.log(`Diagnosis ID: ${result.diagnosisId}`);
    console.log(`Crop Type: ${result.cropType}`);
    console.log(`Diseases: ${result.diseases.length}`);
    console.log(`RAG Enhanced: ${result.ragEnhanced}`);
    console.log('');

    if (result.ragEnhanced) {
      console.log('✓ RAG Enhancement SUCCESS!');
      console.log('');
      console.log('RAG Metadata:');
      if (result.ragMetadata) {
        console.log(`  Retrieval Time: ${result.ragMetadata.retrievalTimeMs}ms`);
        console.log(`  Generation Time: ${result.ragMetadata.generationTimeMs}ms`);
        console.log(`  Documents Retrieved: ${result.ragMetadata.documentsRetrieved}`);
        console.log(`  Similarity Threshold: ${result.ragMetadata.similarityThreshold}`);
        console.log(`  Cache Hit: ${result.ragMetadata.cacheHit}`);
      }
      console.log('');
      console.log(`Citations: ${result.citations?.length || 0}`);
      if (result.citations && result.citations.length > 0) {
        result.citations.forEach(citation => {
          console.log(`  - ${citation.citationId}: ${citation.title}`);
        });
      }
    } else {
      console.log('✗ RAG Enhancement FAILED or DISABLED');
      console.log('');
      console.log('Possible reasons:');
      console.log('  1. RAG_ENABLED=false in environment');
      console.log('  2. No diseases detected');
      console.log('  3. No documents retrieved from knowledge base');
      console.log('  4. RAG timeout or error');
      console.log('');
      console.log('Check server logs for more details');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
}

// Run test
console.log('Starting RAG diagnosis test...');
console.log('');

testRAGDiagnosis()
  .then(() => {
    console.log('');
    console.log('✓ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('✗ Test failed:', error);
    process.exit(1);
  });
