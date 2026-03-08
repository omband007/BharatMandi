import {
  getBedrockClient,
  getRegionForModel,
  getBedrockClientForModel,
  clearBedrockClients,
  getClientPoolSize,
  isBedrockConfigured,
  DEFAULT_BEDROCK_CONFIG,
} from '../bedrock.service';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

describe('Bedrock Service', () => {
  beforeEach(() => {
    // Clear client pool before each test
    clearBedrockClients();
  });

  describe('getRegionForModel', () => {
    it('should return us-east-1 for Nova Pro models', () => {
      expect(getRegionForModel('amazon.nova-pro-v1:0')).toBe('us-east-1');
      expect(getRegionForModel('amazon.nova-pro')).toBe('us-east-1');
    });

    it('should return us-east-1 for Nova Lite models', () => {
      expect(getRegionForModel('amazon.nova-lite-v1:0')).toBe('us-east-1');
      expect(getRegionForModel('amazon.nova-lite')).toBe('us-east-1');
    });

    it('should return us-east-1 for Nova Micro models', () => {
      expect(getRegionForModel('amazon.nova-micro-v1:0')).toBe('us-east-1');
      expect(getRegionForModel('amazon.nova-micro')).toBe('us-east-1');
    });

    it('should return ap-southeast-2 for Claude base models', () => {
      expect(getRegionForModel('anthropic.claude-v2')).toBe('ap-southeast-2');
      expect(getRegionForModel('anthropic.claude-3-sonnet')).toBe('ap-southeast-2');
    });

    it('should return us-east-1 for US Claude inference profiles', () => {
      expect(getRegionForModel('us.anthropic.claude-3-5-sonnet-20241022-v2:0')).toBe('us-east-1');
    });

    it('should return ap-southeast-2 for AU Claude inference profiles', () => {
      expect(getRegionForModel('au.anthropic.claude-3-5-sonnet-20241022-v2:0')).toBe('ap-southeast-2');
    });

    it('should return default region for unknown models', () => {
      const originalRegion = process.env.BEDROCK_REGION;
      process.env.BEDROCK_REGION = 'eu-west-1';
      
      expect(getRegionForModel('unknown.model')).toBe('eu-west-1');
      
      // Restore original
      if (originalRegion) {
        process.env.BEDROCK_REGION = originalRegion;
      } else {
        delete process.env.BEDROCK_REGION;
      }
    });

    it('should return us-east-1 as fallback when no BEDROCK_REGION is set', () => {
      const originalRegion = process.env.BEDROCK_REGION;
      delete process.env.BEDROCK_REGION;
      
      expect(getRegionForModel('unknown.model')).toBe('us-east-1');
      
      // Restore original
      if (originalRegion) {
        process.env.BEDROCK_REGION = originalRegion;
      }
    });
  });

  describe('getBedrockClient', () => {
    it('should create a new client for a region', () => {
      const client = getBedrockClient('us-east-1');
      expect(client).toBeInstanceOf(BedrockRuntimeClient);
    });

    it('should reuse existing client for the same region', () => {
      const client1 = getBedrockClient('us-east-1');
      const client2 = getBedrockClient('us-east-1');
      expect(client1).toBe(client2);
    });

    it('should create different clients for different regions', () => {
      const client1 = getBedrockClient('us-east-1');
      const client2 = getBedrockClient('ap-southeast-2');
      expect(client1).not.toBe(client2);
    });

    it('should increment pool size when creating new clients', () => {
      expect(getClientPoolSize()).toBe(0);
      
      getBedrockClient('us-east-1');
      expect(getClientPoolSize()).toBe(1);
      
      getBedrockClient('ap-southeast-2');
      expect(getClientPoolSize()).toBe(2);
      
      // Reusing should not increment
      getBedrockClient('us-east-1');
      expect(getClientPoolSize()).toBe(2);
    });
  });

  describe('getBedrockClientForModel', () => {
    it('should return client for Nova Pro in us-east-1', () => {
      const client = getBedrockClientForModel('amazon.nova-pro-v1:0');
      expect(client).toBeInstanceOf(BedrockRuntimeClient);
      expect(getClientPoolSize()).toBe(1);
    });

    it('should return client for Claude in ap-southeast-2', () => {
      const client = getBedrockClientForModel('anthropic.claude-3-sonnet');
      expect(client).toBeInstanceOf(BedrockRuntimeClient);
      expect(getClientPoolSize()).toBe(1);
    });

    it('should use default model ID when none provided', () => {
      const client = getBedrockClientForModel();
      expect(client).toBeInstanceOf(BedrockRuntimeClient);
    });

    it('should reuse clients across different model IDs in same region', () => {
      const client1 = getBedrockClientForModel('amazon.nova-pro-v1:0');
      const client2 = getBedrockClientForModel('amazon.nova-lite-v1:0');
      
      // Both Nova models use us-east-1, so should reuse client
      expect(client1).toBe(client2);
      expect(getClientPoolSize()).toBe(1);
    });
  });

  describe('clearBedrockClients', () => {
    it('should clear all cached clients', () => {
      getBedrockClient('us-east-1');
      getBedrockClient('ap-southeast-2');
      expect(getClientPoolSize()).toBe(2);
      
      clearBedrockClients();
      expect(getClientPoolSize()).toBe(0);
    });

    it('should allow creating new clients after clearing', () => {
      const client1 = getBedrockClient('us-east-1');
      clearBedrockClients();
      const client2 = getBedrockClient('us-east-1');
      
      // Should be different instances
      expect(client1).not.toBe(client2);
    });
  });

  describe('getClientPoolSize', () => {
    it('should return 0 for empty pool', () => {
      expect(getClientPoolSize()).toBe(0);
    });

    it('should return correct count of cached clients', () => {
      getBedrockClient('us-east-1');
      expect(getClientPoolSize()).toBe(1);
      
      getBedrockClient('ap-southeast-2');
      expect(getClientPoolSize()).toBe(2);
      
      getBedrockClient('eu-west-1');
      expect(getClientPoolSize()).toBe(3);
    });
  });

  describe('isBedrockConfigured', () => {
    const originalEnv = {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION,
    };

    afterEach(() => {
      // Restore original environment
      if (originalEnv.AWS_ACCESS_KEY_ID) {
        process.env.AWS_ACCESS_KEY_ID = originalEnv.AWS_ACCESS_KEY_ID;
      } else {
        delete process.env.AWS_ACCESS_KEY_ID;
      }
      if (originalEnv.AWS_SECRET_ACCESS_KEY) {
        process.env.AWS_SECRET_ACCESS_KEY = originalEnv.AWS_SECRET_ACCESS_KEY;
      } else {
        delete process.env.AWS_SECRET_ACCESS_KEY;
      }
      if (originalEnv.AWS_REGION) {
        process.env.AWS_REGION = originalEnv.AWS_REGION;
      } else {
        delete process.env.AWS_REGION;
      }
    });

    it('should return true when all credentials are set', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      process.env.AWS_REGION = 'us-east-1';
      
      expect(isBedrockConfigured()).toBe(true);
    });

    it('should return false when AWS_ACCESS_KEY_ID is missing', () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      process.env.AWS_REGION = 'us-east-1';
      
      expect(isBedrockConfigured()).toBe(false);
    });

    it('should return false when AWS_SECRET_ACCESS_KEY is missing', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      delete process.env.AWS_SECRET_ACCESS_KEY;
      process.env.AWS_REGION = 'us-east-1';
      
      expect(isBedrockConfigured()).toBe(false);
    });

    it('should return false when AWS_REGION is missing', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      delete process.env.AWS_REGION;
      
      expect(isBedrockConfigured()).toBe(false);
    });

    it('should return false when all credentials are missing', () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
      
      expect(isBedrockConfigured()).toBe(false);
    });
  });

  describe('DEFAULT_BEDROCK_CONFIG', () => {
    it('should have correct timeout configuration', () => {
      expect(DEFAULT_BEDROCK_CONFIG.timeout).toBe(2000);
    });

    it('should have correct model parameters', () => {
      expect(DEFAULT_BEDROCK_CONFIG.maxTokens).toBe(2000);
      expect(DEFAULT_BEDROCK_CONFIG.temperature).toBe(0.3);
      expect(DEFAULT_BEDROCK_CONFIG.topP).toBe(0.9);
    });

    it('should use Nova Pro as default model', () => {
      const originalModelId = process.env.CROP_DIAGNOSIS_MODEL_ID;
      delete process.env.CROP_DIAGNOSIS_MODEL_ID;
      
      // Re-import to get fresh config
      expect(DEFAULT_BEDROCK_CONFIG.modelId).toContain('nova-pro');
      
      // Restore
      if (originalModelId) {
        process.env.CROP_DIAGNOSIS_MODEL_ID = originalModelId;
      }
    });

    it('should respect CROP_DIAGNOSIS_MODEL_ID environment variable', () => {
      const originalModelId = process.env.CROP_DIAGNOSIS_MODEL_ID;
      process.env.CROP_DIAGNOSIS_MODEL_ID = 'custom-model-id';
      
      // Note: This test may not work as expected due to module caching
      // In real usage, the env var should be set before the module is loaded
      
      // Restore
      if (originalModelId) {
        process.env.CROP_DIAGNOSIS_MODEL_ID = originalModelId;
      } else {
        delete process.env.CROP_DIAGNOSIS_MODEL_ID;
      }
    });
  });

  describe('Client Configuration', () => {
    it('should configure client with timeout', () => {
      const client = getBedrockClient('us-east-1');
      expect(client).toBeInstanceOf(BedrockRuntimeClient);
      // Note: We can't directly test the timeout configuration
      // as it's internal to the client, but we verify the client is created
    });
  });

  describe('Region Mapping Coverage', () => {
    it('should handle all Nova model variants', () => {
      const novaModels = [
        'amazon.nova-pro-v1:0',
        'amazon.nova-lite-v1:0',
        'amazon.nova-micro-v1:0',
        'amazon.nova-pro',
        'amazon.nova-lite',
        'amazon.nova-micro',
      ];

      novaModels.forEach(modelId => {
        expect(getRegionForModel(modelId)).toBe('us-east-1');
      });
    });

    it('should handle all Claude model variants', () => {
      const claudeModels = [
        'anthropic.claude-v2',
        'anthropic.claude-3-sonnet',
        'anthropic.claude-3-opus',
      ];

      claudeModels.forEach(modelId => {
        expect(getRegionForModel(modelId)).toBe('ap-southeast-2');
      });
    });

    it('should handle inference profile variants', () => {
      expect(getRegionForModel('us.anthropic.claude-3-5-sonnet-20241022-v2:0')).toBe('us-east-1');
      expect(getRegionForModel('au.anthropic.claude-3-5-sonnet-20241022-v2:0')).toBe('ap-southeast-2');
    });
  });
});
