# Authentication

User authentication and authorization system for Bharat Mandi.

## Features

- JWT-based authentication
- Role-based access control (RBAC)
- User registration and login
- Password hashing and security
- Session management
- Token refresh mechanism

## Documentation

- [Auth API Guide](AUTH-API-GUIDE.md) - Complete authentication API reference

## Authentication Flow

1. **Registration**: User creates account with phone/email
2. **Login**: User authenticates with credentials
3. **Token Issuance**: JWT token issued on successful login
4. **Authorization**: Token validated on protected endpoints
5. **Refresh**: Token refresh for extended sessions

## User Roles

- **Farmer**: Can create listings, grade produce, sell products
- **Buyer**: Can browse marketplace, purchase products
- **Admin**: Full system access and management

## API Endpoints

See [AUTH-API-GUIDE.md](AUTH-API-GUIDE.md) for complete API documentation.

## Security

- Passwords hashed with bcrypt
- JWT tokens with expiration
- HTTPS required in production
- Rate limiting on auth endpoints

## Related Documentation

- [Marketplace](../marketplace/) - Uses authentication for transactions
- [Standards/Security](../../standards/security/) - Security standards

## Related Specs

See `.kiro/specs/features/auth/` for requirements, design, and tasks.

---

**For**: Backend Developers, Security Engineers  
**Purpose**: Authentication and authorization implementation
