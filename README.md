# Bharat Mandi - Agricultural Marketplace Platform

A comprehensive agricultural marketplace platform addressing systemic issues in agricultural trade through AI-powered produce grading, secure escrow payments, digital farming records, and ecosystem integration.

## Documentation

All project documentation is organized in the `docs/` folder:

- [Quickstart Guide](docs/QUICKSTART.md) - Get started quickly
- [POC v2 Guide](docs/POC-V2-GUIDE.md) - Current POC implementation guide
- [Authentication API Guide](docs/AUTH-API-GUIDE.md) - Authentication endpoints and flows
- [AI Grading Guide](docs/AI-GRADING-GUIDE.md) - AI-powered produce grading
- [UI Guide](docs/UI-GUIDE.md) - User interface documentation
- [Database Setup](docs/DATABASE-SETUP.md) - Database configuration
- [Database Documentation](docs/DATABASE-DOCUMENTATION.md) - Schema and models
- [Database ER Diagrams](docs/DATABASE-ER-DIAGRAMS.md) - Entity relationship diagrams
- [Database Summary](docs/DATABASE-SUMMARY.md) - Database overview
- [MongoDB Setup](docs/MONGODB-SETUP.md) - MongoDB configuration
- [POC Test Results](docs/POC-TEST-RESULTS.md) - Testing outcomes
- [Crop Detection Update](docs/CROP-DETECTION-UPDATE.md) - Latest crop detection features

## POC Scope

This POC focuses on the essential workflow:

**Farmer Onboarding → Produce Grading → Listing → Purchase → Escrow → Delivery**

### What's Included

- ✅ Basic Node.js/Express backend with TypeScript
- ✅ In-memory database (no PostgreSQL/MongoDB setup needed)
- ✅ Core API endpoints for the main workflow
- ✅ Mock AI grading service
- ✅ Escrow payment simulation
- ✅ Transaction lifecycle management

### What's NOT Included (Future Implementation)

- ❌ React Native mobile app
- ❌ Actual AI/ML models
- ❌ Real database (PostgreSQL/MongoDB)
- ❌ AWS infrastructure
- ❌ Authentication/Authorization
- ❌ Photo-Log feature
- ❌ Credibility scoring
- ❌ Advanced features (auctions, disease diagnosis, etc.)

## Project Structure

```
bharat-mandi/
├── .kiro/                  # Kiro specs and configuration
│   └── specs/
│       └── bharat-mandi/   # Feature specifications
├── data/                   # SQLite database files
├── docs/                   # 📚 All documentation files
├── public/                 # Static HTML files for POC UI
├── src/
│   ├── database/          # Database configuration and migrations
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   └── __tests__/         # Integration tests
├── TestImages/            # Sample images for testing
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Installation

```bash
npm install
```

## Running the POC

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /api/health
```

### User Management
```
POST /api/users
Body: { name, phone, type: "FARMER" | "BUYER", location }

GET /api/users
```

### Grading & Certification
```
POST /api/grading/grade
Body: { farmerId, produceType, imageData, location: { lat, lng } }
Returns: { gradingResult, certificate }
```

### Marketplace
```
POST /api/listings
Body: { farmerId, produceType, quantity, pricePerKg, certificateId }

GET /api/listings
GET /api/listings/:id
```

### Transactions & Escrow
```
POST /api/transactions
Body: { listingId, farmerId, buyerId, amount }

POST /api/transactions/:id/accept
POST /api/transactions/:id/lock-payment
POST /api/transactions/:id/dispatch
POST /api/transactions/:id/deliver
POST /api/transactions/:id/release-funds

GET /api/transactions/:id
```

## Complete Workflow Example

### 1. Create Users
```bash
# Create Farmer
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ramesh Kumar",
    "phone": "+919876543210",
    "type": "FARMER",
    "location": "Punjab"
  }'

# Create Buyer
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Suresh Traders",
    "phone": "+919876543211",
    "type": "BUYER",
    "location": "Delhi"
  }'
```

### 2. Grade Produce
```bash
curl -X POST http://localhost:3000/api/grading/grade \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "<farmer-id>",
    "produceType": "Wheat",
    "imageData": "base64_image_data",
    "location": { "lat": 30.7333, "lng": 76.7794 }
  }'
```

### 3. Create Listing
```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "<farmer-id>",
    "produceType": "Wheat",
    "quantity": 1000,
    "pricePerKg": 25,
    "certificateId": "<certificate-id>"
  }'
```

### 4. Buyer Initiates Purchase
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "<listing-id>",
    "farmerId": "<farmer-id>",
    "buyerId": "<buyer-id>",
    "amount": 25000
  }'
```

### 5. Farmer Accepts Order
```bash
curl -X POST http://localhost:3000/api/transactions/<transaction-id>/accept
```

### 6. Buyer Locks Payment
```bash
curl -X POST http://localhost:3000/api/transactions/<transaction-id>/lock-payment
```

### 7. Farmer Dispatches
```bash
curl -X POST http://localhost:3000/api/transactions/<transaction-id>/dispatch
```

### 8. Buyer Confirms Delivery
```bash
curl -X POST http://localhost:3000/api/transactions/<transaction-id>/deliver
```

### 9. Release Funds
```bash
curl -X POST http://localhost:3000/api/transactions/<transaction-id>/release-funds
```

## Testing

```bash
npm test
```

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Testing**: Jest
- **Database**: In-memory (Map-based)

## Next Steps

After POC validation, the full implementation will include:

1. React Native mobile application
2. Real database setup (PostgreSQL + MongoDB)
3. AWS cloud infrastructure
4. Actual AI/ML models for grading
5. Authentication & authorization
6. Photo-Log and credibility scoring
7. Advanced features (auctions, disease diagnosis, etc.)

## License

MIT
