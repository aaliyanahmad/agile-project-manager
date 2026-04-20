# Users Module

## 📌 Overview

The Users module manages user profile and preferences. It provides endpoints for users to update their profile information and UI preferences like theme selection. This module is relatively simple, primarily supporting user personalization features.

**Key Responsibilities:**
- Store user profile information
- Manage user preferences (theme)
- Retrieve user details
- Update user settings
- Support theme preferences (light/dark mode)

## 🏗 Architecture

### Design Pattern
- **Service-Repository Pattern**: UserService handles business logic
- **Minimal Module**: Focused mainly on preferences
- **User Entity**: Extends from Auth module's user entity

### Key Design Decisions
1. **Preference Storage**: User preferences stored on User entity
2. **Theme Support**: Light/dark mode preference only
3. **Workspace Context**: Users can have different preferences per workspace (future)
4. **Immutable Properties**: Email handled by Auth module

## 📦 Entities

Uses existing **User** entity from Auth module:
- Extends with `theme` field (light, dark)

## 📥 DTOs

### UpdateUserPreferencesDto
Used to update user preferences.

**Fields:**
- `theme` (required, enum): UI theme preference (light, dark)

**Validation:**
- Theme must be valid enum value (light or dark)

## ⚙️ Services

### UserService

**Method: `updateUserPreferences(userId, preferencesDto)`**
- Updates user preferences
- Validates user exists
- Updates theme preferences
- Returns updated user object
- Supports partial updates

**Method: `getUserPreferences(userId)`**
- Retrieves user preferences
- Returns theme and other preferences

## 🌐 API Endpoints

### PATCH `/users/me/preferences`
Update current user's preferences.

**Request Body:**
```json
{
  "theme": "dark"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "theme": "dark",
  "createdAt": "2026-01-15T08:30:00Z"
}
```

**Errors:**
- 400: Invalid theme value
- 401: Unauthorized

## 🔍 Special Features

### Theme Preferences
- **light**: Light UI theme
- **dark**: Dark UI theme
- Stored per user
- Applied across all workspaces

### User Profile
- Name (from signup)
- Email (from signup)
- Theme preference
- Creation date

## ⚠️ Error Handling

**Validation Errors (400):**
- Invalid theme value (not in enum)

**Authentication Errors (401):**
- Missing JWT token
- Invalid token

## 🔗 Relationships with Other Modules

**Dependencies:**
- **AuthModule**: Uses User entity

**Dependent Modules:**
- Frontend: Applies user theme preferences

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Only theme preference
- No workspace-specific settings
- No notification preferences
- Limited profile customization

**Possible Enhancements:**
- Notification preferences (email, push, frequency)
- Additional display preferences (date format, time zone, language)
- Connected accounts (social login)
- Avatar/profile picture
- Biography/about section
- Workspace-specific preferences
- Saved filters and views
- Keyboard shortcuts customization
