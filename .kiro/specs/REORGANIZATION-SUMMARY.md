# Spec Reorganization Summary

## What Changed

Reorganized specs to mirror the `src/` code structure for better consistency and discoverability.

## New Structure

```
.kiro/specs/
├── README.md                           # Updated index
├── ORGANIZATION.md                     # Updated guide
├── REORGANIZATION-SUMMARY.md          # This file
│
├── bharat-mandi-main/                 # Renamed from bharat-mandi
│   ├── requirements.md                 # High-level 30 requirements only
│   ├── design.md                      # High-level architecture
│   ├── tasks.md                       # Links to feature tasks
│   └── CURRENT_STATE.md               # Progress tracker
│
├── features/                          # NEW - mirrors src/features/
│   ├── auth/                          # NEW
│   │   ├── requirements.md            # Auth-specific requirements
│   │   ├── design.md                  # Auth design
│   │   └── tasks.md                   # Auth tasks
│   │
│   ├── grading/                       # TODO - needs creation
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   │
│   ├── marketplace/                   # Moved from persist-listings-transactions
│   │   ├── requirements.md            # Listings + transactions persistence
│   │   ├── design.md
│   │   ├── tasks.md
│   │   ├── media-requirements.md      # From listing-media-support
│   │   ├── media-design.md
│   │   └── media-tasks.md
│   │
│   └── transactions/                  # TODO - could split from marketplace
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
│
└── shared/                            # NEW - mirrors src/shared/
    └── database/                      # Moved from database-sync-postgresql-sqlite
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

## Mapping Old → New

| Old Location | New Location | Notes |
|-------------|--------------|-------|
| `bharat-mandi/` | `bharat-mandi-main/` | Renamed for clarity |
| `database-sync-postgresql-sqlite/` | `shared/database/` | Mirrors src/shared/database/ |
| `persist-listings-transactions/` | `features/marketplace/` | Covers listings + transactions |
| `listing-media-support/` | `features/marketplace/media-*` | Media enhancement for marketplace |
| N/A | `features/auth/` | NEW - created for existing auth code |
| N/A | `features/grading/` | TODO - needs creation |
| N/A | `features/transactions/` | TODO - could split from marketplace |

## Benefits

✅ **1:1 Mapping**: Spec structure mirrors code structure exactly
- `src/features/auth/` → `.kiro/specs/features/auth/`
- `src/shared/database/` → `.kiro/specs/shared/database/`

✅ **Easy Discovery**: Find spec for any feature by following the same path
- Working on `src/features/marketplace/`? Check `.kiro/specs/features/marketplace/`

✅ **No Duplication**: Details only in feature specs, high-level in main spec

✅ **Clear Ownership**: Each feature has its own spec directory

✅ **Consistent Metadata**: All specs have YAML front-matter with:
- `parent_spec`: Links to main spec
- `implements_requirements`: Which main requirements
- `depends_on`: Dependencies on other specs
- `status`: complete | in-progress | ready
- `type`: feature | infrastructure | enhancement
- `code_location`: Path to implementation code

## Code Location Links

Every spec now includes `code_location` in metadata and links, making it easy to jump between spec and code:

```markdown
---
code_location: src/features/auth/
---

**Code Location:** `src/features/auth/`
```

## Next Steps

### Immediate
1. ✅ Move files to new structure
2. ✅ Create auth spec
3. ⏳ Update README.md with new structure
4. ⏳ Update ORGANIZATION.md
5. ⏳ Update bharat-mandi-main to be high-level only

### Soon
1. Create grading spec for `src/features/grading/`
2. Consider splitting transactions from marketplace
3. Create specs for other features as they're implemented

## Migration Notes

### For Developers
- Old spec links will break - update bookmarks
- Use new structure: `.kiro/specs/features/[feature-name]/`
- Check `code_location` in metadata to find implementation

### For Documentation
- Update all cross-references
- Update README with new paths
- Update CURRENT_STATE with new links

## Deleted Directories

The following old directories can be safely deleted after verification:
- `.kiro/specs/database-sync-postgresql-sqlite/` (moved to `shared/database/`)
- `.kiro/specs/persist-listings-transactions/` (moved to `features/marketplace/`)
- `.kiro/specs/listing-media-support/` (moved to `features/marketplace/media-*`)
- `.kiro/specs/bharat-mandi/` (renamed to `bharat-mandi-main/`)

## Questions?

- Check [README.md](./README.md) for updated index
- See [ORGANIZATION.md](./ORGANIZATION.md) for updated guide
- Review feature specs for examples of new structure
