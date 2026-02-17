# Bharat Mandi - Database Architecture Summary

## Quick Reference

### Database Count
- **PostgreSQL**: 19 tables
- **MongoDB**: 10 collections
- **SQLite**: 10 tables
- **Total**: 39 data structures

### Setup Commands
```bash
# PostgreSQL
npm run db:setup

# MongoDB
npm run mongodb:setup

# SQLite
npm run sqlite:setup

# View stats
npm run mongodb:stats
npm run sqlite:stats
```

---

## Architecture Decision Rationale

### Why Three Databases?

#### PostgreSQL - The Transaction Engine
**Strengths**: ACID compliance, complex joins, referential integrity
**Use Cases**:
- Financial transactions (escrow, payments)
- User relationships (ratings, credibility)
- Auctions (real-time bidding)
- Government schemes (structured data)

**Critical Tables**:
- users, transactions, escrow_accounts
- ratings, credibility_scores
- auction_listings, bids

#### MongoDB - The Document Store
**Strengths**: Flexible schema, nested documents, write performance
**Use Cases**:
- Photo logs (growing activity lists)
- Quality certificates (rich analysis data)
- Disease diagnoses (variable treatments)
- Traceability (evolving activity chains)

**Critical Collections**:
- photo_logs, quality_certificates
- disease_diagnoses, traceability_records
- smart_alerts

#### SQLite - The Offline Cache
**Strengths**: Local storage, no server, fast reads
**Use Cases**:
- Offline browsing (cached listings)
- Sync queue (pending operations)
- Local photos (before upload)
- App settings

**Critical Tables**:
- pending_sync_queue, local_photo_logs
- cached_listings, offline_activities

---

## Key Relationships

### Core Transaction Flow
```
User (Farmer) → Listing → Transaction → Escrow → Rating → Credibility Score
```

### Auction Flow
```
Listing → Auction Listing → Bids → Winner → Transaction
```

### Logistics Flow
```
Transaction → Logistics Order → Vehicle Tracking → Delivery
```

### Dispute Flow
```
Transaction → Dispute → Evidence → Resolution
```

### Traceability Flow
```
Photo Logs → Quality Certificate → Traceability Record → Transaction
```

---

## Foreign Key Constraints

### Users Table (Central Hub)
- **Referenced by**:
  - listings (farmer_id)
  - transactions (farmer_id, buyer_id)
  - credibility_scores (farmer_id)
  - ratings (from_user_id, to_user_id)
  - auction_listings (farmer_id, current_highest_bidder)
  - bids (bidder_id)
  - storage_bookings (farmer_id)
  - scheme_applications (farmer_id)
  - disputes (initiated_by)
  - dispute_evidence (user_id)

### Transactions Table (Transaction Hub)
- **References**: listings, users (farmer, buyer)
- **Referenced by**:
  - escrow_accounts (transaction_id)
  - ratings (transaction_id)
  - logistics_orders (transaction_id)
  - disputes (transaction_id)

### Service Providers Table
- **Referenced by**:
  - logistics_orders (provider_id)
  - storage_bookings (provider_id)
  - route_optimizations (provider_id)

---

## Cascade Delete Rules

### ON DELETE CASCADE
- listings → transactions (delete transactions when listing deleted)
- users → listings (delete listings when farmer deleted)
- transactions → escrow_accounts (delete escrow when transaction deleted)
- transactions → ratings (delete ratings when transaction deleted)
- credibility_scores → credibility_score_history (delete history when score deleted)
- auction_listings → bids (delete bids when auction deleted)
- disputes → dispute_evidence (delete evidence when dispute deleted)

### ON DELETE SET NULL
- auction_listings.current_highest_bidder (set to NULL if bidder deleted)

---

## Indexes Strategy

### High-Traffic Queries
1. **User Lookups**: users(phone), users(type)
2. **Listing Search**: listings(produce_type, is_active)
3. **Transaction History**: transactions(farmer_id, buyer_id, status)
4. **Rating Queries**: ratings(to_user_id)
5. **Auction Monitoring**: auction_listings(status, end_time)

### Compound Indexes
1. **Photo Logs**: (farmerId, timestamp) - farmer's activity timeline
2. **Certificates**: (produceType, grade) - quality filtering
3. **Price Predictions**: (produceType, location, generatedAt) - forecast lookup
4. **Sync Queue**: (created_at) - FIFO processing

---

## Data Consistency Rules

### Transaction States
```
PENDING → ACCEPTED → PAYMENT_LOCKED → IN_TRANSIT → DELIVERED → COMPLETED
                                                              ↓
                                                          DISPUTED
```

### Escrow Rules
1. Funds locked when transaction status = PAYMENT_LOCKED
2. Funds released when status = COMPLETED
3. Funds frozen when status = DISPUTED

### Credibility Score Rules
1. Range: 300-900
2. Updated on transaction completion
3. History tracked with reason
4. Components: transaction_history (35%), payment_reliability (30%), farming_consistency (20%), produce_quality (15%)

### Rating Rules
1. Range: 0-5
2. Implicit rating (70%) + Explicit rating (30%)
3. Both parties can rate after transaction completion

