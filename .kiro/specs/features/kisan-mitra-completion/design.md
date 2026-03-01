# Design: Complete Kisan Mitra AI Assistant

**Feature:** Kisan Mitra Completion  
**Status:** In Progress  
**Related:** [Requirements](./requirements.md)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Kisan Mitra Service                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Session    │    │  Fulfillment │    │  Conversation│  │
│  │  Management  │    │   Handlers   │    │   Logging    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              AWS Lex Integration                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Marketplace │    │   Weather    │    │   Farming    │
│   Database   │    │     API      │    │  Tips KB     │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Component Design

### 1. Fulfillment Handlers

#### 1.1 Crop Price Handler

**Purpose:** Query marketplace for crop prices

**Interface:**
```typescript
interface CropPriceHandler {
  handle(crop: string, location?: string): Promise<CropPriceResponse>;
}

interface CropPriceResponse {
  crop: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  lastUpdated: Date;
  sampleSize: number;
}
```

**Implementation:**
```typescript
class CropPriceHandler {
  async handle(crop: string, location?: string): Promise<CropPriceResponse> {
    // 1. Normalize crop name
    const normalizedCrop = this.normalizeCropName(crop);
    
    // 2. Query marketplace database
    const listings = await this.getActiveListings(normalizedCrop, location);
    
    // 3. Calculate statistics
    const prices = listings.map(l => l.pricePerUnit);
    const avgPrice = this.average(prices);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // 4. Calculate trend (compare with last week)
    const trend = await this.calculateTrend(normalizedCrop, avgPrice);
    
    return {
      crop: normalizedCrop,
      averagePrice: avgPrice,
      minPrice,
      maxPrice,
      trend,
      unit: 'kg',
      lastUpdated: new Date(),
      sampleSize: listings.length,
    };
  }
}
```

#### 1.2 Weather Handler

**Purpose:** Get weather data and farming advice

**Interface:**
```typescript
interface WeatherHandler {
  handle(location: string): Promise<WeatherResponse>;
}

interface WeatherResponse {
  location: string;
  current: {
    temperature: number;
    humidity: number;
    rainfall: number;
    condition: string;
  };
  forecast: Array<{
    date: Date;
    temperature: { min: number; max: number };
    rainfall: number;
    condition: string;
  }>;
  farmingAdvice: string;
}
```

**Implementation:**
```typescript
class WeatherHandler {
  private weatherApi: WeatherAPI;
  
  async handle(location: string): Promise<WeatherResponse> {
    // 1. Get coordinates from location
    const coords = await this.geocode(location);
    
    // 2. Fetch weather data
    const weather = await this.weatherApi.getWeather(coords);
    
    // 3. Generate farming advice based on weather
    const advice = this.generateFarmingAdvice(weather);
    
    return {
      location,
      current: weather.current,
      forecast: weather.forecast.slice(0, 3), // 3-day forecast
      farmingAdvice: advice,
    };
  }
  
  private generateFarmingAdvice(weather: any): string {
    // Rule-based advice generation
    if (weather.current.rainfall > 50) {
      return "Heavy rain expected. Avoid spraying pesticides. Ensure proper drainage.";
    }
    if (weather.current.temperature > 35) {
      return "High temperature. Increase irrigation. Provide shade for sensitive crops.";
    }
    // ... more rules
    return "Weather is favorable for farming activities.";
  }
}
```

#### 1.3 Farming Advice Handler

**Purpose:** Provide farming tips from knowledge base

**Interface:**
```typescript
interface FarmingAdviceHandler {
  handle(crop: string, topic: string): Promise<FarmingAdviceResponse>;
}

interface FarmingAdviceResponse {
  crop: string;
  topic: string;
  advice: string;
  tips: string[];
  references: string[];
}
```

**Knowledge Base Schema (MongoDB):**
```typescript
interface FarmingTip {
  _id: ObjectId;
  crop: string;
  topic: string; // 'planting', 'irrigation', 'pest-control', 'harvesting'
  advice: string;
  tips: string[];
  season?: string;
  region?: string;
  language: string;
  references: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Implementation:**
```typescript
class FarmingAdviceHandler {
  async handle(crop: string, topic: string): Promise<FarmingAdviceResponse> {
    // 1. Query knowledge base
    const tips = await this.db.collection('farming_tips').find({
      crop: { $regex: crop, $options: 'i' },
      topic: { $regex: topic, $options: 'i' },
    }).toArray();
    
    // 2. Aggregate advice
    const advice = tips.map(t => t.advice).join(' ');
    const allTips = tips.flatMap(t => t.tips);
    const references = tips.flatMap(t => t.references);
    
    return {
      crop,
      topic,
      advice,
      tips: allTips,
      references,
    };
  }
}
```

### 2. Session Management

**Purpose:** Maintain conversation context across queries

**Interface:**
```typescript
interface SessionManager {
  getSession(sessionId: string): Promise<Session | null>;
  updateSession(sessionId: string, attributes: Record<string, any>): Promise<void>;
  clearSession(sessionId: string): Promise<void>;
}

