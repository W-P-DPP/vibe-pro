## ADDED Requirements

### Requirement: System SHALL persist site menu entities in `siteMenu.json`
The system SHALL treat `siteMenu.json` as the persistence source for `SiteMenuEntity` data, and the `siteMenu` module SHALL include an entity file whose entity model inherits from the project's `BaseEntity`.

#### Scenario: Menu entity tree is loaded from JSON
- **WHEN** the system reads the site menu store
- **THEN** the repository SHALL load `siteMenu.json` as a tree of menu entities
- **THEN** the `siteMenu` module SHALL expose the entity through `siteMenu.entity.ts`

### Requirement: System SHALL support querying site menu list and detail
The system SHALL provide both menu list query and single-node detail query while preserving the existing menu query capability.

#### Scenario: Existing menu list route remains available
- **WHEN** a client requests `GET /api/getMenu`
- **THEN** the system SHALL return the menu tree successfully
- **THEN** the response message and error message SHALL use Chinese

#### Scenario: Menu detail can be queried by id
- **WHEN** a client requests `GET /api/site-menu/:id` with an existing menu id
- **THEN** the system SHALL return the matching menu node detail

### Requirement: System SHALL support creating and updating menu nodes
The system SHALL allow clients to create new menu nodes and update existing menu nodes through DTO-validated requests.

#### Scenario: Create a top-level menu node
- **WHEN** a client submits a valid create request without `parentId`
- **THEN** the system SHALL create a new top-level menu node
- **THEN** the node SHALL be persisted back into `siteMenu.json`

#### Scenario: Create a child menu node
- **WHEN** a client submits a valid create request with an existing `parentId`
- **THEN** the system SHALL append the new node under the target parent
- **THEN** the persisted menu tree SHALL include the new child node

#### Scenario: Update an existing menu node
- **WHEN** a client submits a valid update request for an existing menu id
- **THEN** the system SHALL update the target node fields
- **THEN** the changes SHALL be persisted back into `siteMenu.json`

### Requirement: System SHALL support deleting a menu node and its subtree
The system SHALL allow deletion of a menu node and SHALL remove its descendant nodes together with it.

#### Scenario: Delete a top-level node
- **WHEN** a client deletes an existing top-level menu node
- **THEN** the system SHALL remove that node and all of its child nodes from `siteMenu.json`

#### Scenario: Delete a child node
- **WHEN** a client deletes an existing child menu node
- **THEN** the system SHALL remove that node and its subtree from the parent branch

### Requirement: System SHALL reject invalid CRUD operations with controlled Chinese responses
The system SHALL validate CRUD input and SHALL return controlled Chinese responses instead of leaking raw runtime or filesystem errors.

#### Scenario: Parent node does not exist
- **WHEN** a client tries to create a child node with a non-existent `parentId`
- **THEN** the system SHALL reject the request with a controlled Chinese error response

#### Scenario: Menu node does not exist
- **WHEN** a client updates or deletes a non-existent menu id
- **THEN** the system SHALL reject the request with a controlled Chinese error response

#### Scenario: Invalid payload is submitted
- **WHEN** a client submits invalid menu fields
- **THEN** the system SHALL reject the request with a controlled Chinese validation error response
