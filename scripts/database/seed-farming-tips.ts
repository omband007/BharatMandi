/**
 * Seed farming tips database
 * Populates MongoDB with farming advice for major crops
 */

import { MongoClient } from 'mongodb';
import { farmingTipsSeedData } from '../src/shared/database/seeds/farming-tips-seed';

async function seedFarmingTips() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('bharat_mandi');
    const collection = db.collection('farming_tips');
    
    // Check if data already exists
    const existingCount = await collection.countDocuments();
    
    if (existingCount > 0) {
      console.log(`\n⚠️  Found ${existingCount} existing farming tips`);
      console.log('Do you want to:');
      console.log('1. Skip seeding (keep existing data)');
      console.log('2. Clear and re-seed');
      console.log('\nDefaulting to skip. To re-seed, delete the collection first.');
      return;
    }
    
    console.log('\nSeeding farming tips...');
    console.log(`Total tips to insert: ${farmingTipsSeedData.length}`);
    
    // Insert all tips
    const result = await collection.insertMany(farmingTipsSeedData);
    console.log(`✅ Inserted ${result.insertedCount} farming tips`);
    
    // Create indexes for better query performance
    console.log('\nCreating indexes...');
    await collection.createIndex({ crop: 1, topic: 1 });
    await collection.createIndex({ language: 1 });
    console.log('✅ Indexes created');
    
    // Show summary
    console.log('\n=== Summary ===');
    const crops = await collection.distinct('crop', { language: 'en' });
    const topics = await collection.distinct('topic', { language: 'en' });
    const languages = await collection.distinct('language');
    
    console.log(`Crops: ${crops.length} (${crops.join(', ')})`);
    console.log(`Topics: ${topics.length} (${topics.join(', ')})`);
    console.log(`Languages: ${languages.length} (${languages.join(', ')})`);
    
    console.log('\n✅ Farming tips database seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  seedFarmingTips()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedFarmingTips };
