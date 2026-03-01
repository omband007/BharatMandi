# Database Documentation

Complete database documentation including setup, schemas, and ER diagrams.

## Documentation

- [Database Documentation](DATABASE-DOCUMENTATION.md) - Complete database reference
- [Database Setup](DATABASE-SETUP.md) - Setup instructions for PostgreSQL and SQLite
- [Database Summary](DATABASE-SUMMARY.md) - Quick overview of database structure
- [Database ER Diagrams](DATABASE-ER-DIAGRAMS.md) - Entity-relationship diagrams
- [Dual Database Setup](DUAL-DATABASE-SETUP.md) - PostgreSQL + SQLite configuration
- [MongoDB Setup](MONGODB-SETUP.md) - MongoDB configuration (if needed)

## Database Architecture

Bharat Mandi uses a dual-database architecture:

### PostgreSQL (Production)
- Primary database for production environment
- Handles all transactional data
- Supports complex queries and relationships
- Used for marketplace, transactions, user management

### SQLite (Offline/Development)
- Local database for offline functionality
- Development and testing
- Sync queue for offline-to-online data transfer
- Enables rural connectivity scenarios

## Quick Start

1. **Development Setup**: Follow [DATABASE-SETUP.md](DATABASE-SETUP.md)
2. **Dual Database**: Configure both databases using [DUAL-DATABASE-SETUP.md](DUAL-DATABASE-SETUP.md)
3. **Schema Reference**: Check [DATABASE-ER-DIAGRAMS.md](DATABASE-ER-DIAGRAMS.md)

## Related Documentation

- [Architecture](../architecture/) - Overall system architecture
- [Testing](../testing/) - Database testing guides
- [Infrastructure](../infrastructure/) - Database deployment

---

**For**: Backend Developers, DBAs, DevOps  
**Purpose**: Database setup, schemas, and management
