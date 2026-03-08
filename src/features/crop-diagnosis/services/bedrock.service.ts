import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

/**
 * Region-specific Bedrock client pool for crop diagnosis
 * Reuses client instances for efficiency
 */
const bedrockClients: Map<string, BedrockRuntimeClient> = new Map();

/**
 * Model-to-region mapping for Bedrock models
 * Nova models are optimized for us-east-1 region
 */
const MODEL_REGIONS: Record<string, string> = {
  'amazon.nova-pro': 'us-east-1',
  'amazon.nova-lite': 'us-east-1',
  'amazon.nova-micro': 'us-east-1',
  'anthropic.claude': 'ap-southeast-2',
  'us.anthropic': 'us-east-1',
  'au.anthropic': 'ap-southeast-2',
};

/**
 * Bedrock service configuration for crop diagnosis
 */
export interface BedrockConfig {
  modelId: string;
  timeout: number;
  maxTokens: number;
  temperature: number;
  topP: number;
}

/**
 * Default configuration for Nova Pro model
 */
export const DEFAULT_BEDROCK_CONFIG: BedrockConfig = {
  modelId: process.env.CROP_DIAGNOSIS_MODEL_ID || 'amazon.nova-pro-v1:0',
  timeout: 30000, // 30 seconds for vision model processing
  maxTokens: 2000,
  temperature: 0.3, // Lower for consistent JSON output
  topP: 0.9,
};

/**
 * Get or create a Bedrock client for a specific region
 * Implements client pooling for reusable instances
 * 
 * @param region - AWS region
 * @returns BedrockRuntimeClient for the specified region
 */
export function getBedrockClient(region: string): BedrockRuntimeClient {
  if (!bedrockClients.has(region)) {
    const client = new BedrockRuntimeClient({
      region,
      requestHandler: {
        requestTimeout: DEFAULT_BEDROCK_CONFIG.timeout,
      },
    });
    bedrockClients.set(region, client);
  }
  return bedrockClients.get(region)!;
}

/**
 * Determine the appropriate AWS region for a given model ID
 * Nova models are routed to us-east-1 for optimal performance
 * 
 * @param modelId - Bedrock model ID (e.g., 'amazon.nova-pro-v1:0')
 * @returns AWS region for the model
 */
export function getRegionForModel(modelId: string): string {
  // Check for exact prefix matches first
  for (const [prefix, region] of Object.entries(MODEL_REGIONS)) {
    if (modelId.startsWith(prefix)) {
      return region;
    }
  }

  // Default to environment variable or us-east-1
  return process.env.BEDROCK_REGION || 'us-east-1';
}

/**
 * Get a configured Bedrock client for the specified model
 * Automatically selects the correct region based on model ID
 * 
 * @param modelId - Bedrock model ID (defaults to Nova Pro)
 * @returns BedrockRuntimeClient configured for the model's optimal region
 */
export function getBedrockClientForModel(
  modelId: string = DEFAULT_BEDROCK_CONFIG.modelId
): BedrockRuntimeClient {
  const region = getRegionForModel(modelId);
  return getBedrockClient(region);
}

/**
 * Clear all cached Bedrock clients
 * Useful for testing or when credentials change
 */
export function clearBedrockClients(): void {
  bedrockClients.clear();
}

/**
 * Get the current number of cached Bedrock clients
 * Useful for monitoring and testing
 */
export function getClientPoolSize(): number {
  return bedrockClients.size;
}

/**
 * Check if Bedrock service is properly configured
 * Validates that required AWS credentials are available
 */
export function isBedrockConfigured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );
}
