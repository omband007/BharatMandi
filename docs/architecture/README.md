# Architecture Documentation

System architecture, design decisions, and architectural diagrams for Bharat Mandi.

## Documentation

- [Architecture Comparison](ARCHITECTURE-COMPARISON.md) - Comparison of architectural approaches and decisions
- [Code Organization](CODE-ORGANIZATION.md) - How the codebase is structured
- [Vertical Slicing Guide](VERTICAL-SLICING-GUIDE.md) - Feature-based architecture approach
- [Vertical Slicing Migration](VERTICAL-SLICING-MIGRATION.md) - Migration to vertical slicing

## Diagrams

Visual representations of system architecture:

- [AWS Architecture](diagrams/AWS%20Architecture.png) - AWS infrastructure and services
- [Use Case Diagram](diagrams/Use%20Case.png) - System use cases and actors

## Architecture Principles

Bharat Mandi follows these architectural principles:

1. **Vertical Slicing**: Feature-based organization for better modularity
2. **Dual Database**: PostgreSQL for production, SQLite for offline/development
3. **Cloud-Native**: AWS services for scalability and reliability
4. **Multi-Language**: i18n support for 11 Indian languages
5. **Offline-First**: Local caching and sync for rural connectivity

## Related Documentation

- [Database](../database/) - Database architecture and schemas
- [Infrastructure](../infrastructure/) - AWS and deployment architecture
- [Features](../features/) - Feature-specific architecture details

---

**For**: Architects, Senior Developers  
**Purpose**: Understanding system design and architectural decisions
