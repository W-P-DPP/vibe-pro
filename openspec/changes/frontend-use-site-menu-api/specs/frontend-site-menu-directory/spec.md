## ADDED Requirements

### Requirement: Frontend SHALL render directory data from backend siteMenu API
The system SHALL use `GET /api/site-menu/getMenu` as the primary data source for the frontend directory, and SHALL render both the sidebar directory and homepage card sections from the returned menu data.

#### Scenario: Render directory after successful request
- **WHEN** the frontend successfully requests `GET /api/site-menu/getMenu`
- **THEN** the sidebar SHALL render the returned top-level menu groups
- **THEN** the homepage SHALL render the corresponding grouped directory cards from the same response

### Requirement: Frontend SHALL adapt backend menu fields into current directory presentation model
The system SHALL convert backend menu nodes into the frontend directory presentation model, so that the current UI can continue rendering section names, icons, notes, summaries, and link targets without relying on hard-coded local menu content.

#### Scenario: Map top-level and child menu nodes
- **WHEN** the backend returns top-level menu nodes with child menu nodes
- **THEN** each top-level node SHALL be treated as one directory section
- **THEN** each child node SHALL be treated as one directory item under that section
- **THEN** missing descriptive text SHALL use controlled fallback text instead of breaking the UI

### Requirement: Frontend SHALL provide controlled menu loading, empty, and error states
The system SHALL provide explicit UI feedback for the menu request lifecycle so that the directory page remains understandable when menu data is loading, empty, or unavailable.

#### Scenario: Menu request is loading
- **WHEN** the frontend is waiting for `GET /api/site-menu/getMenu`
- **THEN** the directory page SHALL show a visible loading state

#### Scenario: Menu request fails
- **WHEN** the frontend request for `GET /api/site-menu/getMenu` fails
- **THEN** the directory page SHALL show a controlled error message
- **THEN** the page SHALL NOT crash or render raw runtime errors

#### Scenario: Menu request returns no available directory items
- **WHEN** the frontend receives an empty menu result
- **THEN** the directory page SHALL show an explicit empty state

### Requirement: Frontend SHALL preserve menu entry opening behavior after API integration
The system SHALL preserve the existing entry opening behavior after switching to backend-driven menu data.

#### Scenario: Open external menu entry
- **WHEN** a menu item's `path` is an `http` or `https` address and the user clicks it
- **THEN** the frontend SHALL open the target as an external entry

#### Scenario: Open non-external menu entry
- **WHEN** a menu item's `path` is not an `http` or `https` address and the user clicks it
- **THEN** the frontend SHALL keep using the current non-external entry handling strategy instead of treating it as an external URL
