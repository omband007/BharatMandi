/**
 * Quick infrastructure verification test for RAG Enhancement
 * Date: 2026-03-11
 * Tests that EmbeddingService and VectorDatabaseService can be instantiated
 */

import { EmbeddingService, VectorDatabaseService } from '../../src/features/crop-diagnosis/services';

async function testInfrastructure() {
  console.log('🔍 Testing Infrastructure Components...\n');

  // Test 1: EmbeddingService instantiation
  try {
    const embeddingService = new EmbeddingService();
    console.log('✓ EmbeddingService can be instantiated');
    
    // Check methods exist
    const methods = ['generateEmbedding', 'generateBatchEmbeddings', 'getCachedEmbedding', 'cacheEmbedding'];
    for (const method of methods) {
      if (typeof (embeddingService as any)[method] === 'function') {
        console.log(`  ✓ Method ${method} exists`);
      } else {
        throw new Error(`Method ${method} not found`);
      }
    }
  } catch (error) {
    console.error('✗ EmbeddingService instantiation failed:', error);
    process.exit(1);
  }

  // Test 2: VectorDatabaseService instantiation
  try {
    const vectorDbService = new VectorDatabaseService();
    console.log('\n✓ VectorDatabaseService can be instantiated');
    
    // Check methods exist
    const methods = [
      'initialize',
      'indexDocument',
      'indexBatchDocuments',
      'searchSimilar',
      'updateDocument',
      'deleteDocument',
      'getDocument'
    ];
    for (const method of methods) {
      if (typeof (vectorDbService as any)[method] === 'function') {
        console.log(`  ✓ Method ${method} exists`);
      } else {
        throw new Error(`Method ${method} not found`);
      }
    }
  } catch (error) {
    console.error('✗ VectorDatabaseService instantiation failed:', error);
    process.exit(1);
  }

  console.log('\n✅ All infrastructure components verified successfully!');
}

testInfrastructure().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
