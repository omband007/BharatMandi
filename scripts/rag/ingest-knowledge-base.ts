/**
 * Knowledge Base Ingestion Script
 * 
 * Ingests disease data from JSON files into the vector database.
 * Run this script before testing RAG functionality.
 * 
 * Usage:
 *   npx ts-node scripts/ingest-knowledge-base.ts
 */

import { getEmbeddingService } from '../src/features/crop-diagnosis/services/embedding.service';
import { vectorDatabaseService } from '../src/features/crop-diagnosis/services/vector-database.service';
import fungalDiseases from '../src/features/crop-diagnosis/data/knowledge-base/fungal.json';
import bacterialDiseases from '../src/features/crop-diagnosis/data/knowledge-base/bacterial.json';
import viralDiseases from '../src/features/crop-diagnosis/data/knowledge-base/viral.json';
import pests from '../src/features/crop-diagnosis/data/knowledge-base/pests.json';
import nutrientDeficiencies from '../src/features/crop-diagnosis/data/knowledge-base/nutrient-deficiency.json';

interface Disease {
  name: string;
  scientificName: string;
  affectedCrops: string[];
  chemicalRemedies?: any[];
  organicRemedies?: any[];
  preventiveMeasures?: any[];
}

async function ingestKnowledgeBase() {
  console.log('='.repeat(60));
  console.log('Knowledge Base Ingestion Script');
  console.log('='.repeat(60));
  console.log('');
  
  let totalDocuments = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    // Initialize services
    console.log('Initializing services...');
    const embeddingService = getEmbeddingService();
    console.log('✓ Embedding service initialized');
    console.log('✓ Vector database service initialized');
    console.log('');

    // Combine all diseases
    const allDiseases: Array<Disease & { type: string }> = [
      ...fungalDiseases.diseases.map(d => ({ ...d, type: 'fungal' })),
      ...bacterialDiseases.diseases.map(d => ({ ...d, type: 'bacterial' })),
      ...viralDiseases.diseases.map(d => ({ ...d, type: 'viral' })),
      ...pests.diseases.map(d => ({ ...d, type: 'pest' })),
      ...nutrientDeficiencies.diseases.map(d => ({ ...d, type: 'nutrient_deficiency' }))
    ];

    console.log(`Found ${allDiseases.length} diseases to ingest:`);
    console.log(`  - Fungal: ${fungalDiseases.diseases.length}`);
    console.log(`  - Bacterial: ${bacterialDiseases.diseases.length}`);
    console.log(`  - Viral: ${viralDiseases.diseases.length}`);
    console.log(`  - Pests: ${pests.diseases.length}`);
    console.log(`  - Nutrient Deficiency: ${nutrientDeficiencies.diseases.length}`);
    console.log('');

    // Process each disease
    for (const disease of allDiseases) {
      totalDocuments++;
      
      try {
        console.log(`[${totalDocuments}/${allDiseases.length}] Processing: ${disease.name}`);
        console.log(`  Scientific name: ${disease.scientificName}`);
        console.log(`  Type: ${disease.type}`);
        console.log(`  Affected crops: ${disease.affectedCrops.join(', ')}`);
        
        // Create document content
        const content = createDocumentContent(disease);
        console.log(`  Content length: ${content.length} characters`);
        
        // Generate embedding
        console.log('  Generating embedding...');
        const startEmbed = Date.now();
        const embedding = await embeddingService.generateEmbedding(content);
        const embedTime = Date.now() - startEmbed;
        console.log(`  ✓ Embedding generated (${embedTime}ms, dimension: ${embedding.length})`);
        
        // Index in vector database
        console.log('  Indexing in vector database...');
        const startIndex = Date.now();
        const documentId = await vectorDatabaseService.indexDocument({
          content,
          embedding,
          metadata: {
            source: `Knowledge Base - ${disease.type}`,
            language: 'en',
            cropTypes: disease.affectedCrops,
            diseaseCategories: [disease.type],
            documentType: 'treatment_protocol',
            author: 'ICAR',
            publicationDate: new Date('2024-01-01'),
          }
        });
        const indexTime = Date.now() - startIndex;
        console.log(`  ✓ Indexed successfully (${indexTime}ms, ID: ${documentId})`);
        
        successCount++;
        console.log('');
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Failed to process ${disease.name}:`, error);
        console.log('');
      }
    }

    // Summary
    console.log('='.repeat(60));
    console.log('Ingestion Complete!');
    console.log('='.repeat(60));
    console.log(`Total diseases processed: ${totalDocuments}`);
    console.log(`Successfully indexed: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('');
    
    if (successCount > 0) {
      console.log('✓ Knowledge base is ready for RAG testing!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Verify documents in database:');
      console.log('   psql -h localhost -U postgres -d bharat_mandi -c "SELECT COUNT(*) FROM rag_documents;"');
      console.log('2. Test RAG with a diagnosis request');
      console.log('3. Check logs for RAG enhancement messages');
    }
    
    if (errorCount > 0) {
      console.log('');
      console.log('⚠ Some documents failed to ingest. Check errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('✗ Fatal error during ingestion:', error);
    process.exit(1);
  }
}

/**
 * Create document content from disease data
 */
function createDocumentContent(disease: Disease & { type: string }): string {
  const sections: string[] = [];
  
  // Disease information
  sections.push(`Disease: ${disease.name} (${disease.scientificName})`);
  sections.push(`Type: ${disease.type}`);
  sections.push(`Affected Crops: ${disease.affectedCrops.join(', ')}`);
  sections.push('');
  
  // Chemical remedies
  if (disease.chemicalRemedies && disease.chemicalRemedies.length > 0) {
    sections.push('Chemical Treatments:');
    disease.chemicalRemedies.forEach((remedy: any, index: number) => {
      sections.push(`${index + 1}. ${remedy.genericName} (${remedy.brandNames.join(', ')})`);
      sections.push(`   Dosage: ${remedy.dosage}`);
      sections.push(`   Application: ${remedy.applicationMethod}, ${remedy.frequency}`);
      sections.push(`   Pre-harvest interval: ${remedy.preHarvestInterval} days`);
      sections.push(`   Cost: ${remedy.costEstimate}`);
      sections.push(`   Precautions: ${remedy.safetyPrecautions.join('; ')}`);
    });
    sections.push('');
  }
  
  // Organic remedies
  if (disease.organicRemedies && disease.organicRemedies.length > 0) {
    sections.push('Organic Treatments:');
    disease.organicRemedies.forEach((remedy: any, index: number) => {
      sections.push(`${index + 1}. ${remedy.name}`);
      sections.push(`   Ingredients: ${remedy.ingredients.join(', ')}`);
      sections.push(`   Preparation: ${remedy.preparation.join('; ')}`);
      sections.push(`   Application: ${remedy.applicationMethod}, ${remedy.frequency}`);
      sections.push(`   Effectiveness: ${remedy.effectiveness}`);
      if (remedy.commercialProducts && remedy.commercialProducts.length > 0) {
        sections.push(`   Commercial products: ${remedy.commercialProducts.join(', ')}`);
      }
    });
    sections.push('');
  }
  
  // Preventive measures
  if (disease.preventiveMeasures && disease.preventiveMeasures.length > 0) {
    sections.push('Preventive Measures:');
    disease.preventiveMeasures.forEach((measure: any, index: number) => {
      sections.push(`${index + 1}. ${measure.description}`);
      sections.push(`   Category: ${measure.category}`);
      sections.push(`   Timing: ${measure.timing}`);
      if (measure.frequency) {
        sections.push(`   Frequency: ${measure.frequency}`);
      }
    });
  }
  
  return sections.join('\n');
}

// Run ingestion
console.log('Starting knowledge base ingestion...');
console.log('');

ingestKnowledgeBase()
  .then(() => {
    console.log('');
    console.log('✓ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('✗ Ingestion failed:', error);
    process.exit(1);
  });