---

## Sync Strategy (SQLite ↔ PostgreSQL/MongoDB)

### Sync Priority
1. **High**: Transactions, payments, escrow
2. **Medium**: Listings, ratings, certificates
3. **Low**: Photo logs, alerts, voice queries

### Conflict Resolution
1. **Server Wins**: Transaction states, payment status
2. **Client Wins**: Photo logs, user preferences
3. **Merge**: Activity logs (union)
4. **Manual**: Critical data mismatches

### Sync Queue Processing
```
1. Check network connectivity
2. Get pending items from sync_queue (FIFO)
3. Validate data format
4. Send to server (PostgreSQL/MongoDB)
5. On success: Remove from queue, mark as synced
6. On failure: Increment retry_count, log error
7. Max retries: 3 (then flag for manual review)
```

---

## Performance Optimization

### PostgreSQL
- Connection pooling (max 20 connections)
- Prepared statements for common queries
- Indexes on foreign keys
- Automatic timestamp updates via triggers
- VACUUM ANALYZE scheduled weekly

### MongoDB
- Connection pooling (min 5, max 10)
- Compound indexes for common queries
- Document size limit: 16MB
- Projection to fetch only required fields
- Aggregation pipeline for complex queries

### SQLite
- WAL mode for better concurrency
- Indexes on frequently queried columns
- VACUUM after bulk deletes
- Transaction batching for multiple operations
- Database size monitoring

---

## Security Measures

### PostgreSQL
- Encrypted connections (TLS)
- Parameterized queries (SQL injection prevention)
- Row-level security (future enhancement)
- Audit logging for sensitive operations

### MongoDB
- Encrypted connections
- Schema validation
- Field-level encryption for sensitive data
- Access control lists

### SQLite
- File-level encryption (SQLCipher in production)
- No sensitive data in plain text
- Secure file permissions
- Regular cleanup of old cache

---

## Backup Strategy

### PostgreSQL
```bash
# Daily backup
pg_dump -U postgres bharat_mandi > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres bharat_mandi < backup_20240101.sql
```

### MongoDB
```bash
# Daily backup
mongodump --db bharat_mandi --out ./backup

# Restore
mongorestore --db bharat_mandi ./backup/bharat_mandi
```

### SQLite
```bash
# Copy database file
cp data/offline.db data/offline_backup.db
```

---

## Monitoring & Maintenance

### Daily Tasks
- Monitor connection pool usage
- Check sync queue size
- Review error logs

### Weekly Tasks
- VACUUM PostgreSQL
- Review slow queries
- Clean old cached data in SQLite

### Monthly Tasks
- Analyze database growth
- Review and optimize indexes
- Archive old transactions
- Update statistics

---

## Database Size Estimates (Production)

### Year 1 Projections (10,000 active users)
- **PostgreSQL**: ~5 GB
  - Users: 10K rows (~10 MB)
  - Transactions: 100K rows (~500 MB)
  - Ratings: 100K rows (~200 MB)
  - Other tables: ~4 GB

- **MongoDB**: ~50 GB
  - Photo logs: 1M entries (~30 GB)
  - Certificates: 100K docs (~5 GB)
  - Other collections: ~15 GB

- **SQLite**: ~100 MB per device
  - Cached data: ~50 MB
  - Local photos: ~30 MB
  - Sync queue: ~20 MB

---

## Migration Path

### Current State (POC)
- In-memory database (memory-db.ts)
- Mock data for testing

### Phase 1 (Completed)
- PostgreSQL schema created
- MongoDB collections defined
- SQLite offline storage ready

### Phase 2 (Next)
- Migrate existing services to use PostgreSQL
- Implement MongoDB for photo logs
- Add offline sync functionality

### Phase 3 (Future)
- Add replication for PostgreSQL
- Implement MongoDB sharding
- Add Redis for caching

---

## Quick Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if running
pg_isready

# Restart service
net start postgresql-x64-18  # Windows
```

### MongoDB Connection Issues
```bash
# Check if running
Get-Service -Name "MongoDB"

# Restart service
net start MongoDB  # Windows
```

### SQLite Issues
```bash
# Check database integrity
sqlite3 data/offline.db "PRAGMA integrity_check;"

# Vacuum database
npm run sqlite:setup
```

---

## Documentation Files

1. **DATABASE-DOCUMENTATION.md** - Complete table documentation
2. **DATABASE-ER-DIAGRAMS.md** - Visual relationship diagrams
3. **DATABASE-SUMMARY.md** - This file (quick reference)
4. **src/database/README.md** - PostgreSQL specific docs
5. **src/database/MONGODB-README.md** - MongoDB specific docs
6. **src/database/SQLITE-README.md** - SQLite specific docs
7. **DATABASE-SETUP.md** - Installation guide
8. **MONGODB-SETUP.md** - MongoDB installation guide

---

## Next Steps

1. ✓ Database schemas created
2. ✓ Migrations executed
3. ✓ Indexes created
4. → Migrate existing services to use databases
5. → Implement authentication system
6. → Add data validation layers
7. → Implement sync functionality
8. → Add monitoring and logging

