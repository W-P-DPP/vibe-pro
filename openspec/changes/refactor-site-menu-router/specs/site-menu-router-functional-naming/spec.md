## ADDED Requirements

### Requirement: siteMenu router SHALL use function-oriented router naming
The system SHALL require `general-server/src/siteMenu/siteMenu.router.ts` to organize and name router instances according to interface function, instead of keeping all routes flat on a generic or weakly-expressive router structure.

#### Scenario: Name router groups by interface function
- **WHEN** `siteMenu.router.ts` declares menu query routes and menu write routes
- **THEN** the router instances or route groupings SHALL use names that directly reflect their function
- **THEN** the implementation SHALL NOT use non-semantic names such as `tempRouter`, `router1`, or other names that do not describe the route function

### Requirement: siteMenu router SHALL keep external paths stable while refactoring internal naming
The system SHALL preserve the current external `siteMenu` API paths while the internal router structure is refactored for clearer function-oriented naming.

#### Scenario: Keep siteMenu CRUD paths available
- **WHEN** `siteMenu.router.ts` is refactored
- **THEN** `GET /api/site-menu`, `GET /api/site-menu/:id`, `POST /api/site-menu`, `PUT /api/site-menu/:id`, and `DELETE /api/site-menu/:id` SHALL remain available
- **THEN** the route behavior SHALL remain compatible with the current controller contract

### Requirement: Compatible query entry SHALL be explicitly represented in router structure
The system SHALL keep the existing menu compatibility query entry through an explicitly named query route declaration, rather than leaving it implicit or mixed into non-semantic route definitions.

#### Scenario: Preserve getMenu compatibility route with clear query semantics
- **WHEN** the system preserves `GET /api/getMenu`
- **THEN** the compatibility route SHALL be declared through a clearly query-oriented router structure or route name
- **THEN** the declaration SHALL remain understandable from the router file without requiring inference from unrelated CRUD route definitions
