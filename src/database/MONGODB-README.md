# MongoDB Collections - Bharat Mandi

## Overview

MongoDB is used for document storage in the Bharat Mandi platform. It stores unstructured and semi-structured data that doesn't fit well in relational tables.

## Collections

### 1. photo_logs
Stores farming activity photos with metadata.

**Schema:**
```typescript
{
  farmerId: string (indexed)
  imageUrl: string
  category: enum (TILLING, SOWING, SPRAYING, FERTIGATION, HARVEST, OTHER)
  location: { lat: number, lng: number }
  timestamp: Date (indexed)
  notes?: string
  transactionId?: string (indexed)
}
```

**Indexes:**
- `farmerId + timestamp` (compound)
- `category + timestamp` (compound)

### 2. quality_certificates
Digital quality certificates from AI grading.

**Schema:**
```typescript
{
  certificateId: string (unique, indexed)
  farmerId: string (indexed)
  produceType: string (indexed)
  grade: enum (A, B, C)
  timestamp: Date
  location: { lat: number, lng: number }
  imageHash: string
  analysisDetails: {
    size, shape, color, defects, confidence
  }
}
```

**Indexes:**
- `farmerId + timestamp` (compound)
- `produceType + grade` (compound)

### 3. price_predictions
Price forecasts for produce types.

**Schema:**
```typescript
{
  produceType: string (indexed)
  location: string (indexed)
  predictions: [{
    date: Date
    predictedPrice: number
    confidenceInterval: { lower, upper }
  }]
  confidence: number
  generatedAt: Date (indexed)
}
```

**Indexes:**
- `produceType + location + generatedAt` (compound)

### 4. voice_queries
Voice assistant query history.

**Schema:**
```typescript
{
  userId: string (indexed)
  query: string
  response: string
  confidence: number
  timestamp: Date (indexed)
  language: string
  queryType: enum (PRICE, WEATHER, BEST_PRACTICE, PLATFORM_HELP, OTHER)
}
```

**Indexes:**
- `userId + timestamp` (compound)

### 5. feedback_comments
Detailed user feedback and responses.

**Schema:**
```typescript
{
  transactionId: string (indexed)
  fromUserId: string (indexed)
  toUserId: string (indexed)
  rating: number (0-5)
  comment?: string
  response?: string
  timestamp: Date (indexed)
}
```

**Indexes:**
- `toUserId + timestamp` (compound)

### 6. disease_diagnoses
Crop disease diagnoses with treatments.

**Schema:**
```typescript
{
  farmerId: string (indexed)
  imageUrl: string
  diseaseName: string (indexed)
  severity: enum (LOW, MEDIUM, HIGH)
  confidence: number
  treatments: [{
    name, type, dosage, applicationMethod
  }]
  timestamp: Date (indexed)
  photoLogId?: string
}
```

**Indexes:**
- `farmerId + timestamp` (compound)
- `diseaseName`

### 7. soil_test_reports
Soil health test results.

**Schema:**
```typescript
{
  farmerId: string (indexed)
  testDate: Date
  labName: string
  parameters: {
    pH, nitrogen, phosphorus, potassium,
    organicCarbon, electricalConductivity,
    micronutrients: { zinc, iron, copper, manganese }
  }
  recommendations: string[]
  createdAt: Date (indexed)
}
```

**Indexes:**
- `farmerId + testDate` (compound)

### 8. smart_alerts
Weather, pest, price, and other alerts.

**Schema:**
```typescript
{
  userId: string (indexed)
  type: enum (WEATHER, PEST, PRICE, POWER_CUT, HARVEST, SCHEME)
  title: string
  message: string
  actionable: string
  priority: enum (LOW, MEDIUM, HIGH, URGENT)
  channels: enum[] (PUSH, SMS, VOICE)
  sentAt: Date (indexed)
  readAt?: Date
}
```

**Indexes:**
- `userId + sentAt` (compound)
- `type + priority` (compound)

### 9. traceability_records
End-to-end produce traceability.

