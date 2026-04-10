## ADDED Requirements

### Requirement: src/index.ts SHALL register module routers with business prefixes
The system SHALL require `general-server/src/index.ts` to register each module router with an explicit business prefix, and SHALL forbid direct bare mounting such as `router.use(xxxRouter)`.

#### Scenario: Register siteMenu router in entry file
- **WHEN** `siteMenu` router is imported into `general-server/src/index.ts`
- **THEN** the system SHALL register it with a business prefix such as `/site-menu`
- **THEN** the entry file SHALL NOT use bare mounting like `router.use(siteMenuRouter)`

### Requirement: Module routers SHALL define relative paths under their business prefix
The system SHALL require module router files to define routes relative to the business prefix assigned by `general-server/src/index.ts`, instead of duplicating the same business prefix inside the module router.

#### Scenario: Define siteMenu CRUD routes inside module router
- **WHEN** `siteMenu.router.ts` declares CRUD routes for the `siteMenu` module
- **THEN** the module router SHALL define relative paths such as `/` and `/:id`
- **THEN** the full external paths SHALL be composed by the `/site-menu` prefix in `general-server/src/index.ts`

### Requirement: Compatible semantic routes SHALL remain explicitly controlled
The system SHALL preserve necessary semantic compatibility routes through explicit route declarations, rather than relying on accidental exposure from bare-mounted routers.

#### Scenario: Preserve getMenu compatibility route
- **WHEN** the system needs to keep the existing menu query entry at `GET /api/getMenu`
- **THEN** the compatibility route SHALL be explicitly declared in the routing layer
- **THEN** route availability SHALL NOT depend on bare mounting behavior in `general-server/src/index.ts`
