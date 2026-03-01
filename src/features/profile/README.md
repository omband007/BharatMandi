# Profile Management Feature

Progressive Profile Management system for Bharat Mandi that enables minimal-friction registration and builds comprehensive user profiles through contextual prompts and implicit data collection.

## Features

- **Minimal Registration**: Mobile number + OTP only
- **Progressive Data Collection**: Contextual prompts during natural interactions
- **Implicit Updates**: Automatic profile enrichment from user behavior
- **Gamification**: Points, membership tiers (Bronze/Silver/Gold/Platinum), referrals
- **Trust Scoring**: 0-100 scale based on user behaviors
- **Privacy Controls**: User-controlled visibility for all profile fields

## Directory Structure

```
profile/
├── constants/          # Business logic constants
│   └── profile.constants.ts
├── models/            # Database schemas and models
│   ├── profile.schema.ts
│   └── profile.model.ts
├── services/          # Business logic services
│   ├── registration.service.ts
│   ├── profile-manager.service.ts
│   ├── contextual-prompt.service.ts
│   ├── implicit-update.service.ts
│   ├── gamification.service.ts
│   └── trust-score.service.ts
├── routes/            # API endpoints
│   └── profile.routes.ts
├── types/             # TypeScript type definitions
│   └── profile.types.ts
└── README.md
```

## Key Concepts

### Profile Completeness
Weighted calculation based on filled fields:
- Mobile: 10%, Name: 15%, Location: 20%, User Type: 15%
- Crops: 15%, Language: 10%, Farm Size: 10%, Bank: 5%, Picture: 5%

### Membership Tiers
- Bronze: 0 points (default)
- Silver: 500 points
- Gold: 2,000 points
- Platinum: 5,000 points

### Trust Score
- Initial: 50
- Range: 0-100
- Increases: Profile completion, GPS verification, successful transactions, positive feedback
- Decreases: Negative feedback, transaction cancellations, disputes

## Getting Started

See the implementation tasks in `.kiro/specs/features/progressive-profile-management/tasks.md`

## Related Documentation

- Requirements: `.kiro/specs/features/progressive-profile-management/requirements.md`
- Design: `.kiro/specs/features/progressive-profile-management/design.md`
- Tasks: `.kiro/specs/features/progressive-profile-management/tasks.md`
