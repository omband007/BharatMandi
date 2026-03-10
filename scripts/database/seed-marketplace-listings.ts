import { DatabaseManager } from '../src/shared/database/db-abstraction';

/**
 * Seed marketplace with sample listings for testing
 */
async function seedMarketplaceListings() {
  console.log('[Seed] Starting marketplace listings seed...');
  
  const dbManager = new DatabaseManager();
  
  try {
    // Sample listings for common crops
    const sampleListings = [
      // Tomato
      { produceType: 'Tomato', quantity: 100, pricePerKg: 30, farmerId: 'farmer-1', certificateId: 'cert-1' },
      { produceType: 'Tomato', quantity: 150, pricePerKg: 35, farmerId: 'farmer-2', certificateId: 'cert-2' },
      { produceType: 'Tomato', quantity: 200, pricePerKg: 40, farmerId: 'farmer-3', certificateId: 'cert-3' },
      
      // Potato
      { produceType: 'Potato', quantity: 500, pricePerKg: 20, farmerId: 'farmer-4', certificateId: 'cert-4' },
      { produceType: 'Potato', quantity: 300, pricePerKg: 25, farmerId: 'farmer-5', certificateId: 'cert-5' },
      { produceType: 'Potato', quantity: 400, pricePerKg: 22, farmerId: 'farmer-6', certificateId: 'cert-6' },
      
      // Onion
      { produceType: 'Onion', quantity: 250, pricePerKg: 35, farmerId: 'farmer-7', certificateId: 'cert-7' },
      { produceType: 'Onion', quantity: 300, pricePerKg: 40, farmerId: 'farmer-8', certificateId: 'cert-8' },
      { produceType: 'Onion', quantity: 200, pricePerKg: 38, farmerId: 'farmer-9', certificateId: 'cert-9' },
      
      // Wheat
      { produceType: 'Wheat', quantity: 1000, pricePerKg: 25, farmerId: 'farmer-10', certificateId: 'cert-10' },
      { produceType: 'Wheat', quantity: 800, pricePerKg: 27, farmerId: 'farmer-11', certificateId: 'cert-11' },
      { produceType: 'Wheat', quantity: 1200, pricePerKg: 26, farmerId: 'farmer-12', certificateId: 'cert-12' },
      
      // Rice
      { produceType: 'Rice', quantity: 900, pricePerKg: 40, farmerId: 'farmer-13', certificateId: 'cert-13' },
      { produceType: 'Rice', quantity: 700, pricePerKg: 42, farmerId: 'farmer-14', certificateId: 'cert-14' },
      { produceType: 'Rice', quantity: 1000, pricePerKg: 41, farmerId: 'farmer-15', certificateId: 'cert-15' },
    ];
    
    console.log(`[Seed] Creating ${sampleListings.length} sample listings...`);
    
    // Note: This is a simplified version. In production, you'd use proper database insertion
    // For now, this demonstrates the data structure needed
    
    console.log('[Seed] Sample listings data:');
    console.log(JSON.stringify(sampleListings, null, 2));
    
    console.log('\n[Seed] ⚠️  Note: This script shows the data structure.');
    console.log('[Seed] To actually insert data, you need to:');
    console.log('[Seed] 1. Check which database you\'re using (SQLite or PostgreSQL)');
    console.log('[Seed] 2. Use the appropriate database client to insert listings');
    console.log('[Seed] 3. Or implement the insertion logic in DatabaseManager');
    
    console.log('\n[Seed] ✅ Seed script completed!');
    
  } catch (error) {
    console.error('[Seed] Error seeding marketplace listings:', error);
    throw error;
  }
}

// Run the seed function
seedMarketplaceListings()
  .then(() => {
    console.log('[Seed] Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Seed] Failed:', error);
    process.exit(1);
  });
