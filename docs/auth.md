# Auth Module

## 📌 Overview

The Auth module handles user authentication and authorization. It provides JWT-based authentication with user registration, login, and token validation. Users authenticate once and receive a JWT token that grants access to all protected resources within their workspaces.

**Key Responsibilities:**
- User registration (signup)
- User login and JWT token generation
- JWT validation and user extraction
- Password hashing and verification
- Current user information retrieval
- Token expiration and refresh policies

## 🏗 Architecture

### Design Pattern
- **JWT-Based Authentication**: Stateless, token-based authentication using Passport.js
- **Strategy Pattern**: JwtStrategy handles token validation
- **Guard Pattern**: JwtAuthGuard protects routes

### Key Design Decisions
1. **JWT Tokens**: 7-day expiration for improved security
2. **Password Hashing**: Bcrypt for secure password storage
3. **Stateless**: No server-side session storage
4. **CurrentUser Decorator**: Extracts user from JWT payload
5. **Public Endpoints**: Signup and login are public; other endpoints protected

## 📦 Entities

### User
Represents a system user.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `name` (VARCHAR, 200): User's name
- `email` (VARCHAR, 255, unique): User's email (unique across system)
- `password` (VARCHAR, 255): Hashed password (bcrypt)
- `theme` (ENUM, default: 'light'): UI theme preference (light, dark)
- `createdAt` (TIMESTAMP): Account creation timestamp
- `updatedAt` (TIMESTAMP): Last update timestamp

**Relationships:**
- `createdTickets`: One-to-Many with Ticket (tickets created by user)
- `assignedTickets`: Many-to-Many with Ticket (assigned to user)
- `comments`: One-to-Many with Comment
- `workspaceMembers`: One-to-Many with WorkspaceMember

**Constraints:**
- Email is unique
- Password is hashed and salted

## 📥 DTOs

### SignupDto
Used for user registration.

**Fields:**
- `name` (required, string, 2-200 chars): User's full name
- `email` (required, email): User's email address
- `password` (required, string, min 8 chars): User's password

**Validation:**
- Name is required, 2-200 characters
- Email is required and valid email format
- Email must be unique (not already registered)
- Password is required and minimum 8 characters
- Password strength recommendations (mixed case, numbers, symbols)

### LoginDto
Used for user login.

**Fields:**
- `email` (required, email): User's email address
- `password` (required, string): User's password

**Validation:**
- Email is required and valid format
- Password is required
- Valid credentials must match registered user

## ⚙️ Services

### AuthService

**Method: `signup(dto)`**
- Registers a new user
- Validates email is not already registered
- Hashes password using bcrypt (10 salt rounds)
- Creates user record in database
- Generates JWT token for immediate login
- Returns token and user details
- Does NOT create workspace membership (user must create/join workspace)

**Method: `login(dto)`**
- Authenticates user credentials
- Validates email exists
- Compares provided password with hashed password in database
- Generates JWT token on success
- Throws UnauthorizedException on invalid credentials
- Returns token and user details

**Method: `getCurrentUser(userId)`**
- Retrieves authenticated user details
- Used by CurrentUser decorator
- Returns user from JWT payload validation
- Returns user object with id, name, email, theme

**Method: `updateUserProfile(userId, updateDto)`**
- Updates user profile information
- Can update name, email, theme
- Validates new email uniqueness if changing email
- Returns updated user

**Method: `validateToken(token)`**
- Validates JWT token signature and expiration
- Extracts user ID from token
- Returns user ID if valid, throws on invalid/expired

## 🌐 API Endpoints

### POST `/auth/signup`
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "theme": "light"
  }
}
```

**Errors:**
- 400: Validation error (invalid email, weak password, etc.)
- 409: Email already registered

### POST `/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "theme": "light"
  }
}
```

**Errors:**
- 400: Validation error
- 401: Invalid email or password

### GET `/auth/me`
Get current authenticated user information.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "theme": "light",
  "createdAt": "2026-01-15T08:30:00Z"
}
```

**Errors:**
- 401: Invalid or missing token

## 🔍 Special Features

### JWT Token Strategy
- **Token Format**: Standard JWT with HS256 algorithm
- **Expiration**: 7 days
- **Payload**: Contains `sub` (user ID), `iat` (issued at), `exp` (expiration)
- **Secret**: Stored in environment variable `JWT_SECRET`

### Password Security
- **Hashing**: bcrypt with 10 salt rounds
- **Comparison**: Secure bcrypt comparison (timing-safe)
- **No Plain Text**: Passwords never stored or logged in plain text

### JwtAuthGuard
- Protects routes from unauthenticated access
- Validates JWT token signature and expiration
- Extracts user from token
- Returns 401 Unauthorized if token invalid/missing

### CurrentUser Decorator
- Injects authenticated user into controller methods
- Extracts user from request.user (populated by JwtAuthGuard)
- Type-safe user object injection

**Usage:**
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
async getCurrentUser(@CurrentUser() user: User) {
  // user is authenticated User object
}
```

### JwtStrategy (Passport)
- Extracts JWT from Authorization: Bearer header
- Validates token signature using JWT_SECRET
- Checks token expiration
- Returns user ID for injection into requests

## ⚠️ Error Handling

**Validation Errors (400):**
- Name required or invalid length
- Email invalid format or required
- Email already registered (signup)
- Password too weak or missing
- Password mismatch (login)

**Authentication Errors (401):**
- Invalid email or password
- Token expired or invalid
- Missing Authorization header

**Conflict Errors (409):**
- Email already registered

## 🔗 Relationships with Other Modules

**Dependencies:**
- **ConfigModule**: Loads JWT_SECRET from environment
- **TypeOrmModule**: User entity persistence

**Dependent Modules:**
- **ALL**: Every protected endpoint uses JwtAuthGuard

## 🧠 Notes / Future Improvements

**Current Limitations:**
- No password reset functionality
- No email verification
- No OAuth2 (Google, GitHub login)
- No two-factor authentication
- No refresh token mechanism
- No rate limiting on login attempts

**Possible Enhancements:**
- Email verification on signup
- Password reset via email link
- OAuth2/Social login (Google, GitHub, Microsoft)
- Two-factor authentication (TOTP, SMS)
- Refresh token mechanism (separate short/long-lived tokens)
- Login attempt rate limiting
- Account lockout after failed attempts
- Session management (logout, list active sessions)
- Device/browser fingerprinting
- IP-based access restrictions
