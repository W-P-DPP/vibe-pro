## ADDED Requirements

### Requirement: System SHALL load site menu data from `siteMenu.json`
The system SHALL use `siteMenu.json` as the source of truth for site menu structure and SHALL return menu data through the `siteMenu` module instead of reading the JSON file directly in the controller.

#### Scenario: Menu data is loaded through the module
- **WHEN** a client requests the site menu API
- **THEN** the controller SHALL call the `siteMenu` service
- **THEN** the service SHALL obtain menu data from the repository
- **THEN** the repository SHALL read menu data from `siteMenu.json`

### Requirement: System SHALL validate and normalize the menu tree before responding
The system SHALL validate the structure of each menu node before returning data, including required fields, recursive `children` shape, and output consistency.

#### Scenario: Valid menu structure is normalized
- **WHEN** `siteMenu.json` contains valid top-level and child menu nodes
- **THEN** the service SHALL validate every node recursively
- **THEN** the service SHALL return a normalized menu tree with stable field names and array-based `children`

#### Scenario: Invalid menu structure is rejected
- **WHEN** `siteMenu.json` contains a node missing required fields or containing invalid `children`
- **THEN** the service SHALL reject the menu payload as invalid
- **THEN** the API SHALL return a controlled failure response instead of leaking raw parsing or runtime errors

### Requirement: System SHALL preserve the existing menu query capability
The system SHALL keep the existing menu query capability available to current callers while the implementation is migrated to a module router.

#### Scenario: Existing menu route remains available
- **WHEN** a client requests the existing menu endpoint
- **THEN** the system SHALL return a successful response with the structured menu payload
- **THEN** the endpoint SHALL remain wired through the `siteMenu` module instead of direct controller file access

### Requirement: System SHALL provide test coverage for menu query behavior
The system SHALL include automated tests for successful menu retrieval and invalid menu structure handling.

#### Scenario: Successful menu query is covered by tests
- **WHEN** automated integration tests run
- **THEN** the test suite SHALL verify the menu endpoint status code, response wrapper, and menu payload structure

#### Scenario: Invalid menu data handling is covered by tests
- **WHEN** automated unit or integration tests simulate invalid menu data
- **THEN** the test suite SHALL verify that the system returns a controlled failure path
