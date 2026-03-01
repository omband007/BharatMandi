#!/usr/bin/env node

/**
 * Test AWS Lex Connection
 * 
 * This script tests the connection to AWS Lex and verifies the bot configuration.
 * Run this after setting up your Lex bot to ensure everything is configured correctly.
 * 
 * Usage:
 *   node scripts/test-lex-connection.js
 */

require('dotenv').config();
const { LexRuntimeV2Client, RecognizeTextCommand } = require('@aws-sdk/client-lex-runtime-v2');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testLexConnection() {
  logSection('AWS Lex Connection Test');

  // Step 1: Check environment variables
  log('\n1. Checking environment variables...', 'blue');
  
  const botId = process.env.LEX_BOT_ID;
  const botAliasId = process.env.LEX_BOT_ALIAS_ID;
  const region = process.env.LEX_REGION || process.env.AWS_REGION || 'ap-southeast-2';
  
  if (!botId) {
    log('   ✗ LEX_BOT_ID not found in .env', 'red');
    log('   Please add LEX_BOT_ID to your .env file', 'yellow');
    process.exit(1);
  }
  log(`   ✓ LEX_BOT_ID: ${botId}`, 'green');
  
  if (!botAliasId) {
    log('   ✗ LEX_BOT_ALIAS_ID not found in .env', 'red');
    log('   Please add LEX_BOT_ALIAS_ID to your .env file', 'yellow');
    process.exit(1);
  }
  log(`   ✓ LEX_BOT_ALIAS_ID: ${botAliasId}`, 'green');
  log(`   ✓ Region: ${region}`, 'green');

  // Step 2: Initialize Lex client
  log('\n2. Initializing AWS Lex client...', 'blue');
  
  let lexClient;
  try {
    lexClient = new LexRuntimeV2Client({ region });
    log('   ✓ Lex client initialized', 'green');
  } catch (error) {
    log(`   ✗ Failed to initialize Lex client: ${error.message}`, 'red');
    process.exit(1);
  }

  // Step 3: Test connection with a simple query
  log('\n3. Testing connection with sample query...', 'blue');
  log('   Query: "What is the price of tomato?"', 'cyan');
  
  const testQuery = {
    botId,
    botAliasId,
    localeId: 'en_IN',
    sessionId: `test-session-${Date.now()}`,
    text: 'What is the price of tomato?',
  };

  try {
    const command = new RecognizeTextCommand(testQuery);
    const response = await lexClient.send(command);
    
    log('   ✓ Connection successful!', 'green');
    
    // Display response details
    log('\n4. Response details:', 'blue');
    
    const intent = response.sessionState?.intent?.name || 'Unknown';
    const intentState = response.sessionState?.intent?.state || 'Unknown';
    const message = response.messages?.[0]?.content || 'No message';
    
    log(`   Intent: ${intent}`, 'cyan');
    log(`   Intent State: ${intentState}`, 'cyan');
    log(`   Response: ${message}`, 'cyan');
    
    if (response.sessionState?.intent?.slots) {
      log('   Slots:', 'cyan');
      for (const [key, value] of Object.entries(response.sessionState.intent.slots)) {
        if (value && value.value) {
          log(`     - ${key}: ${value.value.interpretedValue}`, 'cyan');
        }
      }
    }

    // Step 5: Test multiple intents
    log('\n5. Testing multiple intents...', 'blue');
    
    const testQueries = [
      { text: 'What is the weather today?', expectedIntent: 'GetWeather' },
      { text: 'How do I grow wheat?', expectedIntent: 'GetFarmingAdvice' },
      { text: 'I want to sell rice', expectedIntent: 'CreateListing' },
      { text: 'Go to my listings', expectedIntent: 'NavigateApp' },
      { text: 'Help', expectedIntent: 'AMAZON.HelpIntent' },
    ];

    let successCount = 0;
    let failCount = 0;

    for (const query of testQueries) {
      try {
        const cmd = new RecognizeTextCommand({
          ...testQuery,
          text: query.text,
          sessionId: `test-session-${Date.now()}`,
        });
        const res = await lexClient.send(cmd);
        const recognizedIntent = res.sessionState?.intent?.name;
        
        if (recognizedIntent === query.expectedIntent) {
          log(`   ✓ "${query.text}" → ${recognizedIntent}`, 'green');
          successCount++;
        } else {
          log(`   ✗ "${query.text}" → Expected: ${query.expectedIntent}, Got: ${recognizedIntent}`, 'yellow');
          failCount++;
        }
      } catch (error) {
        log(`   ✗ "${query.text}" → Error: ${error.message}`, 'red');
        failCount++;
      }
    }

    // Summary
    logSection('Test Summary');
    log(`Total tests: ${testQueries.length + 1}`, 'cyan');
    log(`Passed: ${successCount + 1}`, 'green');
    if (failCount > 0) {
      log(`Failed: ${failCount}`, 'yellow');
      log('\nNote: Some failures are expected if intents are not fully configured.', 'yellow');
    }
    
    log('\n✓ AWS Lex is configured and working!', 'green');
    log('\nYou can now use Kisan Mitra in live mode.', 'cyan');
    log('Open: http://localhost:3000/kisan-mitra-test.html\n', 'cyan');

  } catch (error) {
    log('   ✗ Connection failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
    
    // Provide helpful error messages
    if (error.name === 'ResourceNotFoundException') {
      log('\n   Possible causes:', 'yellow');
      log('   - Bot ID or Alias ID is incorrect', 'yellow');
      log('   - Bot is in a different region', 'yellow');
      log('   - Bot has not been built yet', 'yellow');
    } else if (error.name === 'AccessDeniedException') {
      log('\n   Possible causes:', 'yellow');
      log('   - AWS credentials are not configured', 'yellow');
      log('   - IAM user lacks Lex permissions', 'yellow');
      log('   - Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env', 'yellow');
    }
    
    process.exit(1);
  }
}

// Run the test
testLexConnection().catch((error) => {
  log(`\nUnexpected error: ${error.message}`, 'red');
  process.exit(1);
});
