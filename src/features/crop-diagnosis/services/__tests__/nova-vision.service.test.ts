/**
 * Unit tests for Nova Vision Service
 * 
 * Tests the integration with Amazon Bedrock Nova Pro for crop disease diagnosis.
 */

import { NovaVisionService, ImageAnalysisRequest, ImageAnalysisResult } from '../nova-vision.service';
import { getBedrockClientForModel } from '../bedrock.service';
import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockInvalidResponseError, BedrockUnknownError } from '../../errors/bedrock.errors';

// Mock the Bedrock service
jest.mock('../bedrock.service');

describe('NovaVisionService', () => {
  let service: NovaVisionService;
  let mockBedrockClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create service instance
    service = new NovaVisionService();

    // Mock Bedrock client
    mockBedrockClient = {
      send: jest.fn(),
    };

    (getBedrockClientForModel as jest.Mock).mockReturnValue(mockBedrockClient);
  });

  describe('analyzeImage', () => {
    const validRequest: ImageAnalysisRequest = {
      imageBuffer: Buffer.from('fake-image-data'),
      imageFormat: 'jpeg',
    };

    const mockNovaResponse = {
      output: {
        message: {
          content: [
            {
              text: JSON.stringify({
                cropType: 'tomato',
                diseases: [
                  {
                    name: 'Late Blight',
                    scientificName: 'Phytophthora infestans',
                    type: 'fungal',
                    severity: 'high',
                    confidence: 85,
                    affectedParts: ['leaves', 'stem'],
                  },
                ],
                symptoms: ['Dark spots on leaves', 'Wilting', 'White mold on underside'],
                overallConfidence: 85,
                imageQuality: 'good',
              }),
            },
          ],
        },
      },
    };

    it('should successfully analyze a valid crop image', async () => {
      mockBedrockClient.send.mockResolvedValue(mockNovaResponse);

      const result = await service.analyzeImage(validRequest);

      expect(result).toBeDefined();
      expect(result.cropType).toBe('tomato');
      expect(result.diseases).toHaveLength(1);
      expect(result.diseases[0].name).toBe('Late Blight');
      expect(result.diseases[0].type).toBe('fungal');
      expect(result.diseases[0].severity).toBe('high');
      expect(result.diseases[0].confidence).toBe(85);
      expect(result.symptoms).toHaveLength(3);
      // Confidence is adjusted by scoring algorithm: 85 * 0.95 (good quality) * 1.0 (single disease) = 81
      expect(result.confidence).toBe(81);
      expect(result.imageQualityScore).toBe(0.85);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should call Bedrock with correct parameters', async () => {
      mockBedrockClient.send.mockResolvedValue(mockNovaResponse);

      await service.analyzeImage(validRequest);

      expect(mockBedrockClient.send).toHaveBeenCalledTimes(1);
      const command = mockBedrockClient.send.mock.calls[0][0];
      expect(command).toBeInstanceOf(ConverseCommand);
      expect(command.input.modelId).toBe('amazon.nova-pro-v1:0');
      expect(command.input.messages).toHaveLength(1);
      expect(command.input.messages[0].role).toBe('user');
      expect(command.input.messages[0].content).toHaveLength(2);
      expect(command.input.inferenceConfig?.maxTokens).toBe(2000);
      expect(command.input.inferenceConfig?.temperature).toBe(0.3);
      expect(command.input.inferenceConfig?.topP).toBe(0.9);
    });

    it('should include crop hint in prompt when provided', async () => {
      mockBedrockClient.send.mockResolvedValue(mockNovaResponse);

      const requestWithHint: ImageAnalysisRequest = {
        ...validRequest,
        cropHint: 'rice',
      };

      await service.analyzeImage(requestWithHint);

      const command = mockBedrockClient.send.mock.calls[0][0];
      expect(command.input.messages[0].content).toHaveLength(3);
      expect(command.input.messages[0].content[2].text).toContain('rice');
    });

    it('should handle multiple diseases in response', async () => {
      const multiDiseaseResponse = {
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  cropType: 'wheat',
                  diseases: [
                    {
                      name: 'Rust',
                      scientificName: 'Puccinia triticina',
                      type: 'fungal',
                      severity: 'high',
                      confidence: 90,
                      affectedParts: ['leaves'],
                    },
                    {
                      name: 'Aphids',
                      scientificName: 'Rhopalosiphum padi',
                      type: 'pest',
                      severity: 'medium',
                      confidence: 75,
                      affectedParts: ['leaves', 'stem'],
                    },
                  ],
                  symptoms: ['Orange pustules', 'Yellowing', 'Insect clusters'],
                  overallConfidence: 82,
                  imageQuality: 'excellent',
                }),
              },
            ],
          },
        },
      };

      mockBedrockClient.send.mockResolvedValue(multiDiseaseResponse);

      const result = await service.analyzeImage(validRequest);

      expect(result.diseases).toHaveLength(2);
      expect(result.diseases[0].name).toBe('Rust');
      expect(result.diseases[1].name).toBe('Aphids');
      expect(result.imageQualityScore).toBe(1.0);
    });

    it('should handle healthy crop with no diseases', async () => {
      const healthyResponse = {
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  cropType: 'cotton',
                  diseases: [],
                  symptoms: [],
                  overallConfidence: 95,
                  imageQuality: 'excellent',
                }),
              },
            ],
          },
        },
      };

      mockBedrockClient.send.mockResolvedValue(healthyResponse);

      const result = await service.analyzeImage(validRequest);

      expect(result.cropType).toBe('cotton');
      expect(result.diseases).toHaveLength(0);
      expect(result.symptoms).toHaveLength(0);
      expect(result.confidence).toBe(95);
    });

    it('should handle poor image quality', async () => {
      const poorQualityResponse = {
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  cropType: 'unknown',
                  diseases: [],
                  symptoms: [],
                  overallConfidence: 30,
                  imageQuality: 'poor',
                }),
              },
            ],
          },
        },
      };

      mockBedrockClient.send.mockResolvedValue(poorQualityResponse);

      const result = await service.analyzeImage(validRequest);

      expect(result.cropType).toBe('unknown');
      expect(result.imageQualityScore).toBe(0.50);
      // Confidence is adjusted by scoring algorithm: 30 * 0.70 (poor quality) * 1.0 (no diseases) = 21
      expect(result.confidence).toBe(21);
    });

    it('should clamp confidence scores to 0-100 range', async () => {
      const invalidConfidenceResponse = {
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  cropType: 'rice',
                  diseases: [
                    {
                      name: 'Blast',
                      scientificName: 'Magnaporthe oryzae',
                      type: 'fungal',
                      severity: 'high',
                      confidence: 150, // Invalid: > 100
                      affectedParts: ['leaves'],
                    },
                  ],
                  symptoms: ['Lesions'],
                  overallConfidence: -10, // Invalid: < 0
                  imageQuality: 'good',
                }),
              },
            ],
          },
        },
      };

      mockBedrockClient.send.mockResolvedValue(invalidConfidenceResponse);

      const result = await service.analyzeImage(validRequest);

      expect(result.confidence).toBe(0); // Clamped from -10
      expect(result.diseases[0].confidence).toBe(100); // Clamped from 150
    });

    it('should handle JSON response with extra text', async () => {
      const responseWithExtraText = {
        output: {
          message: {
            content: [
              {
                text: `Here is the analysis:
                
                ${JSON.stringify({
                  cropType: 'maize',
                  diseases: [],
                  symptoms: [],
                  overallConfidence: 80,
                  imageQuality: 'good',
                })}
                
                Hope this helps!`,
              },
            ],
          },
        },
      };

      mockBedrockClient.send.mockResolvedValue(responseWithExtraText);

      const result = await service.analyzeImage(validRequest);

      expect(result.cropType).toBe('maize');
      // Confidence is adjusted by scoring algorithm: 80 * 0.95 (good quality) * 1.0 (no diseases) = 76
      expect(result.confidence).toBe(76);
    });

    it('should throw error when Nova Pro returns no content', async () => {
      mockBedrockClient.send.mockResolvedValue({
        output: {
          message: {
            content: [],
          },
        },
      });

      await expect(service.analyzeImage(validRequest)).rejects.toThrow(
        'No response content from Nova Pro'
      );
    });

    it('should throw error when Nova Pro returns no text content', async () => {
      mockBedrockClient.send.mockResolvedValue({
        output: {
          message: {
            content: [
              {
                image: { format: 'jpeg', source: { bytes: Buffer.from('data') } },
              },
            ],
          },
        },
      });

      await expect(service.analyzeImage(validRequest)).rejects.toThrow(
        'No text content in Nova Pro response'
      );
    });

    it('should throw error when response is not valid JSON', async () => {
      mockBedrockClient.send.mockResolvedValue({
        output: {
          message: {
            content: [
              {
                text: 'This is not JSON',
              },
            ],
          },
        },
      });

      await expect(service.analyzeImage(validRequest)).rejects.toThrow(
        BedrockInvalidResponseError
      );
    });

    it('should throw error when required fields are missing', async () => {
      const incompleteResponse = {
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  cropType: 'wheat',
                  // Missing diseases, symptoms, overallConfidence, imageQuality
                }),
              },
            ],
          },
        },
      };

      mockBedrockClient.send.mockResolvedValue(incompleteResponse);

      await expect(service.analyzeImage(validRequest)).rejects.toThrow(
        BedrockInvalidResponseError
      );
    });

    it('should throw error when Bedrock API call fails', async () => {
      mockBedrockClient.send.mockRejectedValue(new Error('Bedrock API error'));

      await expect(service.analyzeImage(validRequest)).rejects.toThrow(
        BedrockUnknownError
      );
    });

    it('should throw Bedrock error when API call fails', async () => {
      mockBedrockClient.send.mockRejectedValue(new Error('Timeout'));

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockUnknownError);
        expect((error as BedrockUnknownError).code).toBe('BEDROCK_UNKNOWN_ERROR');
      }
    });

    it('should handle all image formats', async () => {
      mockBedrockClient.send.mockResolvedValue(mockNovaResponse);

      const formats: Array<'jpeg' | 'png' | 'webp'> = ['jpeg', 'png', 'webp'];

      for (const format of formats) {
        const request: ImageAnalysisRequest = {
          imageBuffer: Buffer.from('fake-image-data'),
          imageFormat: format,
        };

        await service.analyzeImage(request);

        const command = mockBedrockClient.send.mock.calls[mockBedrockClient.send.mock.calls.length - 1][0];
        expect(command.input.messages[0].content[0].image.format).toBe(format);
      }
    });

    it('should handle all disease types', async () => {
      const diseaseTypes = ['fungal', 'bacterial', 'viral', 'pest', 'nutrient_deficiency'] as const;

      for (const type of diseaseTypes) {
        const response = {
          output: {
            message: {
              content: [
                {
                  text: JSON.stringify({
                    cropType: 'test',
                    diseases: [
                      {
                        name: 'Test Disease',
                        scientificName: 'Test',
                        type,
                        severity: 'medium',
                        confidence: 80,
                        affectedParts: ['leaves'],
                      },
                    ],
                    symptoms: ['test'],
                    overallConfidence: 80,
                    imageQuality: 'good',
                  }),
                },
              ],
            },
          },
        };

        mockBedrockClient.send.mockResolvedValue(response);

        const result = await service.analyzeImage(validRequest);

        expect(result.diseases[0].type).toBe(type);
      }
    });

    it('should handle all severity levels', async () => {
      const severityLevels = ['low', 'medium', 'high'] as const;

      for (const severity of severityLevels) {
        const response = {
          output: {
            message: {
              content: [
                {
                  text: JSON.stringify({
                    cropType: 'test',
                    diseases: [
                      {
                        name: 'Test Disease',
                        scientificName: 'Test',
                        type: 'fungal',
                        severity,
                        confidence: 80,
                        affectedParts: ['leaves'],
                      },
                    ],
                    symptoms: ['test'],
                    overallConfidence: 80,
                    imageQuality: 'good',
                  }),
                },
              ],
            },
          },
        };

        mockBedrockClient.send.mockResolvedValue(response);

        const result = await service.analyzeImage(validRequest);

        expect(result.diseases[0].severity).toBe(severity);
      }
    });

    it('should handle all image quality levels', async () => {
      const qualityLevels = [
        { quality: 'excellent', expectedScore: 1.0 },
        { quality: 'good', expectedScore: 0.85 },
        { quality: 'fair', expectedScore: 0.70 },
        { quality: 'poor', expectedScore: 0.50 },
      ] as const;

      for (const { quality, expectedScore } of qualityLevels) {
        const response = {
          output: {
            message: {
              content: [
                {
                  text: JSON.stringify({
                    cropType: 'test',
                    diseases: [],
                    symptoms: [],
                    overallConfidence: 80,
                    imageQuality: quality,
                  }),
                },
              ],
            },
          },
        };

        mockBedrockClient.send.mockResolvedValue(response);

        const result = await service.analyzeImage(validRequest);

        expect(result.imageQualityScore).toBe(expectedScore);
      }
    });

    it('should measure processing time accurately', async () => {
      mockBedrockClient.send.mockImplementation(async () => {
        // Simulate 100ms processing time
        await new Promise((resolve) => setTimeout(resolve, 100));
        return mockNovaResponse;
      });

      const result = await service.analyzeImage(validRequest);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(100);
      expect(result.processingTimeMs).toBeLessThan(200); // Allow some margin
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        modelId: 'amazon.nova-lite-v1:0',
        timeout: 3000,
        maxTokens: 1500,
        temperature: 0.5,
        topP: 0.8,
      };

      const customService = new NovaVisionService(customConfig);

      expect(customService).toBeDefined();
    });
  });
});

