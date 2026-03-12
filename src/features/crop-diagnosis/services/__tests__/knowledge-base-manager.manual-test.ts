/**
 * Manual test for Knowledge Base Manager
 * 
 * This script demonstrates the full document ingestion pipeline:
 * 1. Add a document with chunking
 * 2. Retrieve the document
 * 3. List documents with filters
 * 4. Update a document
 * 5. Delete a document
 * 
 * Run with: npx ts-node src/features/crop-diagnosis/services/__tests__/knowledge-base-manager.manual-test.ts
 */

import { connectMongoDB, disconnectMongoDB } from '../../../../shared/database/mongodb-config';
import { KnowledgeBaseManager, KnowledgeDocument } from '../knowledge-base-manager.service';
import { EmbeddingService } from '../embedding.service';
import { VectorDatabaseService } from '../vector-database.service';
import type { DocumentMetadata } from '../vector-database.service';

async function runManualTest() {
  console.log('\n=== Knowledge Base Manager Manual Test ===\n');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✓ MongoDB connected\n');

    // Initialize services
    console.log('Initializing services...');
    const embeddingService = new EmbeddingService();
    const vectorDbService = new VectorDatabaseService();
    await vectorDbService.initialize();
    console.log('✓ Services initialized\n');

    // Create Knowledge Base Manager
    const kbManager = new KnowledgeBaseManager(embeddingService, vectorDbService);

    // Test 1: Add a document
    console.log('Test 1: Adding a document...');
    const sampleDocument: KnowledgeDocument = {
      title: 'Tomato Late Blight Management Guide',
      content: `
Late blight, caused by Phytophthora infestans, is one of the most destructive diseases of tomato crops worldwide. The disease can cause complete crop loss within days under favorable conditions.

Symptoms:
The disease first appears as water-soaked lesions on leaves, which quickly turn brown and necrotic. White fungal growth may be visible on the underside of leaves during humid conditions. Stems develop dark brown lesions that can girdle the plant. Fruits show firm, brown lesions that may become covered with white fungal growth.

Chemical Control:
Apply fungicides containing mancozeb (2.5 kg/ha) or chlorothalonil (2 kg/ha) at 7-10 day intervals. For severe infections, use metalaxyl + mancozeb (2.5 kg/ha) every 5-7 days. Always follow pre-harvest intervals: mancozeb (7 days), chlorothalonil (7 days), metalaxyl (14 days).

Organic Control:
Copper-based fungicides (copper oxychloride at 2.5 kg/ha) can provide moderate control. Neem oil (5 ml/liter) applied weekly can reduce disease severity. Bacillus subtilis-based bio-fungicides show promise in early disease stages.

Preventive Measures:
Use resistant varieties like Pusa Ruby or Arka Vikas. Maintain proper plant spacing (60 cm x 45 cm) for air circulation. Avoid overhead irrigation. Remove and destroy infected plant debris. Practice crop rotation with non-solanaceous crops for 2-3 years.

Regional Considerations:
In Maharashtra, late blight is most severe during kharif season (July-September) when humidity is high. In hill regions, the disease can occur year-round. Adjust fungicide spray schedules based on weather forecasts.
      `.trim(),
      metadata: {
        source: 'Indian Council of Agricultural Research',
        author: 'Dr. Rajesh Kumar',
        organization: 'ICAR-IIHR',
        publicationDate: new Date('2024-01-15'),
        language: 'en',
        cropTypes: ['tomato'],
        diseaseCategories: ['fungal'],
        region: 'Maharashtra',
        season: 'kharif',
        documentType: 'treatment_protocol',
        url: 'https://icar.org.in/tomato-late-blight'
      },
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const documentId = await kbManager.addDocument(sampleDocument);
    console.log(`✓ Document added with ID: ${documentId}\n`);

    // Test 2: Retrieve the document
    console.log('Test 2: Retrieving document...');
    const retrievedDoc = await kbManager.getDocument(documentId);
    if (retrievedDoc) {
      console.log(`✓ Retrieved document: ${retrievedDoc.title}`);
      console.log(`  Status: ${retrievedDoc.status}`);
      console.log(`  Crop types: ${retrievedDoc.metadata.cropTypes.join(', ')}`);
      console.log(`  Disease categories: ${retrievedDoc.metadata.diseaseCategories.join(', ')}\n`);
    } else {
      console.log('✗ Document not found\n');
    }

    // Test 3: List documents with filters
    console.log('Test 3: Listing documents with filters...');
    const documents = await kbManager.listDocuments({
      cropTypes: ['tomato'],
      status: 'published'
    });
    console.log(`✓ Found ${documents.length} documents matching filters`);
    documents.forEach(doc => {
      console.log(`  - ${doc.title} (${doc.status})`);
    });
    console.log();

    // Test 4: Update document status
    console.log('Test 4: Updating document status...');
    await kbManager.updateDocument(documentId, {
      status: 'archived'
    });
    const updatedDoc = await kbManager.getDocument(documentId);
    console.log(`✓ Document status updated to: ${updatedDoc?.status}\n`);

    // Test 5: Delete the document
    console.log('Test 5: Deleting document...');
    await kbManager.deleteDocument(documentId);
    const deletedDoc = await kbManager.getDocument(documentId);
    console.log(`✓ Document deleted: ${deletedDoc === null ? 'confirmed' : 'failed'}\n`);

    console.log('=== All tests completed successfully ===\n');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await disconnectMongoDB();
    process.exit(0);
  }
}

// Run the test
runManualTest();
