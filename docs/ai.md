# AI Module

## 📌 Overview

The AI module provides artificial intelligence-powered features for ticket enhancement. Currently, it supports automatic user story generation using Google's Gemini API. The module transforms ticket titles and descriptions into well-formatted user stories with acceptance criteria and technical notes.

**Key Responsibilities:**
- Generate AI-powered user stories from tickets
- Cache generated user stories to reduce API calls
- Retrieve existing user stories
- Integrate with Gemini API for LLM capabilities
- Manage AI-generated content lifecycle

## 🏗 Architecture

### Design Pattern
- **External API Integration**: Integrates with Google GenerativeAI (Gemini)
- **Caching**: Generated content stored in database to avoid regeneration
- **Non-Blocking**: AI operations don't block critical paths
- **Error Handling**: Graceful fallback if API fails

### Key Design Decisions
1. **Caching Strategy**: Generated user stories stored in `aiUserStory` field
2. **Lazy Generation**: Generated on-demand, not automatically
3. **Gemini Model**: Uses gemini-2.5-flash for speed and cost
4. **Context Enrichment**: Uses sprint goal and project description for context
5. **Immutable Results**: Once generated and cached, results don't change

## 📦 Entities

Uses existing **Ticket** entity:
- New field: `aiUserStory` (TEXT, nullable, JSON): Cached generated user story

## 📥 DTOs

### UserStoryResponseDto
Response format for user story generation/retrieval.

**Fields:**
```typescript
{
  userStory: string;
  acceptanceCriteria: string[];
  technicalNotes: string[];
}
```

**Example:**
```json
{
  "userStory": "As a user, I want to log in with my email and password so that I can access my account securely.",
  "acceptanceCriteria": [
    "User can enter email address in login form",
    "User can enter password in login form",
    "System validates email format",
    "System validates password strength",
    "User sees error message on failed login",
    "User is redirected to dashboard on successful login"
  ],
  "technicalNotes": [
    "Use bcrypt for password hashing",
    "Implement JWT token generation",
    "Add rate limiting to prevent brute force",
    "Log failed login attempts for security"
  ]
}
```

## ⚙️ Services

### AiService

**Method: `generateUserStory(ticketId)`**
- Generates user story for a ticket
- Checks if already cached (`ticket.aiUserStory`)
- If not cached, calls Gemini API with context
- Parses Gemini response into structured format
- Saves result to database for future use
- Returns user story with acceptance criteria and technical notes

**Process:**
1. Fetch ticket with sprint and project relations
2. Check if `aiUserStory` already exists (return cached)
3. Extract context: sprint goal, project description
4. Build detailed prompt with ticket info + context
5. Call Gemini API
6. Parse JSON response
7. Save to ticket
8. Return result

**Method: `getUserStory(ticketId)`**
- Retrieves cached user story for ticket
- Returns existing story if available
- Returns {message: "No user story generated"} if not available
- Does not trigger generation

**Method: `_buildPrompt(ticket, sprintGoal, projectDescription)`**
- Constructs detailed prompt for Gemini
- Includes ticket title, description, priority
- Adds context from sprint and project
- Specifies expected response format (JSON with userStory, acceptanceCriteria, technicalNotes)
- Optimized for generating complete, useful stories

**Method: `_parseGeminiResponse(response)`**
- Parses Gemini's text response into structured JSON
- Handles various response formats
- Extracts user story, criteria, and technical notes
- Returns typed UserStoryResponse object

**Method: `_getSprintContext(sprint)`**
- Extracts relevant context from sprint
- Returns sprint goal if available
- Used to provide context to Gemini

## 🌐 API Endpoints

### POST `/tickets/:id/ai-user-story`
Generate AI user story for a ticket.

**Parameters:**
- `id` (path, required, UUID): Ticket ID

**Response (200 OK):**
```json
{
  "userStory": "As a user, I want to log in with my email and password so that I can access my account securely.",
  "acceptanceCriteria": [
    "User can enter email address in login form",
    "User can enter password in login form",
    "System validates email format",
    "System validates password strength",
    "User sees error message on failed login",
    "User is redirected to dashboard on successful login"
  ],
  "technicalNotes": [
    "Use bcrypt for password hashing",
    "Implement JWT token generation",
    "Add rate limiting to prevent brute force",
    "Log failed login attempts for security audit"
  ]
}
```

**Errors:**
- 400: Failed to generate user story (API error)
- 404: Ticket not found

### GET `/tickets/:id/ai-user-story`
Fetch existing AI user story for a ticket.

**Parameters:**
- `id` (path, required, UUID): Ticket ID

**Response (200 OK):**
```json
{
  "userStory": "As a user, I want to...",
  "acceptanceCriteria": [...],
  "technicalNotes": [...]
}
```

Or:
```json
{
  "message": "No user story generated yet"
}
```

**Errors:**
- 404: Ticket not found

## 🔍 Special Features

### Gemini Integration
- Uses Google's Gemini 2.5 Flash model
- Fast response times (suitable for real-time generation)
- Context-aware generation using sprint/project info
- Structured output with acceptance criteria and technical notes

### Caching Strategy
- User stories cached in `aiUserStory` field
- Reduces API calls and costs
- Instant retrieval on subsequent requests
- Cached results stored as JSON string

### Context-Aware Generation
- **Ticket Information**: Title, description, priority
- **Sprint Context**: Sprint goal for alignment
- **Project Context**: Project description for domain knowledge
- **Multi-language Support**: Can generate in different languages with prompt adjustment

### API Key Management
- Uses `GEMINI_API_KEY` environment variable
- Secure credential handling
- API key never logged

## ⚠️ Error Handling

**API Errors (400):**
- Gemini API call fails
- Response parsing fails
- Invalid API key

**Not Found (404):**
- Ticket not found

**Service Dependencies:**
- Graceful degradation if Gemini service unavailable

## 🔗 Relationships with Other Modules

**Dependencies:**
- **TicketModule**: AI features applied to tickets
- External: Google GenerativeAI API

**Dependent Modules:**
- Frontend: Displays generated user stories
- **TicketModule**: Stores generated content in ticket entity

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Only user story generation (other AI features possible)
- No user story regeneration/refresh
- No versioning of generated content
- Limited context (could use more ticket relationships)
- Not integrated into ticket workflow

**Possible Enhancements:**
- AI-powered title suggestions
- AI-powered description expansion
- Automated ticket categorization
- AI-powered priority recommendation
- Acceptance criteria from existing tickets (similar)
- AI-powered bug root cause analysis
- Generate test cases from user stories
- AI-powered time estimation
- Translate user stories to other languages
- AI-powered duplicate detection
- Generate release notes from tickets
- AI-powered sprint planning suggestions
- Cost estimation for features
- Sentiment analysis on comments
