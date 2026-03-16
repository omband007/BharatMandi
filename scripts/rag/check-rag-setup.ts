/**
 * RAG Setup Verification Script
 * 
 * Checks all prerequisites for RAG functionality:
 * - PostgreSQL connection
 * - pgvector extension
 * - Database tables
 * - AWS Bedrock access
 * - Environment variables
 * 
 * Usage:
 *   npx ts-node scripts/check-rag-setup.ts
 */

import { pool } from '../src/shared/database/pg-config';
import { getEmbeddingService } from '../src/features/crop-diagnosis/services/embedding.service';
import * as dotenv from 'dotenv';

dotenv.config();

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

async function checkPostgreSQLConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version();');
    client.release();
    
    results.push({
      name: 'PostgreSQL Connection',
      status: 'pass',
      message: 'Connected successfully',
      details: result.rows[0].version.split(',')[0]
    });
  } catch (error) {
    results.push({
      name: 'PostgreSQL Connection',
      status: 'fail',
      message: 'Failed to connect',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function checkPgVectorExtension(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);
    client.release();
    
    if (result.rows.length > 0) {
      results.push({
        name: 'pgvector Extension',
        status: 'pass',
        message: 'Extension installed',
        details: `Version: ${result.rows[0].extversion || 'unknown'}`
      });
    } else {
      results.push({
        name: 'pgvector Extension',
        status: 'fail',
        message: 'Extension not installed',
        details: 'Run: CREATE EXTENSION vector;'
      });
    }
  } catch (error) {
    results.push({
      name: 'pgvector Extension',
      status: 'fail',
      message: 'Failed to check extension',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function checkRagDocumentsTable(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT COUNT(*) as count FROM rag_documents;
    `);
    client.release();
    
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      results.push({
        name: 'rag_documents Table',
        status: 'pass',
        message: 'Table exists with data',
        details: `${count} documents indexed`
      });
    } else {
      results.push({
        name: 'rag_documents Table',
        status: 'warning',
        message: 'Table exists but empty',
        details: 'Run: npx ts-node scripts/ingest-knowledge-base.ts'
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes('does not exist')) {
      results.push({
        name: 'rag_documents Table',
        status: 'warning',
        message: 'Table does not exist',
        details: 'Will be created automatically on first use'
      });
    } else {
      results.push({
        name: 'rag_documents Table',
        status: 'fail',
        message: 'Failed to check table',
        details: errorMsg
      });
    }
  }
}

async function checkAWSBedrock(): Promise<void> {
  try {
    const embeddingService = getEmbeddingService();
    const testText = 'Test embedding generation';
    
    const startTime = Date.now();
    const embedding = await embeddingService.generateEmbedding(testText);
    const duration = Date.now() - startTime;
    
    if (embedding && embedding.length === 1536) {
      results.push({
        name: 'AWS Bedrock (Embeddings)',
        status: 'pass',
        message: 'Embedding generation working',
        details: `Generated 1536-dim embedding in ${duration}ms`
      });
    } else {
      results.push({
        name: 'AWS Bedrock (Embeddings)',
        status: 'fail',
        message: 'Invalid embedding response',
        details: `Expected 1536 dimensions, got ${embedding?.length || 0}`
      });
    }
  } catch (error) {
    results.push({
      name: 'AWS Bedrock (Embeddings)',
      status: 'fail',
      message: 'Failed to generate embedding',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

function checkEnvironmentVariables(): void {
  const requiredVars = [
    'POSTGRES_HOST',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'AWS_REGION',
    'EMBEDDING_MODEL_ID',
    'BEDROCK_MODEL_ID',
    'BEDROCK_REGION'
  ];
  
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length === 0) {
    results.push({
      name: 'Environment Variables',
      status: 'pass',
      message: 'All required variables set',
      details: requiredVars.join(', ')
    });
  } else {
    results.push({
      name: 'Environment Variables',
      status: 'fail',
      message: 'Missing required variables',
      details: missingVars.join(', ')
    });
  }
  
  // Check RAG-specific settings
  const ragEnabled = process.env.RAG_ENABLED === 'true';
  const similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7');
  
  results.push({
    name: 'RAG Configuration',
    status: ragEnabled ? 'pass' : 'warning',
    message: ragEnabled ? 'RAG enabled' : 'RAG disabled',
    details: `Similarity threshold: ${similarityThreshold}`
  });
}

function printResults(): void {
  console.log('='.repeat(70));
  console.log('RAG Setup Verification');
  console.log('='.repeat(70));
  console.log('');
  
  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;
  
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
    const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'fail' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${icon} ${result.name}${reset}`);
    console.log(`  ${result.message}`);
    if (result.details) {
      console.log(`  ${result.details}`);
    }
    console.log('');
    
    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warningCount++;
  });
  
  console.log('='.repeat(70));
  console.log('Summary');
  console.log('='.repeat(70));
  console.log(`✓ Passed: ${passCount}`);
  console.log(`⚠ Warnings: ${warningCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log('');
  
  if (failCount === 0 && warningCount === 0) {
    console.log('✓ All checks passed! RAG system is ready.');
  } else if (failCount === 0) {
    console.log('⚠ System functional but has warnings. Review above.');
  } else {
    console.log('✗ System has failures. Fix issues above before proceeding.');
  }
  console.log('');
}

async function runChecks(): Promise<void> {
  console.log('Running RAG setup verification...');
  console.log('');
  
  // Run checks in sequence
  checkEnvironmentVariables();
  await checkPostgreSQLConnection();
  await checkPgVectorExtension();
  await checkRagDocumentsTable();
  await checkAWSBedrock();
  
  // Print results
  printResults();
  
  // Close pool
  await pool.end();
  
  // Exit with appropriate code
  const hasFailures = results.some(r => r.status === 'fail');
  process.exit(hasFailures ? 1 : 0);
}

// Run checks
runChecks().catch(error => {
  console.error('');
  console.error('✗ Verification failed:', error);
  process.exit(1);
});
