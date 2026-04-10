## ADDED Requirements

### Requirement: System SHALL create a database-backed site menu model from `siteMenu.json`
The system SHALL convert the menu structure represented in `siteMenu.json` into a database-backed menu model and SHALL store `siteMenu` records in a database table instead of using the JSON file as the runtime source of truth.

#### Scenario: Table structure is created from menu schema
- **WHEN** the `siteMenu` module is initialized with database support
- **THEN** the system SHALL have a database table that covers the menu fields represented by `siteMenu.json`
- **THEN** parent-child hierarchy SHALL be represented by relational fields rather than runtime JSON persistence

#### Scenario: Existing JSON data is imported into the table
- **WHEN** the site menu table is empty
- **THEN** the system SHALL import the existing `siteMenu.json` data into the table
- **THEN** the imported records SHALL preserve menu hierarchy and ordering semantics

### Requirement: System SHALL expose a database entity for site menu
The `siteMenu` module SHALL include an entity file for the menu table, and the menu entity SHALL inherit from the project's `BaseEntity`.

#### Scenario: Menu entity is defined in the module
- **WHEN** the `siteMenu` module is implemented
- **THEN** `siteMenu.entity.ts` SHALL define the database entity for menu records
- **THEN** the menu entity SHALL inherit from `BaseEntity`

### Requirement: System SHALL support database-backed site menu queries
The system SHALL provide menu list and menu detail queries using database records while preserving the existing menu query entry points.

#### Scenario: Existing menu query route remains available
- **WHEN** a client requests `GET /api/getMenu`
- **THEN** the system SHALL return the site menu tree from the database
- **THEN** the response message SHALL be in Chinese

#### Scenario: Menu detail is queried by id
- **WHEN** a client requests `GET /api/site-menu/:id` with an existing menu id
- **THEN** the system SHALL return the matching menu node detail from the database

### Requirement: System SHALL support database-backed site menu create, update, and delete operations
The system SHALL allow clients to create, update, and delete menu nodes in the database using validated DTO input.

#### Scenario: Create a top-level menu
- **WHEN** a client submits a valid create request without `parentId`
- **THEN** the system SHALL insert a new top-level menu record into the table

#### Scenario: Create a child menu
- **WHEN** a client submits a valid create request with an existing `parentId`
- **THEN** the system SHALL insert a child menu record associated with the parent record

#### Scenario: Update a menu record
- **WHEN** a client submits a valid update request for an existing menu id
- **THEN** the system SHALL update the corresponding database record

#### Scenario: Delete a menu record
- **WHEN** a client deletes an existing menu id
- **THEN** the system SHALL delete that menu record and apply the defined subtree deletion behavior

### Requirement: System SHALL reject invalid menu operations with controlled Chinese responses
The system SHALL validate database-backed menu operations and SHALL return controlled Chinese responses instead of leaking raw database or runtime errors.

#### Scenario: Parent menu does not exist
- **WHEN** a client creates or updates a menu with a non-existent `parentId`
- **THEN** the system SHALL reject the request with a controlled Chinese error response

#### Scenario: Menu record does not exist
- **WHEN** a client updates or deletes a non-existent menu id
- **THEN** the system SHALL reject the request with a controlled Chinese error response
