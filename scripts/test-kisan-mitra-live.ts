/**
 * Live test script for Kisan Mitra handlers
 * Tests the integrated system with real database and APIs
 */

import { kisanMitraService } from '../src/features/i18n/kisan-mitra.service';
import { DatabaseManager } from '../src/shared/database/db-abstraction';
import { CropPriceHandler } from '../src/features/i18n/handlers/crop-price.handler';
import { WeatherHandler } from '../src/features/i18n/handlers/weather.handler';
import { FarmingAdviceHandler } from '../src/features/i18n/handlers/farming-advice.handler';
import mongoose from 'mongoose';

async function testCropPriceHandler() {
  console.log('\n=== Testing Crop Price Handler ===\n');
  
  const dbManager = new DatabaseManager();
  const handler = new CropPriceHandler(dbManager);
  
  try {
    // Test 1: Query for tomato prices
    console.log('Test 1: Querying tomato prices...');
    const priceData = await handler.handle('tomato');
    const formatted = await handler.formatResponse(priceData, 'en');
    console.log('✅ Success:', formatted.text);
    console.log('   Data:', JSON.stringify(priceData, null, 2));
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
  
  try {
    // Test 2: Query for non-existent crop
    console.log('\nTest 2: Querying non-existent crop...');
    const priceData = await handler.handle('dragonfruit');
    const formatted = await handler.formatResponse(priceData, 'en');
    console.log('✅ Success:', formatted.text);
  } catch (error) {
    console.log('✅ Expected error:', error instanceof Error ? error.message : error);
  }
  
  try {
    // Test 3: Query in Hindi
    console.log('\nTest 3: Querying in Hindi...');
    const priceData = await handler.handle('tomato');
    const formatted = await handler.formatResponse(priceData, 'hi');
    console.log('✅ Success (Hindi):', formatted.text);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

async function testWeatherHandler() {
  console.log('\n=== Testing Weather Handler ===\n');
  
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  OPENWEATHER_API_KEY not configured. Skipping weather tests.');
    console.log('   To test weather handler, add OPENWEATHER_API_KEY to .env file');
    return;
  }
  
  const handler = new WeatherHandler(apiKey);
  
  try {
    // Test 1: Query weather for Mumbai
    console.log('Test 1: Querying weather for Mumbai...');
    const weatherData = await handler.handle('Mumbai');
    const formatted = await handler.formatResponse(weatherData, 'en');
    console.log('✅ Success:', formatted.text.substring(0, 200) + '...');
    console.log('   Current temp:', weatherData.current.temperature + '°C');
    console.log('   Humidity:', weatherData.current.humidity + '%');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
  
  try {
    // Test 2: Query for invalid location
    console.log('\nTest 2: Querying invalid location...');
    const weatherData = await handler.handle('InvalidCity123');
    const formatted = await handler.formatResponse(weatherData, 'en');
    console.log('✅ Success:', formatted.text);
  } catch (error) {
    console.log('✅ Expected error:', error instanceof Error ? error.message : error);
  }
}

async function testFarmingAdviceHandler() {
  console.log('\n=== Testing Farming Advice Handler ===\n');
  
  const handler = new FarmingAdviceHandler();
  
  try {
    // Test 1: Query farming advice for tomato planting
    console.log('Test 1: Querying tomato planting advice...');
    const adviceData = await handler.handle('tomato', 'planting', 'en');
    const formatted = await handler.formatResponse(adviceData, 'en');
    console.log('✅ Success:', formatted.text.substring(0, 200) + '...');
    console.log('   Tips count:', adviceData.tips.length);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
  
  try {
    // Test 2: Query for wheat irrigation
    console.log('\nTest 2: Querying wheat irrigation advice...');
    const adviceData = await handler.handle('wheat', 'irrigation', 'en');
    const formatted = await handler.formatResponse(adviceData, 'en');
    console.log('✅ Success:', formatted.text.substring(0, 200) + '...');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
  
  try {
    // Test 3: Query in Hindi
    console.log('\nTest 3: Querying in Hindi...');
    const adviceData = await handler.handle('tomato', 'planting', 'hi');
    const formatted = await handler.formatResponse(adviceData, 'hi');
    console.log('✅ Success (Hindi):', formatted.text.substring(0, 200) + '...');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
  
  try {
    // Test 4: Query for non-existent crop
    console.log('\nTest 4: Querying non-existent crop...');
    const adviceData = await handler.handle('dragonfruit', 'planting', 'en');
    const formatted = await handler.formatResponse(adviceData, 'en');
    console.log('✅ Success:', formatted.text);
  } catch (error) {
    console.log('✅ Expected error:', error instanceof Error ? error.message : error);
  }
}

async function testIntegratedSystem() {
  console.log('\n=== Testing Integrated Kisan Mitra System ===\n');
  console.log('⚠️  Note: This requires AWS Lex to be configured and running');
  console.log('   Skipping integrated tests for now. Use the test HTML page instead.\n');
  
  // You can uncomment this to test with real Lex
  /*
  try {
    console.log('Test: Asking about tomato prices...');
    const response = await kisanMitraService.processQuery({
      userId: 'test-user',
      sessionId: 'test-session-' + Date.now(),
      query: 'What is the price of tomato?',
      language: 'en',
    });
    
    console.log('✅ Response:', response.text);
    console.log('   Intent:', response.intent);
    console.log('   Confidence:', response.confidence);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
  */
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Kisan Mitra Live System Test - Phase 1 Complete       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Connect to MongoDB first
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bharat_mandi';
  try {
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.log('⚠️  Farming advice tests will fail without MongoDB\n');
  }
  
  try {
    await testCropPriceHandler();
    await testWeatherHandler();
    await testFarmingAdviceHandler();
    await testIntegratedSystem();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Tests Complete!                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('Next Steps:');
    console.log('1. Add OPENWEATHER_API_KEY to .env to test weather handler');
    console.log('2. Seed farming tips database: npm run seed:farming-tips');
    console.log('3. Open public/kisan-mitra-test.html to test with Lex');
    console.log('4. Start Phase 2: Conversation Context\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    // Close database connections
    await mongoose.disconnect();
    await kisanMitraService.close();
    process.exit(0);
  }
}

main();
