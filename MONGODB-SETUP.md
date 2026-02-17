# MongoDB Setup Guide

This guide will help you set up MongoDB for the Bharat Mandi platform.

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)

## Step 1: Install MongoDB

### Windows

**Option 1: Official Installer (Recommended)**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer (mongodb-windows-x86_64-X.X.X-signed.msi)
3. During installation:
   - Choose "Complete" installation
   - Install MongoDB as a Service (recommended)
   - Install MongoDB Compass (GUI tool)
   - Default data directory: `C:\Program Files\MongoDB\Server\X.X\data`
   - Default log directory: `C:\Program Files\MongoDB\Server\X.X\log`

**Option 2: Using Chocolatey**
```powershell
choco install mongodb
```

### macOS

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

### Linux (Ubuntu/Debian)

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Step 2: Verify MongoDB Installation

### Windows

```powershell
# Check if MongoDB service is running
Get-Service -Name "MongoDB"

# Connect to MongoDB shell
mongosh
```

### macOS/Linux

```bash
# Check if MongoDB is running
brew services list | grep mongodb  # macOS
sudo systemctl status mongod       # Linux

# Connect to MongoDB shell
mongosh
```

### In MongoDB Shell

```javascript
// Check MongoDB version
db.version()

// Show databases
show dbs

// Exit
exit
```

## Step 3: Configure Environment Variables

Your `.env` file should already have MongoDB configuration. Verify it contains:

```env
MONGODB_URI=mongodb://localhost:27017/bharat_mandi
```

## Step 4: Install Node.js Dependencies

```bash
npm install mongoose @types/mongoose
```

## Step 5: Setup MongoDB Collections and Indexes

```bash
# Setup collections and create indexes
npm run mongodb:setup

# Test MongoDB connection
npm run mongodb:test

# View collection statistics
npm run mongodb:stats
```

Expected output for setup:
```
=== MongoDB Setup ===

Testing MongoDB connection...
✓ MongoDB connected successfully
✓ MongoDB ping successful: { ok: 1 }

Creating indexes...
Creating MongoDB indexes...
✓ All MongoDB indexes created successfully

Collection Statistics:
{
  "photoLogs": 0,
  "qualityCertificates": 0,
  "pricePredictions": 0,
  "voiceQueries": 0,
  "feedbackComments": 0,
  "diseaseDiagnoses": 0,
  "soilTestReports": 0,
  "smartAlerts": 0,
  "traceabilityRecords": 0,
  "adListings": 0
}

=== MongoDB Setup Complete ===
```

## MongoDB Collections

The following collections will be created:

1. **photo_logs** - Farming activity photos with GPS and timestamps
2. **quality_certificates** - Digital quality certificates from AI grading
3. **price_predictions** - Price forecasts for produce
4. **voice_queries** - Voice assistant query history
5. **feedback_comments** - Detailed user feedback and responses
6. **disease_diagnoses** - Crop disease diagnoses with treatments
7. **soil_test_reports** - Soil health test results
8. **smart_alerts** - Weather, pest, price, and other alerts
9. **traceability_records** - End-to-end produce traceability
10. **ad_listings** - Voice-to-ad generated listings

## Troubleshooting

### Issue: "mongosh: command not found"

**Windows:**
Add MongoDB bin directory to PATH:
1. Find MongoDB installation (usually `C:\Program Files\MongoDB\Server\7.0\bin`)
2. Add to System Environment Variables PATH
3. Restart terminal

**macOS:**
```bash
echo 'export PATH="/usr/local/opt/mongodb-community/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Linux:**
```bash
sudo ln -s /usr/bin/mongosh /usr/local/bin/mongosh
```

### Issue: "Connection refused"

1. Check if MongoDB is running:
```bash
# Windows
Get-Service -Name "MongoDB"

# macOS
brew services list

# Linux
sudo systemctl status mongod
```

2. Start MongoDB if not running:
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community@7.0

# Linux
sudo systemctl start mongod
```

### Issue: "MongoServerError: Authentication failed"

If you set up authentication, update your `.env`:
```env
MONGODB_URI=mongodb://username:password@localhost:27017/bharat_mandi
```

### Issue: "Cannot connect to MongoDB"

1. Check MongoDB is listening on port 27017:
```bash
netstat -an | findstr 27017  # Windows
netstat -an | grep 27017     # macOS/Linux
```

2. Check MongoDB configuration file:
```bash
# Windows: C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg
# macOS: /usr/local/etc/mongod.conf
# Linux: /etc/mongod.conf
```

Ensure `bindIp` is set to `127.0.0.1` or `0.0.0.0`

### Issue: Setup script fails

1. Ensure MongoDB is running
2. Check connection string in `.env`
3. Try connecting manually:
```bash
mongosh mongodb://localhost:27017/bharat_mandi
```

## MongoDB Management Commands

### Setup Collections
```bash
npm run mongodb:setup
```

### Test Connection
```bash
npm run mongodb:test
```

### View Statistics
```bash
npm run mongodb:stats
```

### Using MongoDB Compass (GUI)

1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Select database: `bharat_mandi`
4. View collections and documents

### Using MongoDB Shell

```bash
# Connect to database
mongosh mongodb://localhost:27017/bharat_mandi

# Show collections
show collections

# Query a collection
db.photo_logs.find().pretty()

# Count documents
db.quality_certificates.countDocuments()

# Create index manually
db.photo_logs.createIndex({ farmerId: 1, timestamp: -1 })

# Drop a collection (careful!)
db.photo_logs.drop()

# Exit
exit
```

## Database Backup and Restore

### Backup Database
```bash
mongodump --db bharat_mandi --out ./backup
```

### Restore Database
```bash
mongorestore --db bharat_mandi ./backup/bharat_mandi
```

### Export Collection to JSON
```bash
mongoexport --db bharat_mandi --collection photo_logs --out photo_logs.json
```

### Import Collection from JSON
```bash
mongoimport --db bharat_mandi --collection photo_logs --file photo_logs.json
```

## Performance Tips

1. **Indexes**: All collections have appropriate indexes created automatically
2. **Connection Pooling**: Configured with min 5, max 10 connections
3. **Query Optimization**: Use indexes for frequently queried fields
4. **Document Size**: Keep documents under 16MB (MongoDB limit)
5. **Projection**: Only fetch required fields to reduce network overhead

## Schema Overview

All schemas include:
- **Automatic timestamps** (createdAt, updatedAt)
- **Indexes** on frequently queried fields
- **Validation** using Mongoose schemas
- **Enum constraints** for status fields
- **Required field validation**

See `src/database/mongodb-schemas.ts` for detailed schema definitions.

## Next Steps

After successful MongoDB setup:

1. Both PostgreSQL and MongoDB are now configured
2. Start the development server: `npm run dev`
3. The server will connect to both databases automatically
4. Check console for connection success messages

## Integration with Application

MongoDB models are exported from `src/database/mongodb-models.ts`:

```typescript
import {
  PhotoLogModel,
  QualityCertificateModel,
  DiseaseDiagnosisModel,
  // ... other models
} from './database/mongodb-models';

// Create a photo log entry
const photoLog = await PhotoLogModel.create({
  farmerId: 'farmer-123',
  imageUrl: 'https://...',
  category: 'HARVEST',
  location: { lat: 28.7041, lng: 77.1025 },
  timestamp: new Date()
});

// Query photo logs
const logs = await PhotoLogModel
  .find({ farmerId: 'farmer-123' })
  .sort({ timestamp: -1 })
  .limit(10);
```
