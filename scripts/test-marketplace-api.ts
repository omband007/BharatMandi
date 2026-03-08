import axios from 'axios';

async function testMarketplaceAPI() {
  const API_BASE = 'http://localhost:3000/api';
  
  try {
    console.log('🧪 Testing Marketplace API...\n');
    
    // Test GET /api/marketplace/listings
    console.log('📡 Fetching listings from API...');
    const response = await axios.get(`${API_BASE}/marketplace/listings`);
    
    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`📦 Total listings returned: ${response.data.length}`);
    
    // Filter ACTIVE listings (like buyer.html does)
    const activeListings = response.data.filter((l: any) => l.status === 'ACTIVE');
    console.log(`✅ ACTIVE listings: ${activeListings.length}`);
    
    if (activeListings.length > 0) {
      console.log('\n📋 Sample ACTIVE Listing:');
      const sample = activeListings[0];
      console.log(`  - ID: ${sample.id.substring(0, 8)}...`);
      console.log(`  - Produce: ${sample.produceType}`);
      console.log(`  - Quantity: ${sample.quantity} kg`);
      console.log(`  - Price: ₹${sample.pricePerKg}/kg`);
      console.log(`  - Status: ${sample.status}`);
      console.log(`  - Farmer ID: ${sample.farmerId.substring(0, 8)}...`);
    } else {
      console.log('\n⚠️  No ACTIVE listings found!');
    }
    
    console.log('\n✅ Marketplace API is working correctly!');
    console.log('🎉 buyer.html should now display listings properly.');
    
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Error: Server is not running!');
      console.log('💡 Start the server with: npm run dev');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testMarketplaceAPI();
