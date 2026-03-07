import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { translationService } from './translation.service';

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-premier-v1:0';

// Region-specific Bedrock clients
const bedrockClients: Map<string, BedrockRuntimeClient> = new Map();

/**
 * Get or create a Bedrock client for a specific region
 * @param region - AWS region
 * @returns BedrockRuntimeClient for the specified region
 */
function getBedrockClient(region: string): BedrockRuntimeClient {
  if (!bedrockClients.has(region)) {
    bedrockClients.set(region, new BedrockRuntimeClient({ region }));
  }
  return bedrockClients.get(region)!;
}

/**
 * Determine the appropriate region for a model
 * @param modelId - Bedrock model ID
 * @returns AWS region for the model
 */
function getRegionForModel(modelId: string): string {
  // Claude inference profiles (AU) require ap-southeast-2
  if (modelId.startsWith('au.anthropic.')) {
    return 'ap-southeast-2';
  }
  
  // US inference profiles require us-east-1
  if (modelId.startsWith('us.anthropic.')) {
    return 'us-east-1';
  }
  
  // Amazon Nova models work best in us-east-1
  if (modelId.includes('amazon.nova')) {
    return 'us-east-1';
  }
  
  // Claude base models can use ap-southeast-2 (Sydney)
  if (modelId.includes('anthropic.claude')) {
    return 'ap-southeast-2';
  }
  
  // Default to environment variable or us-east-1
  return process.env.BEDROCK_REGION || 'us-east-1';
}

export interface BedrockRequest {
  userId: string;
  sessionId: string;
  query: string;
  language: string;
  conversationHistory?: ConversationMessage[];
  modelId?: string; // Optional model ID override
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface BedrockResponse {
  text: string;
  conversationHistory: ConversationMessage[];
}

/**
 * Bedrock service for generic AI assistant using Claude
 * Provides open-ended conversational AI for farming assistance
 */
export class BedrockService {
  private conversationCache: Map<string, ConversationMessage[]>;
  private readonly MAX_HISTORY_LENGTH = 10; // Keep last 10 messages for context

  constructor() {
    this.conversationCache = new Map();
  }

  /**
   * Process a query through AWS Bedrock (Claude)
   * @param request - User request with query and context
   * @returns AI response with updated conversation history
   */
  async processQuery(request: BedrockRequest): Promise<BedrockResponse> {
    const { userId, sessionId, query, language, conversationHistory, modelId } = request;

    // Use provided modelId or fall back to environment variable
    const effectiveModelId = modelId || MODEL_ID;
    console.log(`[Bedrock] Using model: ${effectiveModelId}`);

    // Get or initialize conversation history
    const history = conversationHistory || this.getConversationHistory(sessionId);

    // Translate query to English if needed
    let englishQuery = query;
    if (language !== 'en') {
      try {
        console.log(`[Bedrock] Translating query from ${language} to English:`, query);
        const translation = await translationService.translateText({
          text: query,
          sourceLanguage: language,
          targetLanguage: 'en',
        });
        englishQuery = translation.translatedText;
        console.log('[Bedrock] Translated query:', englishQuery);
      } catch (error) {
        console.error('[Bedrock] Translation failed:', error);
        // Continue with original query
      }
    }

    // Build conversation context for Claude
    const messages = this.buildMessages(history, englishQuery);

    // Call Bedrock API with the effective model ID
    const response = await this.invokeClaude(messages, effectiveModelId);

    // Translate response back to user's language if needed
    let finalResponse = response;
    if (language !== 'en') {
      try {
        console.log(`[Bedrock] Translating response from English to ${language}:`, response);
        const translation = await translationService.translateText({
          text: response,
          sourceLanguage: 'en',
          targetLanguage: language,
        });
        finalResponse = translation.translatedText;
        console.log('[Bedrock] Translated response:', finalResponse);
      } catch (error) {
        console.error('[Bedrock] Response translation failed:', error);
        // Continue with English response
      }
    }

    // Update conversation history
    const updatedHistory = this.updateHistory(history, query, finalResponse);
    this.saveConversationHistory(sessionId, updatedHistory);

    return {
      text: finalResponse,
      conversationHistory: updatedHistory,
    };
  }

