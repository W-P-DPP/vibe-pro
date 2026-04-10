## ADDED Requirements

### Requirement: System SHALL support importing siteMenu from an uploaded menu file
The system SHALL provide a menu file upload API for the `siteMenu` business domain, and SHALL use the uploaded file content to replace the current menu tree.

#### Scenario: Import menu file successfully
- **WHEN** a client uploads a valid menu JSON file to `POST /api/site-menu/uploadMenuFile`
- **THEN** the system SHALL replace the current site menu data with the uploaded menu content
- **THEN** the system SHALL return a Chinese success message

### Requirement: System SHALL keep menu seed file and database menu data in sync after import
The system SHALL synchronize both the runtime menu table and the local `siteMenu.json` seed file after a successful import.

#### Scenario: Sync database and seed file after import
- **WHEN** a valid menu file import succeeds
- **THEN** the `sys_site_menu` table SHALL reflect the uploaded menu content
- **THEN** `general-server/siteMenu.json` SHALL also be updated to the same menu structure

### Requirement: System SHALL reject invalid uploaded menu files with controlled Chinese errors
The system SHALL validate uploaded menu files and SHALL return controlled Chinese responses instead of raw parser or runtime errors.

#### Scenario: File is missing
- **WHEN** a client calls `POST /api/site-menu/uploadMenuFile` without a file
- **THEN** the system SHALL return a controlled Chinese error response

#### Scenario: File content is not valid menu JSON
- **WHEN** a client uploads a file whose content is not a valid menu JSON array
- **THEN** the system SHALL return a controlled Chinese error response

#### Scenario: File node structure is invalid
- **WHEN** a client uploads a JSON file with invalid menu node fields
- **THEN** the system SHALL return a controlled Chinese error response
