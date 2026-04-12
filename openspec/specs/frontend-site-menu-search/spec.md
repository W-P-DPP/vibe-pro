# frontend-site-menu-search Specification

## Purpose
TBD - created by archiving change menu-search-and-hidden-site-menu. Update Purpose after archive.
## Requirements
### Requirement: Frontend template SHALL let users open a header menu search panel
The frontend template SHALL make the content header search icon interactive. When the user clicks the icon, the system SHALL show a search input panel anchored in the header and SHALL allow the user to close or clear the panel without reloading the page.

#### Scenario: Click header icon to open search
- **WHEN** a user clicks the search icon in the content header
- **THEN** the system SHALL display a menu search input panel in the header area

#### Scenario: Close search panel without reload
- **WHEN** a user clears or closes the menu search panel
- **THEN** the system SHALL hide the panel and SHALL keep the current page state unchanged

### Requirement: Frontend template SHALL perform fuzzy menu search on the client
The frontend template SHALL search the already loaded menu data on the client side and SHALL render matching menu results below the search input while the user is typing. Matching SHALL use menu fields that help locate entries, including menu name and other displayed metadata.

#### Scenario: Typing shows matching results
- **WHEN** a user enters a non-empty keyword into the header search input
- **THEN** the system SHALL perform fuzzy matching on the client side
- **THEN** the system SHALL render matching menu results below the input without calling a search API

#### Scenario: No match shows empty feedback
- **WHEN** a user enters a keyword that matches no searchable menu entry
- **THEN** the system SHALL show a clear empty result state in the search panel

### Requirement: Frontend template SHALL keep hidden menus out of normal search results by default
The frontend template SHALL treat menu entries with `hide=true` as hidden entries. Hidden entries SHALL NOT appear in the normal sidebar directory, normal content directory, or ordinary search results unless the configured unlock keyword is matched.

#### Scenario: Hidden menu excluded from ordinary search
- **WHEN** a user searches with a keyword that does not match the configured unlock keyword
- **THEN** the system SHALL exclude menu entries whose `hide` field is `true` from the rendered search results

### Requirement: Frontend template SHALL unlock hidden menu search results through an environment-configured keyword
The frontend template SHALL read the hidden-menu unlock keyword from the `VITE_SITE_MENU_HIDDEN_KEYWORD` environment variable. When the normalized search input exactly matches that configured keyword, the system SHALL include hidden menu entries in the displayed search results.

#### Scenario: Default keyword unlocks hidden entries
- **WHEN** the configured unlock keyword is `dpp` and the user enters `dpp`
- **THEN** the system SHALL include hidden menu entries in the search results

#### Scenario: Keyword matching is configuration-driven
- **WHEN** the configured unlock keyword value changes through the frontend environment variable
- **THEN** the system SHALL use the new configured value as the hidden-menu unlock keyword without requiring component code changes

### Requirement: Frontend template SHALL let users open matched menu entries from search results
The frontend template SHALL make each search result directly actionable and SHALL reuse the existing menu-open behavior for matched entries, including current `strict` menu handling.

#### Scenario: Open matched visible menu
- **WHEN** a user clicks a visible menu item in the search results
- **THEN** the system SHALL open that menu entry with the same behavior used by the directory cards

#### Scenario: Open matched hidden menu after unlock
- **WHEN** a user clicks a hidden menu item shown after unlock keyword matching
- **THEN** the system SHALL open that menu entry with the same behavior used by the directory cards