  /**
   * Invoke Claude model via Bedrock
   * @param messages - Conversation messages
   * @param modelId - Model ID to use
   * @returns Claude's response text
   */
  private async invokeClaude(messages: Array<{ role: string; content: string }>, modelId: string): Promise<string> {
    const systemPrompt = this.getSystemPrompt();

    // Determine the appropriate region for this model
    const region = getRegionForModel(modelId);
    const bedrockClient = getBedrockClient(region);
    
    console.log(`[Bedrock] Using model: ${modelId} in region: ${region}`);

    // Check model type based on modelId
    const isClaudeModel = modelId.includes('anthropic.claude');
    const isTitanModel = modelId.includes('amazon.titan');
    const isNovaModel = modelId.includes('amazon.nova');

    let payload: any;
    
    if (isClaudeModel) {
      // Claude format
      payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: messages,
      };
    } else if (isTitanModel) {
      // Amazon Titan format
      // Combine system prompt and conversation into a single text prompt
      let fullPrompt = systemPrompt + '\n\n';
      for (const msg of messages) {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
      }
      fullPrompt += 'Assistant:';
      
      payload = {
        inputText: fullPrompt,
        textGenerationConfig: {
          maxTokenCount: 1000,
          temperature: 0.7,
          topP: 0.9,
          stopSequences: []
        }
      };
    } else if (isNovaModel) {
      // Amazon Nova format (Converse API)
      // Add system message at the beginning
      const novaMessages = [
        { role: 'user', content: [{ text: systemPrompt }] },
        { role: 'assistant', content: [{ text: 'I understand. I am Kisan Mitra, ready to help farmers.' }] },
        ...messages.map(msg => ({
          role: msg.role,
          content: [{ text: msg.content }]
        }))
      ];
      
      payload = {
        messages: novaMessages,
        inferenceConfig: {
          maxTokens: 1000,
          temperature: 0.7,
          topP: 0.9
        }
      };
    } else {
      // Default to Claude format for other models
      payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: messages,
      };
    }

