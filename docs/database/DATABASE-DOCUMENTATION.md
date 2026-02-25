# Bharat Mandi - Complete Database Documentation

## Table of Contents
1. [Database Architecture Overview](#database-architecture-overview)
2. [PostgreSQL Tables](#postgresql-tables)
3. [MongoDB Collections](#mongodb-collections)
4. [SQLite Tables](#sqlite-tables)
5. [Entity Relationship Diagrams](#entity-relationship-diagrams)
6. [Table Relationships](#table-relationships)
7. [Constraints and Indexes](#constraints-and-indexes)

---

## Database Architecture Overview

Bharat Mandi uses a **polyglot persistence** architecture with three databases:

### PostgreSQL (Relational Database)
**Purpose**: Transactional data requiring ACID compliance
**Use Cases**: Users, transactions, payments, ratings, auctions
**Tables**: 19 tables

### MongoDB (Document Database)
**Purpose**: Unstructured/semi-structured data with flexible schemas
**Use Cases**: Photos, certificates, diagnoses, alerts, traceability
**Collections**: 10 collections

### SQLite (Local Database)
**Purpose**: Offline storage and sync queue
**Use Cases**: Cached data, pending operations, local photos
**Tables**: 10 tables

---

## PostgreSQL Tables

### Core Tables

#### 1. users
**Purpose**: Store all platform users (farmers, buyers, service providers)
**Primary Key**: id (UUID)
**Unique Constraints**: phone
**Indexes**: phone, type, location


**Columns**:
- id: UUID (PK)
- name: VARCHAR(255)
- phone: VARCHAR(15) UNIQUE
- type: VARCHAR(50) - FARMER, BUYER, LOGISTICS_PROVIDER, COLD_STORAGE_PROVIDER, SUPPLIER
- location: VARCHAR(255)
- bank_account_number, bank_ifsc_code, bank_name, bank_account_holder_name
- credibility_score: INTEGER (default 500)
- rating: DECIMAL(3,2) (default 0.00)
- created_at, updated_at: TIMESTAMP

**Relationships**:
- One-to-Many with listings (farmer_id)
- One-to-Many with transactions (farmer_id, buyer_id)
- One-to-Many with credibility_scores (farmer_id)
- One-to-Many with ratings (from_user_id, to_user_id)

---

#### 2. listings
**Purpose**: Marketplace produce listings
**Primary Key**: id (UUID)
**Foreign Keys**: farmer_id → users(id)
**Indexes**: farmer_id, produce_type, is_active, created_at

**Columns**:
- id: UUID (PK)
- farmer_id: UUID (FK → users)
- produce_type: VARCHAR(100)
- quantity: DECIMAL(10,2)
- price_per_kg: DECIMAL(10,2)
- certificate_id: UUID
- expected_harvest_date: DATE
- is_active: BOOLEAN (default TRUE)
- created_at, updated_at: TIMESTAMP

**Relationships**:
- Many-to-One with users (farmer)
- One-to-Many with transactions
- One-to-One with auction_listings (optional)

---

#### 3. transactions
**Purpose**: Purchase transactions between farmers and buyers
**Primary Key**: id (UUID)
**Foreign Keys**: listing_id → listings(id), farmer_id → users(id), buyer_id → users(id)
**Indexes**: listing_id, farmer_id, buyer_id, status, created_at

**Columns**:
- id: UUID (PK)
- listing_id: UUID (FK → listings)
- farmer_id: UUID (FK → users)
- buyer_id: UUID (FK → users)
- amount: DECIMAL(12,2)
- status: VARCHAR(50) - PENDING, ACCEPTED, PAYMENT_LOCKED, IN_TRANSIT, DELIVERED, COMPLETED, DISPUTED, REJECTED
- created_at, updated_at, dispatched_at, delivered_at, completed_at: TIMESTAMP

**Relationships**:
- Many-to-One with listings
- Many-to-One with users (farmer and buyer)
- One-to-One with escrow_accounts
- One-to-Many with ratings
- One-to-One with logistics_orders

---

#### 4. escrow_accounts
**Purpose**: Secure payment escrow for transactions
**Primary Key**: id (UUID)
**Foreign Keys**: transaction_id → transactions(id) UNIQUE
**Indexes**: transaction_id, is_locked

**Columns**:
- id: UUID (PK)
- transaction_id: UUID (FK → transactions) UNIQUE
- amount: DECIMAL(12,2)
- is_locked: BOOLEAN (default FALSE)
- created_at, released_at: TIMESTAMP

**Relationships**:
- One-to-One with transactions

---

### Rating & Credibility Tables

#### 5. ratings
**Purpose**: User ratings and feedback
**Primary Key**: id (UUID)
**Foreign Keys**: transaction_id → transactions(id), from_user_id → users(id), to_user_id → users(id)
**Indexes**: transaction_id, to_user_id, created_at

**Columns**:
- id: UUID (PK)
- transaction_id: UUID (FK → transactions)
- from_user_id: UUID (FK → users)
- to_user_id: UUID (FK → users)
- rating: DECIMAL(3,2) CHECK (0-5)
- feedback: TEXT
- implicit_rating: DECIMAL(3,2)
- created_at: TIMESTAMP

**Relationships**:
- Many-to-One with transactions
- Many-to-One with users (from and to)

---

#### 6. credibility_scores
**Purpose**: Farmer credibility scoring system
**Primary Key**: id (UUID)
**Foreign Keys**: farmer_id → users(id) UNIQUE
**Indexes**: farmer_id, score

**Columns**:
- id: UUID (PK)
- farmer_id: UUID (FK → users) UNIQUE
- score: INTEGER CHECK (300-900)
- transaction_history: DECIMAL(5,2)
- payment_reliability: DECIMAL(5,2)
- farming_consistency: DECIMAL(5,2)
- produce_quality: DECIMAL(5,2)
- updated_at: TIMESTAMP

**Relationships**:
- One-to-One with users (farmer)
- One-to-Many with credibility_score_history

---

#### 7. credibility_score_history
**Purpose**: Historical credibility score changes
**Primary Key**: id (UUID)
**Foreign Keys**: credibility_score_id → credibility_scores(id)
**Indexes**: credibility_score_id, timestamp

**Columns**:
- id: UUID (PK)
- credibility_score_id: UUID (FK → credibility_scores)
- score: INTEGER
- reason: TEXT
- timestamp: TIMESTAMP

**Relationships**:
- Many-to-One with credibility_scores

---

### Ecosystem Integration Tables

#### 8. service_providers
**Purpose**: Logistics, storage, and supplier providers
**Primary Key**: id (UUID)
**Indexes**: type, location, rating

**Columns**:
- id: UUID (PK)
- name: VARCHAR(255)
- type: VARCHAR(50) - LOGISTICS_PROVIDER, COLD_STORAGE_PROVIDER, SUPPLIER
- services: TEXT[] (array)
- location: VARCHAR(255)
- rating: DECIMAL(3,2)
- contact_phone: VARCHAR(15)
- created_at: TIMESTAMP

**Relationships**:
- One-to-Many with logistics_orders
- One-to-Many with storage_bookings
- One-to-Many with route_optimizations

---

#### 9. logistics_orders
**Purpose**: Logistics and delivery orders
**Primary Key**: id (UUID)
**Foreign Keys**: transaction_id → transactions(id), provider_id → service_providers(id)
**Indexes**: transaction_id, provider_id, status

**Columns**:
- id: UUID (PK)
- transaction_id: UUID (FK → transactions)
- provider_id: UUID (FK → service_providers)
- pickup_lat, pickup_lng: DECIMAL(10,8), DECIMAL(11,8)
- delivery_lat, delivery_lng: DECIMAL(10,8), DECIMAL(11,8)
- status: VARCHAR(50) - PENDING, ASSIGNED, IN_TRANSIT, DELIVERED, CANCELLED
- vehicle_id: VARCHAR(50)
- estimated_delivery_time, actual_delivery_time: TIMESTAMP
- created_at: TIMESTAMP

**Relationships**:
- Many-to-One with transactions
- Many-to-One with service_providers
- One-to-Many with vehicle_tracking

---

#### 10. storage_bookings
**Purpose**: Cold storage bookings
**Primary Key**: id (UUID)
**Foreign Keys**: farmer_id → users(id), provider_id → service_providers(id)
**Indexes**: farmer_id, provider_id, status

**Columns**:
- id: UUID (PK)
- farmer_id: UUID (FK → users)
- provider_id: UUID (FK → service_providers)
- produce_type: VARCHAR(100)
- quantity: DECIMAL(10,2)
- start_date, end_date: DATE
- cost_per_day, total_cost: DECIMAL(10,2), DECIMAL(12,2)
- status: VARCHAR(50) - ACTIVE, COMPLETED, CANCELLED
- created_at: TIMESTAMP

**Relationships**:
- Many-to-One with users (farmer)
- Many-to-One with service_providers

---

### Auction Tables

#### 11. auction_listings
**Purpose**: Auction-based produce listings
**Primary Key**: id (UUID)
**Foreign Keys**: listing_id → listings(id) UNIQUE, farmer_id → users(id), current_highest_bidder → users(id)
**Indexes**: listing_id, farmer_id, status, end_time

**Columns**:
- id: UUID (PK)
- listing_id: UUID (FK → listings) UNIQUE
- farmer_id: UUID (FK → users)
- minimum_bid_price: DECIMAL(10,2)
- current_highest_bid: DECIMAL(10,2)
- current_highest_bidder: UUID (FK → users)
- start_time, end_time: TIMESTAMP
- status: VARCHAR(50) - OPEN, CLOSED, CANCELLED
- created_at: TIMESTAMP

**Relationships**:
- One-to-One with listings
- Many-to-One with users (farmer and bidder)
- One-to-Many with bids

---

#### 12. bids
**Purpose**: Bids placed on auctions
**Primary Key**: id (UUID)
**Foreign Keys**: auction_id → auction_listings(id), bidder_id → users(id)
**Indexes**: auction_id, bidder_id, timestamp

**Columns**:
- id: UUID (PK)
- auction_id: UUID (FK → auction_listings)
- bidder_id: UUID (FK → users)
- amount: DECIMAL(10,2)
- timestamp: TIMESTAMP

**Relationships**:
- Many-to-One with auction_listings
- Many-to-One with users (bidder)

---

### Government Schemes Tables

#### 13. government_schemes
**Purpose**: Available government schemes for farmers
**Primary Key**: id (UUID)
**Indexes**: is_active, application_deadline

**Columns**:
- id: UUID (PK)
- name: VARCHAR(255)
- description, benefits: TEXT
- min_land_size, max_land_size: DECIMAL(10,2)
- crop_types, locations, farmer_categories: TEXT[] (arrays)
- application_deadline: DATE
- is_active: BOOLEAN
- created_at: TIMESTAMP

**Relationships**:
- One-to-Many with scheme_applications

---

#### 14. scheme_applications
**Purpose**: Farmer applications for government schemes
**Primary Key**: id (UUID)
**Foreign Keys**: scheme_id → government_schemes(id), farmer_id → users(id)
**Indexes**: scheme_id, farmer_id, status

**Columns**:
- id: UUID (PK)
- scheme_id: UUID (FK → government_schemes)
- farmer_id: UUID (FK → users)
- documents: TEXT[] (array of URLs)
- status: VARCHAR(50) - PENDING, APPROVED, REJECTED
- applied_at, reviewed_at: TIMESTAMP

**Relationships**:
- Many-to-One with government_schemes
- Many-to-One with users (farmer)

---

### Route Optimization Tables

#### 15. route_optimizations
**Purpose**: Optimized delivery routes for logistics
**Primary Key**: id (UUID)
**Foreign Keys**: provider_id → service_providers(id)
**Indexes**: provider_id, created_at

**Columns**:
- id: UUID (PK)
- provider_id: UUID (FK → service_providers)
- pickup_points: JSONB (array of {farmerId, location, pickupTime})
- delivery_lat, delivery_lng: DECIMAL(10,8), DECIMAL(11,8)
- optimized_route: JSONB (array of coordinates)
- total_distance: DECIMAL(10,2)
- estimated_time: INTEGER (minutes)
- cost_savings: DECIMAL(10,2)
- created_at: TIMESTAMP

**Relationships**:
- Many-to-One with service_providers

---

#### 16. vehicle_tracking
**Purpose**: Real-time vehicle location tracking
**Primary Key**: id (UUID)
**Foreign Keys**: logistics_order_id → logistics_orders(id)
**Indexes**: logistics_order_id, vehicle_id, last_updated

**Columns**:
- id: UUID (PK)
- logistics_order_id: UUID (FK → logistics_orders)
- vehicle_id: VARCHAR(50)
- current_lat, current_lng: DECIMAL(10,8), DECIMAL(11,8)
- speed: DECIMAL(5,2) (km/h)
- estimated_arrival: TIMESTAMP
- last_updated: TIMESTAMP

**Relationships**:
- Many-to-One with logistics_orders

---

### Dispute Tables

#### 17. disputes
**Purpose**: Transaction disputes
**Primary Key**: id (UUID)
**Foreign Keys**: transaction_id → transactions(id), initiated_by → users(id)
**Indexes**: transaction_id, initiated_by, status

**Columns**:
- id: UUID (PK)
- transaction_id: UUID (FK → transactions)
- initiated_by: UUID (FK → users)
- status: VARCHAR(50) - INITIATED, UNDER_REVIEW, RESOLVED, ESCALATED
- resolution: TEXT
- created_at, resolved_at: TIMESTAMP

**Relationships**:
- Many-to-One with transactions
- Many-to-One with users (initiator)
- One-to-Many with dispute_evidence

---

#### 18. dispute_evidence
**Purpose**: Evidence submitted for disputes
**Primary Key**: id (UUID)
**Foreign Keys**: dispute_id → disputes(id), user_id → users(id)
**Indexes**: dispute_id, timestamp

**Columns**:
- id: UUID (PK)
- dispute_id: UUID (FK → disputes)
- user_id: UUID (FK → users)
- type: VARCHAR(50) - PHOTO, MESSAGE, DOCUMENT
- content: TEXT
- timestamp: TIMESTAMP

**Relationships**:
- Many-to-One with disputes
- Many-to-One with users

---

#### 19. migrations
**Purpose**: Track executed database migrations
**Primary Key**: id (SERIAL)
**Unique Constraints**: name

**Columns**:
- id: SERIAL (PK)
- name: VARCHAR(255) UNIQUE
- executed_at: TIMESTAMP

---

## MongoDB Collections

### 1. photo_logs
**Purpose**: Farming activity photos with metadata
**Indexes**: farmerId + timestamp, category + timestamp

**Schema**:
```javascript
{
  farmerId: String (indexed),
  imageUrl: String,
  category: Enum (TILLING, SOWING, SPRAYING, FERTIGATION, HARVEST, OTHER),
  location: { lat: Number, lng: Number },
  timestamp: Date (indexed),
  notes: String (optional),
  transactionId: String (indexed, optional)
}
```

---

### 2. quality_certificates
**Purpose**: Digital quality certificates from AI grading
**Indexes**: farmerId + timestamp, produceType + grade, certificateId (unique)

**Schema**:
```javascript
{
  certificateId: String (unique, indexed),
  farmerId: String (indexed),
  produceType: String (indexed),
  grade: Enum (A, B, C),
  timestamp: Date,
  location: { lat: Number, lng: Number },
  imageHash: String,
  analysisDetails: {
    size: Number,
    shape: Number,
    color: Number,
    defects: Number,
    confidence: Number
  }
}
```

---

### 3. price_predictions
**Purpose**: Price forecasts for produce
**Indexes**: produceType + location + generatedAt

**Schema**:
```javascript
{
  produceType: String (indexed),
  location: String (indexed),
  predictions: [{
    date: Date,
    predictedPrice: Number,
    confidenceInterval: { lower: Number, upper: Number }
  }],
  confidence: Number,
  generatedAt: Date (indexed)
}
```

---

### 4. voice_queries
**Purpose**: Voice assistant query history
**Indexes**: userId + timestamp

**Schema**:
```javascript
{
  userId: String (indexed),
  query: String,
  response: String,
  confidence: Number,
  timestamp: Date (indexed),
  language: String,
  queryType: Enum (PRICE, WEATHER, BEST_PRACTICE, PLATFORM_HELP, OTHER)
}
```

---

### 5. feedback_comments
**Purpose**: Detailed user feedback
**Indexes**: toUserId + timestamp

**Schema**:
```javascript
{
  transactionId: String (indexed),
  fromUserId: String (indexed),
  toUserId: String (indexed),
  rating: Number (0-5),
  comment: String (optional),
  response: String (optional),
  timestamp: Date (indexed)
}
```

---

### 6. disease_diagnoses
**Purpose**: Crop disease diagnoses
**Indexes**: farmerId + timestamp, diseaseName

**Schema**:
```javascript
{
  farmerId: String (indexed),
  imageUrl: String,
  diseaseName: String (indexed),
  severity: Enum (LOW, MEDIUM, HIGH),
  confidence: Number,
  treatments: [{
    name: String,
    type: Enum (CHEMICAL, ORGANIC),
    dosage: String,
    applicationMethod: String
  }],
  timestamp: Date (indexed),
  photoLogId: String (optional)
}
```

---

### 7. soil_test_reports
**Purpose**: Soil health test results
**Indexes**: farmerId + testDate

**Schema**:
```javascript
{
  farmerId: String (indexed),
  testDate: Date,
  labName: String,
  parameters: {
    pH: Number,
    nitrogen: Number,
    phosphorus: Number,
    potassium: Number,
    organicCarbon: Number,
    electricalConductivity: Number,
    micronutrients: {
      zinc: Number,
      iron: Number,
      copper: Number,
      manganese: Number
    }
  },
  recommendations: [String],
  createdAt: Date (indexed)
}
```

---

### 8. smart_alerts
**Purpose**: Weather, pest, price, and other alerts
**Indexes**: userId + sentAt, type + priority

**Schema**:
```javascript
{
  userId: String (indexed),
  type: Enum (WEATHER, PEST, PRICE, POWER_CUT, HARVEST, SCHEME),
  title: String,
  message: String,
  actionable: String,
  priority: Enum (LOW, MEDIUM, HIGH, URGENT),
  channels: [Enum (PUSH, SMS, VOICE)],
  sentAt: Date (indexed),
  readAt: Date (optional)
}
```

---

### 9. traceability_records
**Purpose**: End-to-end produce traceability
**Indexes**: farmerId + createdAt, certificateId, produceId (unique)

**Schema**:
```javascript
{
  produceId: String (unique, indexed),
  farmerId: String (indexed),
  seedSource: String,
  plantingDate: Date,
  activities: [{
    type: Enum (PLANTING, FERTILIZER, PESTICIDE, IRRIGATION, HARVEST, TRANSPORT),
    description: String,
    timestamp: Date,
    photoLogId: String (optional)
  }],
  certificateId: String (indexed),
  transactionId: String (optional),
  qrCode: String (optional),
  createdAt: Date (indexed)
}
```

---

### 10. ad_listings
**Purpose**: Voice-to-ad generated listings
**Indexes**: userId + createdAt, category + isActive

**Schema**:
```javascript
{
  userId: String (indexed),
  title: String,
  description: String,
  category: String (indexed),
  price: Number,
  images: [String],
  voiceTranscript: String (optional),
  isActive: Boolean (indexed),
  createdAt: Date (indexed)
}
```

---

## SQLite Tables

### 1. cached_listings
**Purpose**: Cached marketplace listings for offline browsing
**Indexes**: produce_type, is_active

### 2. pending_sync_queue
**Purpose**: Queue of operations waiting to sync
**Indexes**: created_at, entity_type

### 3. local_photo_logs
**Purpose**: Farming photos stored locally
**Indexes**: farmer_id, synced, timestamp

### 4. user_profile
**Purpose**: Cached user profile
**Primary Key**: id

### 5. ai_models_metadata
**Purpose**: Metadata for local AI models
**Indexes**: is_active

### 6. cached_certificates
**Purpose**: Quality certificates cached locally
**Indexes**: farmer_id, produce_type

### 7. offline_activities
**Purpose**: Log of offline activities
**Indexes**: status, user_id, created_at

### 8. cached_transactions
**Purpose**: Transaction history cached
**Indexes**: farmer_id, buyer_id, status

### 9. sync_status
**Purpose**: Tracks sync status per entity
**Unique**: entity_type

### 10. app_settings
**Purpose**: Application settings
**Primary Key**: key

---

