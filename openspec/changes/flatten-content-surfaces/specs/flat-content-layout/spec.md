## ADDED Requirements

### Requirement: Content area uses edge-aligned layout
The homepage content area SHALL avoid decorative outer margins and SHALL align its sections directly within the main application content region.

#### Scenario: Main content fills the available shell region
- **WHEN** a user opens the homepage on desktop
- **THEN** the main content area SHALL not appear as a centered card with extra outer margin
- **AND** section groups SHALL align directly within the `SidebarInset` content region

#### Scenario: Mobile layout stays edge-aligned
- **WHEN** a user opens the homepage on a narrow viewport
- **THEN** the content area SHALL remain single-column
- **AND** the page SHALL avoid restoring decorative outer gutters that reintroduce card-style framing

### Requirement: Content containers are flat surfaces
The homepage section containers and entry items SHALL render without rounded corners and without shadow elevation in both light and dark themes.

#### Scenario: Section group renders without rounded card styling
- **WHEN** a section group such as `置顶`, `git`, `工具`, or `应用` is displayed
- **THEN** its container SHALL not use rounded corners
- **AND** its container SHALL not use drop shadows or elevation shadows

#### Scenario: Entry item renders as flat row or flat block
- **WHEN** an entry item is rendered inside a section group
- **THEN** the item SHALL not use rounded corners
- **AND** the item SHALL not use shadow-based hover elevation

### Requirement: Hierarchy comes from structure rather than decoration
The homepage SHALL preserve scanability after flattening by using alignment, borders, separators, headings, and spacing instead of decorative card effects.

#### Scenario: User distinguishes section boundaries without shadows
- **WHEN** a user scans the homepage content groups
- **THEN** section boundaries SHALL remain clear through borders, separators, headings, or background contrast
- **AND** the UI SHALL not rely on shadows as the primary grouping signal

#### Scenario: Themes remain visually consistent after flattening
- **WHEN** a user switches between light and dark themes
- **THEN** both themes SHALL preserve the same flat-surface layout language
- **AND** neither theme SHALL reintroduce rounded card containers or elevated shadows for homepage content surfaces