interface Session {
  sessionId: string;
  userId: string;
  attributes: Record<string, any>;
  lastActivity: Date;
  createdAt: Date;
}
```

**Storage Options:**
1. **In-Memory (Development):** Simple Map
2. **Redis (Production):** Fast, distributed
3. **MongoDB (Fallback):** Persistent

**Implementation (Redis):**
```typescript
class RedisSessionManager implements SessionManager {
  private redis: RedisClient;
  private TTL = 300; // 5 minutes
  
  async getSession(sessionId: string): Promise<Session | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
  
  async updateSession(sessionId: string, attributes: Record<string, any>): Promise<void> {
    const session = await this.getSession(sessionId) || {
      sessionId,
      userId: attributes.userId,
      attributes: {},
      createdAt: new Date(),
    };
    
    session.attributes = { ...session.attributes, ...attributes };
    session.lastActivity = new Date();
    
    await this.redis.setex(
      `session:${sessionId}`,
      this.TTL,
      JSON.stringify(session)
    );
  }
  
  async clearSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }
}
```

### 3. Context Extraction

**Purpose:** Extract context from conversation for follow-up questions

**Implementation:**
```typescript
class ContextExtractor {
  extractContext(history: VoiceQuery[]): ConversationContext {
    const lastQuery = history[0];
    
    return {
      lastIntent: lastQuery.intent,
      lastSlots: lastQuery.slots,
      lastCrop: this.extractCrop(lastQuery),
      lastLocation: this.extractLocation(lastQuery),
      topic: this.extractTopic(history),
    };
  }
  
  private extractCrop(query: VoiceQuery): string | undefined {
    // Extract crop from slots or query text
    if (query.slots?.crop) return query.slots.crop;
    
    // Use NLP to extract crop from text
    const crops = ['tomato', 'potato', 'wheat', 'rice', /* ... */];
    for (const crop of crops) {
      if (query.query.toLowerCase().includes(crop)) {
        return crop;
      }
    }
    
    return undefined;
  }
}
```

### 4. Conversation History API

**Endpoints:**

```typescript
// Get conversation history
GET /api/kisan-mitra/history/:userId?limit=10&offset=0

Response:
{
  userId: string;
  conversations: Array<{
    sessionId: string;
    query: string;
    response: string;
    intent: string;
    confidence: number;
    language: string;
    timestamp: Date;
  }>;
  total: number;
  hasMore: boolean;
}

// Delete conversation history
DELETE /api/kisan-mitra/history/:userId

Response:
{
  success: boolean;
  deletedCount: number;
}

// Get conversation statistics
GET /api/kisan-mitra/stats

Response:
{
  totalQueries: number;
  uniqueUsers: number;
  topIntents: Array<{ intent: string; count: number }>;
  averageConfidence: number;
  languageDistribution: Record<string, number>;
}
```

### 5. Privacy Controls

**Data Retention Policy:**
```typescript
class PrivacyManager {
  // Delete conversations older than 30 days
  async cleanupOldConversations(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await this.db.collection('voice_queries').deleteMany({
      timestamp: { $lt: thirtyDaysAgo }
    });
    
    return result.deletedCount;
  }
  
  // Anonymize data for analytics
  async anonymizeConversation(conversationId: string): Promise<void> {
    await this.db.collection('voice_queries').updateOne(
      { _id: conversationId },
      {
        $set: {
          userId: 'anonymous',
          anonymized: true,
          anonymizedAt: new Date(),
        }
      }
    );
  }
  
  // Delete user's conversation history
  async deleteUserHistory(userId: string): Promise<number> {
    const result = await this.db.collection('voice_queries').deleteMany({
      userId
    });
    
    return result.deletedCount;
  }
}
```

**Audio Cleanup:**
```typescript
class AudioCleanupService {
  // Delete audio files after transcription
  async cleanupAudio(audioKey: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: process.env.S3_AUDIO_BUCKET,
      Key: audioKey,
    });
  }
  
  // Cleanup failed transcription jobs
  async cleanupFailedJobs(): Promise<void> {
    const failedJobs = await this.getFailedTranscriptionJobs();
    
    for (const job of failedJobs) {
      await this.cleanupAudio(job.audioKey);
    }
  }
}
```

## Data Flow

### Query Processing Flow

```
1. User Query
   ↓
2. Voice Transcription (if audio)
   ↓
3. Language Detection
   ↓
4. Translation to English (if needed)
   ↓
5. Session Context Retrieval
   ↓
6. AWS Lex Processing
   ↓
7. Intent Recognition
   ↓
8. Fulfillment Handler Selection
   ├─→ Crop Price Handler → Marketplace DB
   ├─→ Weather Handler → Weather API
   ├─→ Farming Advice Handler → Knowledge Base
   └─→ Other Handlers
   ↓
