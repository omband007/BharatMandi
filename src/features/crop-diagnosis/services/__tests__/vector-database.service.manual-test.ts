/**
 * Manual Test Script for Vector Database Service
 * 
 * This script tests the VectorDatabaseService implementation
 * Run with: ts-node src/features/crop-diagnosis/services/__tests__/vector-database.service.manual-test.ts
 */

import { vectorDatabaseService } from '../vector-database.service';
import { DocumentToIndex, SearchQuery } from '../vector-database.service';

async function runTests() {
  console.log('=== Vector Database Service Manual Tests ===\n');

  try {
    // Test 1: Initialize the database
    console.log('Test 1: Initialize database...');
    await vectorDatabaseService.initialize();
    console.log('✓ Database initialized successfully\n');

    // Test 2: Index a sample document
    console.log('Test 2: Index a sample document...');
    const sampleDocument: DocumentToIndex = {
      content: 'Late blight in tomato is caused by Phytophthora infestans. Treatment includes copper-based fungicides applied every 7-10 days.',
      embedding: Array(1536).fill(0).map(() => Math.random()), // Random embedding for testing
      metadata: {
        source: 'Agricultural Extension Guide',
        author: 'Dr. Smith',
        organization: 'State Agricultural University',
        publicationDate: new Date('2023-01-15'),
        language: 'en',
        cropTypes: ['tomato', 'potato'],
        diseaseCategories: ['fungal', 'late_blight'],
        region: 'Maharashtra',
        season: 'kharif',
        documentType: 'extension_guide',
        url: 'https://example.com/late-blight-guide'
      }
    };

    const docId1 = await vectorDatabaseService.indexDocument(sampleDocument);
    console.log(`✓ Document indexed with ID: ${docId1}\n`);

    // Test 3: Index another document with different metadata
    console.log('Test 3: Index another document...');
    const sampleDocument2: DocumentToIndex = {
      content: 'Powdery mildew in wheat can be controlled using sulfur-based fungicides. Apply at first sign of infection.',
      embedding: Array(1536).fill(0).map(() => Math.random()),
      metadata: {
        source: 'Research Paper',
        author: 'Dr. Patel',
        organization: 'ICAR',
        publicationDate: new Date('2023-06-20'),
        language: 'en',
        cropTypes: ['wheat'],
        diseaseCategories: ['fungal', 'powdery_mildew'],
        region: 'Punjab',
        season: 'rabi',
        documentType: 'research_paper'
      }
    };

    const docId2 = await vectorDatabaseService.indexDocument(sampleDocument2);
    console.log(`✓ Document indexed with ID: ${docId2}\n`);

    // Test 4: Search for similar documents (no filters)
    console.log('Test 4: Search for similar documents (no filters)...');
    const searchQuery: SearchQuery = {
      embedding: Array(1536).fill(0).map(() => Math.random()),
      topK: 5,
      similarityThreshold: 0.0 // Low threshold to get all results
    };

    const results = await vectorDatabaseService.searchSimilar(searchQuery);
    console.log(`✓ Found ${results.length} documents`);
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.documentId} (similarity: ${result.similarityScore.toFixed(4)})`);
      console.log(`     Crop: ${result.metadata.cropTypes.join(', ')}`);
      console.log(`     Region: ${result.metadata.region || 'N/A'}`);
    });
    console.log();

    // Test 5: Search with metadata filters (crop type)
    console.log('Test 5: Search with crop type filter (tomato)...');
    const filteredQuery: SearchQuery = {
      embedding: Array(1536).fill(0).map(() => Math.random()),
      topK: 5,
      similarityThreshold: 0.0,
      filters: {
        cropTypes: ['tomato']
      }
    };

    const filteredResults = await vectorDatabaseService.searchSimilar(filteredQuery);
    console.log(`✓ Found ${filteredResults.length} documents for tomato`);
    filteredResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.documentId}`);
      console.log(`     Crops: ${result.metadata.cropTypes.join(', ')}`);
    });
    console.log();

    // Test 6: Search with region filter
    console.log('Test 6: Search with region filter (Maharashtra)...');
    const regionQuery: SearchQuery = {
      embedding: Array(1536).fill(0).map(() => Math.random()),
      topK: 5,
      similarityThreshold: 0.0,
      filters: {
        region: 'Maharashtra'
      }
    };

    const regionResults = await vectorDatabaseService.searchSimilar(regionQuery);
    console.log(`✓ Found ${regionResults.length} documents for Maharashtra`);
    regionResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.documentId} - Region: ${result.metadata.region}`);
    });
    console.log();

    // Test 7: Get document by ID
    console.log('Test 7: Get document by ID...');
    const retrievedDoc = await vectorDatabaseService.getDocument(docId1);
    if (retrievedDoc) {
      console.log(`✓ Retrieved document: ${retrievedDoc.documentId}`);
      console.log(`  Content: ${retrievedDoc.content.substring(0, 50)}...`);
      console.log(`  Embedding dimension: ${retrievedDoc.embedding.length}`);
      console.log(`  Created: ${retrievedDoc.createdAt}`);
    } else {
      console.log('✗ Document not found');
    }
    console.log();

    // Test 8: Update document
    console.log('Test 8: Update document content...');
    await vectorDatabaseService.updateDocument(docId1, {
      content: 'Late blight in tomato is caused by Phytophthora infestans. UPDATED: Treatment includes copper-based fungicides applied every 7-10 days with proper spacing.'
    });
    const updatedDoc = await vectorDatabaseService.getDocument(docId1);
    if (updatedDoc) {
      console.log(`✓ Document updated successfully`);
      console.log(`  New content: ${updatedDoc.content.substring(0, 80)}...`);
    }
    console.log();

    // Test 9: Batch indexing
    console.log('Test 9: Batch index multiple documents...');
    const batchDocs: DocumentToIndex[] = [
      {
        content: 'Bacterial wilt in tomato requires crop rotation and resistant varieties.',
        embedding: Array(1536).fill(0).map(() => Math.random()),
        metadata: {
          source: 'Extension Guide',
          language: 'en',
          cropTypes: ['tomato'],
          diseaseCategories: ['bacterial'],
          documentType: 'extension_guide'
        }
      },
      {
        content: 'Aphid control in cotton using neem-based pesticides.',
        embedding: Array(1536).fill(0).map(() => Math.random()),
        metadata: {
          source: 'Treatment Protocol',
          language: 'en',
          cropTypes: ['cotton'],
          diseaseCategories: ['pest'],
          documentType: 'treatment_protocol'
        }
      }
    ];

    const batchIds = await vectorDatabaseService.indexBatchDocuments(batchDocs);
    console.log(`✓ Batch indexed ${batchIds.length} documents`);
    batchIds.forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`);
    });
    console.log();

    // Test 10: Delete document
    console.log('Test 10: Delete document...');
    await vectorDatabaseService.deleteDocument(docId2);
    const deletedDoc = await vectorDatabaseService.getDocument(docId2);
    if (deletedDoc === null) {
      console.log(`✓ Document ${docId2} deleted successfully`);
    } else {
      console.log('✗ Document still exists after deletion');
    }
    console.log();

    console.log('=== All tests completed successfully! ===');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests()
  .then(() => {
    console.log('\n✓ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test script failed:', error);
    process.exit(1);
  });