    const command: InvokeModelCommandInput = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    };

    try {
      const response = await bedrockClient.send(new InvokeModelCommand(command));
      
      if (!response.body) {
        throw new Error('Empty response from Bedrock');
      }

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      let text: string;
      
      if (isClaudeModel) {
        // Claude response format
        if (!responseBody.content || responseBody.content.length === 0) {
          throw new Error('No content in Bedrock response');
        }
        text = responseBody.content[0].text;
      } else if (isTitanModel) {
        // Amazon Titan response format
        if (!responseBody.results || responseBody.results.length === 0) {
          throw new Error('No results in Titan response');
        }
        text = responseBody.results[0].outputText;
      } else if (isNovaModel) {
        // Amazon Nova response format
        if (!responseBody.output || !responseBody.output.message || !responseBody.output.message.content) {
          throw new Error('No content in Nova response');
        }
        // Nova returns content as an array of content blocks
        const contentBlocks = responseBody.output.message.content;
        if (contentBlocks.length === 0 || !contentBlocks[0].text) {
          throw new Error('No text in Nova response');
        }
        text = contentBlocks[0].text;
      } else {
        // Try Claude format as default
        if (responseBody.content && responseBody.content.length > 0) {
          text = responseBody.content[0].text;
        } else if (responseBody.results && responseBody.results.length > 0) {
          text = responseBody.results[0].outputText;
        } else if (responseBody.output && responseBody.output.message) {
          // Try Nova format
          text = responseBody.output.message.content[0].text;
        } else {
          throw new Error('Unknown response format from Bedrock');
        }
      }
      
      console.log('[Bedrock] Model response:', text);
      
      return text;
    } catch (error: any) {
      console.error('[Bedrock] API call failed:', error);
      
      // Handle specific errors
      if (error.name === 'AccessDeniedException') {
        throw new Error('Bedrock access denied. Please check IAM permissions or model subscription.');
      }
      
      if (error.name === 'ResourceNotFoundException') {
        throw new Error(`Model ${modelId} not found. Please check model ID.`);
      }
      
      if (error.name === 'ThrottlingException') {
        throw new Error('Too many requests. Please try again in a moment.');
      }
      
      throw new Error(`Failed to get response from AI assistant: ${error.message}`);
    }
  }

  /**
   * Get system prompt for Claude
   * Defines the AI assistant's role and behavior
   */
  private getSystemPrompt(): string {
    return `You are Kisan Mitra (Farmer's Friend), an AI assistant helping Indian farmers with agricultural advice, crop information, market prices, weather guidance, and farming best practices.

IMPORTANT: Always respond in English only. Do not respond in Hindi, Marathi, or any other language. Your responses will be translated to the user's preferred language automatically.

Your role:
- Provide practical, actionable farming advice
- Help with crop selection, planting, and harvesting guidance
- Offer pest and disease management tips
- Share information about market prices and trends
- Provide weather-related farming advice
- Answer questions about government schemes and subsidies for farmers
- Be supportive, friendly, and respectful of farmers' knowledge and experience

Guidelines:
- Keep responses concise and practical (2-3 paragraphs maximum)
- Use simple language that farmers can easily understand
- Provide specific, actionable advice when possible
- If you don't know something, be honest and suggest where they might find the information
- Be culturally sensitive to Indian farming practices and traditions
- Focus on sustainable and organic farming practices when relevant
- Consider regional variations in Indian agriculture

Important:
- You are an AI assistant, not a replacement for professional agricultural extension services
- For serious pest/disease issues or legal matters, recommend consulting local agricultural officers
- Always prioritize farmer safety when discussing pesticides or machinery
- ALWAYS RESPOND IN ENGLISH ONLY - translations will be handled separately`;
  }

  /**
   * Build messages array for Claude API
   * @param history - Previous conversation messages
   * @param currentQuery - Current user query
   * @returns Messages array in Claude format
   */
  private buildMessages(
    history: ConversationMessage[],
    currentQuery: string
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // Add conversation history (last N messages for context)
    const recentHistory = history.slice(-this.MAX_HISTORY_LENGTH);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current query
    messages.push({
      role: 'user',
      content: currentQuery,
    });

    return messages;
  }

  /**
   * Update conversation history with new messages
   * @param history - Current history
   * @param userQuery - User's query
   * @param assistantResponse - Assistant's response
   * @returns Updated history
   */
  private updateHistory(
    history: ConversationMessage[],
    userQuery: string,
    assistantResponse: string
  ): ConversationMessage[] {
    const updated = [...history];

    // Add user message
    updated.push({
      role: 'user',
      content: userQuery,
      timestamp: new Date(),
    });

    // Add assistant message
    updated.push({
      role: 'assistant',
      content: assistantResponse,
      timestamp: new Date(),
    });

    // Keep only recent messages to avoid token limits
    return updated.slice(-this.MAX_HISTORY_LENGTH * 2); // *2 because each turn has 2 messages
  }

  /**
   * Get conversation history from cache
   * @param sessionId - Session identifier
   * @returns Conversation history
   */
  private getConversationHistory(sessionId: string): ConversationMessage[] {
    return this.conversationCache.get(sessionId) || [];
  }

  /**
   * Save conversation history to cache
   * @param sessionId - Session identifier
   * @param history - Conversation history
   */
  private saveConversationHistory(sessionId: string, history: ConversationMessage[]): void {
    this.conversationCache.set(sessionId, history);
  }

  /**
   * Clear conversation history for a session
   * @param sessionId - Session identifier
   */
  clearSession(sessionId: string): void {
    this.conversationCache.delete(sessionId);
  }

  /**
   * Check if Bedrock is configured
   * @returns True if Bedrock is properly configured
   */
  static isConfigured(): boolean {
    // Bedrock is configured if we have a region and model ID
    // AWS credentials can come from IAM role (EC2) or environment variables
    return !!(
      process.env.AWS_REGION &&
      process.env.BEDROCK_MODEL_ID
    );
  }
}

export const bedrockService = new BedrockService();