9. Response Generation
   ↓
10. Translation to User Language
   ↓
11. Audio Synthesis (async)
   ↓
12. Session Update
   ↓
13. Conversation Logging
   ↓
14. Response to User
```

## Database Schema

### MongoDB Collections

#### voice_queries
```typescript
{
  _id: ObjectId,
  userId: string,
  sessionId: string,
  query: string,
  response: string,
  intent: string,
  confidence: number,
  slots: Record<string, string>,
  language: string,
  timestamp: Date,
  sessionCleared: boolean,
  clearedAt: Date,
  anonymized: boolean,
  anonymizedAt: Date,
}
```

#### farming_tips
```typescript
{
  _id: ObjectId,
  crop: string,
  topic: string,
  advice: string,
  tips: string[],
  season: string,
  region: string,
  language: string,
  references: string[],
  createdAt: Date,
  updatedAt: Date,
}
```

#### sessions (if using MongoDB instead of Redis)
```typescript
{
  _id: ObjectId,
  sessionId: string,
  userId: string,
  attributes: Record<string, any>,
  lastActivity: Date,
  createdAt: Date,
  expiresAt: Date,
}
```

## API Integration

### Weather API (OpenWeatherMap)

```typescript
interface WeatherAPI {
  getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather>;
  getForecast(lat: number, lon: number): Promise<Forecast>;
}

// Example: OpenWeatherMap
const weatherApi = {
  baseUrl: 'https://api.openweathermap.org/data/2.5',
  apiKey: process.env.OPENWEATHER_API_KEY,
  
  async getCurrentWeather(lat: number, lon: number) {
    const response = await fetch(
      `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
    );
    return response.json();
  },
  
  async getForecast(lat: number, lon: number) {
    const response = await fetch(
      `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
    );
    return response.json();
  },
};
```

## Error Handling

### Graceful Degradation

```typescript
class KisanMitraService {
  async processQuery(request: KisanMitraRequest): Promise<KisanMitraResponse> {
    try {
      // Normal processing
      return await this.processQueryInternal(request);
    } catch (error) {
      console.error('[KisanMitra] Query processing failed:', error);
      
      // Graceful degradation
      return {
        text: this.getErrorMessage(error, request.language),
        intent: 'Error',
        confidence: 0,
        error: true,
      };
    }
  }
  
  private getErrorMessage(error: any, language: string): string {
    const messages = {
      en: "I'm having trouble understanding that. Could you please rephrase?",
      hi: "मुझे समझने में परेशानी हो रही है। क्या आप कृपया दोबारा कह सकते हैं?",
      // ... other languages
    };
    
    return messages[language] || messages.en;
  }
}
```

## Performance Optimization

### Caching Strategy

1. **Session Cache:** Redis (5 min TTL)
2. **Weather Cache:** Redis (30 min TTL)
3. **Crop Price Cache:** Redis (5 min TTL)
4. **Farming Tips Cache:** In-memory (1 hour TTL)

### Database Indexing

```typescript
// MongoDB indexes
db.voice_queries.createIndex({ userId: 1, timestamp: -1 });
db.voice_queries.createIndex({ sessionId: 1 });
db.voice_queries.createIndex({ intent: 1 });
db.voice_queries.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

db.farming_tips.createIndex({ crop: 1, topic: 1 });
db.farming_tips.createIndex({ language: 1 });
```

## Security Considerations

1. **Input Sanitization:** Sanitize all user inputs before database queries
2. **Rate Limiting:** 30 requests per minute per user
3. **Authentication:** Require valid user token
4. **Data Encryption:** Encrypt conversation data at rest
5. **Audio Encryption:** Use TLS for audio upload/download
6. **Privacy:** Delete audio files after processing

## Testing Strategy

1. **Unit Tests:** Test each handler independently
2. **Integration Tests:** Test with real AWS Lex
3. **E2E Tests:** Test complete conversation flows
4. **Load Tests:** Test with 100 concurrent conversations
5. **Privacy Tests:** Verify data deletion works

## Deployment

1. **Environment Variables:**
   - `OPENWEATHER_API_KEY`
   - `MONGODB_URI`
   - `REDIS_URL` (optional)
   - `LEX_BOT_ID`
   - `LEX_BOT_ALIAS_ID`

2. **Database Setup:**
   - Create MongoDB collections
   - Create indexes
   - Seed farming tips knowledge base

3. **Monitoring:**
   - CloudWatch metrics for Lex usage
   - Application logs for errors
   - Database query performance

## Future Enhancements

1. **Machine Learning:** Train custom NLU models
2. **Personalization:** Learn user preferences
3. **Proactive Advice:** Send weather alerts
4. **Voice Commands:** Navigate app by voice
5. **Multi-modal:** Support images in queries

