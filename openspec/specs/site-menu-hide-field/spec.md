# site-menu-hide-field Specification

## Purpose
TBD - created by archiving change menu-search-and-hidden-site-menu. Update Purpose after archive.
## Requirements
### Requirement: System SHALL persist a boolean hide field on site menu records
The system SHALL add a `hide` boolean field to the `siteMenu` data model and SHALL persist it with menu records in the database.

#### Scenario: Persist hide on menu records
- **WHEN** a site menu record is created or read from the database
- **THEN** the system SHALL include the `hide` field as a boolean value on the menu record

### Requirement: System SHALL expose hide in site menu query responses
The system SHALL include the `hide` field in site menu list and detail responses so callers can read the current hidden state of each menu entry.

#### Scenario: Query menu tree with hide
- **WHEN** a client requests `GET /api/site-menu/getMenu`
- **THEN** the system SHALL return each menu node with a boolean `hide` field

#### Scenario: Query menu detail with hide
- **WHEN** a client requests `GET /api/site-menu/getMenu/:id` for an existing menu id
- **THEN** the system SHALL return the matching menu detail with a boolean `hide` field

### Requirement: System SHALL keep hidden menu nodes available in query data
The system SHALL keep menu nodes whose `hide` field is `true` in the query payload so frontend clients can decide whether and when to render them.

#### Scenario: Hidden menu remains in returned tree
- **WHEN** a stored menu node has `hide=true`
- **THEN** the system SHALL still include that node in the `GET /api/site-menu/getMenu` response
- **THEN** the system SHALL mark the node's `hide` field as `true`

### Requirement: System SHALL support hide in create and update menu requests
The system SHALL allow callers to set `hide` through site menu create and update APIs, and SHALL validate that the field is boolean when provided.

#### Scenario: Create menu with explicit hide
- **WHEN** a client requests `POST /api/site-menu/createMenu` with a valid boolean `hide`
- **THEN** the system SHALL persist that `hide` value on the created menu record

#### Scenario: Update menu hide
- **WHEN** a client requests `PUT /api/site-menu/updateMenu/:id` with a valid boolean `hide`
- **THEN** the system SHALL update the menu record with the provided `hide` value

#### Scenario: Reject invalid hide type
- **WHEN** a client sends a create or update request with a non-boolean `hide`
- **THEN** the system SHALL reject the request with a controlled Chinese error response

### Requirement: System SHALL keep hide backward compatible for existing site menu data
The system SHALL remain compatible with existing menu data and existing create requests that do not define `hide`, and SHALL default the value to `false` in those cases.

#### Scenario: Existing create request omits hide
- **WHEN** a client requests `POST /api/site-menu/createMenu` without a `hide` field
- **THEN** the system SHALL create the menu record with `hide` set to `false`

#### Scenario: Existing stored or seeded menu omits hide
- **WHEN** an existing menu record or seed node does not define `hide`
- **THEN** the system SHALL treat that menu entry's `hide` value as `false`

### Requirement: System SHALL preserve hide through site menu file import
The system SHALL parse, validate, and persist `hide` values from menu seed and import sources so imported menu data keeps the field consistently.

#### Scenario: Import menu file with hide
- **WHEN** a client uploads a valid site menu JSON file containing boolean `hide` values
- **THEN** the system SHALL persist those `hide` values in the imported menu records

#### Scenario: Import menu file without hide
- **WHEN** a menu seed node or uploaded menu file node omits `hide`
- **THEN** the system SHALL import that node with `hide` set to `false`