**Schema:**
```typescript
{
  produceId: string (unique, indexed)
  farmerId: string (indexed)
  seedSource: string
  plantingDate: Date
  activities: [{
    type, description, timestamp, photoLogId
  }]
  certificateId: string (indexed)
  transactionId?: string
  qrCode?: string
  createdAt: Date (indexed)
}
```

**Indexes:**
- `farmerId + createdAt` (compound)
- `certificateId`

### 10. ad_listings
Voice-to-ad generated listings.

**Schema:**
```typescript
{
  userId: string (indexed)
  title: string
  description: string
  category: string (indexed)
  price: number
  images: string[]
  voiceTranscript?: string
  isActive: boolean (indexed)
  createdAt: Date (indexed)
}
```

**Indexes:**
- `userId + createdAt` (compound)
- `category + isActive` (compound)

## Usage Examples

### Create a Photo Log Entry
```typescript
import { PhotoLogModel } from './database/mongodb-models';

const photoLog = await PhotoLogModel.create({
  farmerId: 'farmer-123',
  imageUrl: 'https://s3.amazonaws.com/...',
  category: 'HARVEST',
  location: { lat: 28.7041, lng: 77.1025 },
  timestamp: new Date(),
  notes: 'Tomato harvest - Grade A quality'
});
```

### Query Photo Logs
```typescript
// Get recent photo logs for a farmer
const logs = await PhotoLogModel
  .find({ farmerId: 'farmer-123' })
  .sort({ timestamp: -1 })
  .limit(10);

// Get photo logs by category
const harvestLogs = await PhotoLogModel
  .find({ 
    farmerId: 'farmer-123',
    category: 'HARVEST'
  })
  .sort({ timestamp: -1 });
```

### Create Quality Certificate
```typescript
import { QualityCertificateModel } from './database/mongodb-models';

const certificate = await QualityCertificateModel.create({
  certificateId: 'cert-' + uuid(),
  farmerId: 'farmer-123',
  produceType: 'Tomato',
  grade: 'A',
  timestamp: new Date(),
  location: { lat: 28.7041, lng: 77.1025 },
  imageHash: 'sha256-...',
  analysisDetails: {
    size: 0.95,
    shape: 0.92,
    color: 0.88,
    defects: 0.05,
    confidence: 0.91
  }
});
```

### Store Disease Diagnosis
```typescript
import { DiseaseDiagnosisModel } from './database/mongodb-models';

const diagnosis = await DiseaseDiagnosisModel.create({
  farmerId: 'farmer-123',
  imageUrl: 'https://...',
  diseaseName: 'Tomato Late Blight',
  severity: 'MEDIUM',
  confidence: 0.87,
  treatments: [
    {
      name: 'Copper Fungicide',
      type: 'CHEMICAL',
      dosage: '2g per liter',
      applicationMethod: 'Foliar spray every 7 days'
    },
    {
      name: 'Neem Oil',
      type: 'ORGANIC',
      dosage: '5ml per liter',
      applicationMethod: 'Spray on affected areas'
    }
  ],
  timestamp: new Date()
});
```

## Connection Management

The MongoDB connection is managed in `mongodb-config.ts`:

```typescript
import { connectMongoDB, disconnectMongoDB } from './database/mongodb-config';

// Connect
await connectMongoDB();

// Disconnect
await disconnectMongoDB();
```

## Best Practices

1. **Always use indexes** for frequently queried fields
2. **Limit document size** to under 16MB (MongoDB limit)
3. **Use projection** to fetch only required fields
4. **Batch operations** when possible for better performance
5. **Handle connection errors** gracefully
6. **Close connections** when application shuts down

## Maintenance

### View Collection Stats
```bash
npm run mongodb:stats
```

### Create Indexes
```bash
npm run mongodb:setup
```

### Backup Collection
```bash
mongoexport --db bharat_mandi --collection photo_logs --out photo_logs.json
```

### Restore Collection
```bash
mongoimport --db bharat_mandi --collection photo_logs --file photo_logs.json
```
