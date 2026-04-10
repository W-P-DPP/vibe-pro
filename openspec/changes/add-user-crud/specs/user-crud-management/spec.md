## ADDED Requirements

### Requirement: System SHALL provide a full user module with layered backend structure
The system SHALL add a `user` business module and SHALL implement it with `entity/controller/dto/repository/router/service` files according to the current backend layering rules.

#### Scenario: Create user module structure
- **WHEN** the user feature is added to `general-server`
- **THEN** the system SHALL include `user.entity.ts`, `user.controller.ts`, `user.dto.ts`, `user.repository.ts`, `user.router.ts`, and `user.service.ts`
- **THEN** the module SHALL keep responsibilities separated by layer

### Requirement: System SHALL provide a database-backed user entity
The system SHALL define a database-backed user entity and SHALL require the user entity to inherit from the project's `BaseEntity`.

#### Scenario: Define user entity
- **WHEN** the user module is implemented
- **THEN** `user.entity.ts` SHALL define the user table mapping
- **THEN** the user entity SHALL inherit from `C:\\Users\\admin\\Desktop\\my\\super-pro\\general-server\\utils\\entities\\base.entity.ts`中的 `BaseEntity`

### Requirement: System SHALL expose user CRUD APIs with business prefix and action paths
The system SHALL provide user CRUD APIs under the `/user` business prefix and SHALL use action-based paths for list, detail, create, update, and delete operations.

#### Scenario: Query user list
- **WHEN** a client requests `GET /api/user/getUser`
- **THEN** the system SHALL return the user list with Chinese success text

#### Scenario: Query user detail
- **WHEN** a client requests `GET /api/user/getUser/:id` with an existing user id
- **THEN** the system SHALL return the matching user detail

#### Scenario: Create user
- **WHEN** a client requests `POST /api/user/createUser` with valid input
- **THEN** the system SHALL create a user record and return Chinese success text

#### Scenario: Update user
- **WHEN** a client requests `PUT /api/user/updateUser/:id` with valid input
- **THEN** the system SHALL update the corresponding user record

#### Scenario: Delete user
- **WHEN** a client requests `DELETE /api/user/deleteUser/:id` for an existing user id
- **THEN** the system SHALL delete the corresponding user record

### Requirement: System SHALL reject invalid user operations with controlled Chinese responses
The system SHALL validate user CRUD input and SHALL return controlled Chinese responses instead of raw runtime or database errors.

#### Scenario: Query non-existent user detail
- **WHEN** a client requests `GET /api/user/getUser/:id` for a non-existent user id
- **THEN** the system SHALL return a controlled Chinese error response

#### Scenario: Update non-existent user
- **WHEN** a client requests `PUT /api/user/updateUser/:id` for a non-existent user id
- **THEN** the system SHALL return a controlled Chinese error response

#### Scenario: Delete non-existent user
- **WHEN** a client requests `DELETE /api/user/deleteUser/:id` for a non-existent user id
- **THEN** the system SHALL return a controlled Chinese error response
