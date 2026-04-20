# Search Module

## 📌 Overview

The Search module provides full-text search capabilities across tickets. It allows users to search ticket titles, descriptions, creator names, and assignee names using PostgreSQL's powerful full-text search with ranking and highlighting.

**Key Responsibilities:**
- Full-text search across tickets
- Relevance ranking of results
- Result highlighting (in title and description)
- Pagination support
- Search result filtering
- Performance optimization with indexes

## 🏗 Architecture

### Design Pattern
- **Full-Text Search**: Leverages PostgreSQL tsvector and tsquery
- **Database-Level Search**: Search engine built into database, not application
- **Materialized View**: Potential optimization using materialized view
- **Ranking**: Results ranked by relevance using ts_rank

### Key Design Decisions
1. **PostgreSQL FTS**: Uses PostgreSQL full-text search instead of external search engine
2. **Highlighting**: HTML highlighting of matching terms in results
3. **Ranking**: Results ranked by relevance match
4. **No SQL Injection**: Parameterized queries prevent injection
5. **Pagination**: Supports offset/limit for large result sets

## 📦 Entities

Uses existing **Ticket** entity with full-text search capabilities.

## 📥 DTOs

None - Search is read-only

## ⚙️ Services

### SearchService

**Method: `searchTickets(query, projectId?)`**
- Simple text search across tickets
- Searches title, ticketKey, description
- Case-insensitive LIKE matching
- Optional project filter
- Returns basic ticket info
- Limited to 10 results

**Method: `fullTextSearchTickets(query, limit, offset)`**
- Full-text search using PostgreSQL FTS
- Searches: title, description, creator name, assignee names
- Returns highlighted results
- Ranked by relevance (ts_rank)
- Paginated support
- Returns complete result set with metadata

**Features:**
- Highlighting of matched terms in title/description (HTML bold tags)
- Ranking score (relevance)
- Complete ticket information
- Creator and assignee details

## 🌐 API Endpoints

### GET `/search`
Full-text search across all tickets.

**Query Parameters:**
- `q` (required, string): Search query string
- `limit` (optional, number, 1-50, default 10): Number of results
- `offset` (optional, number, default 0): Results to skip for pagination

**Response (200 OK):**
```json
{
  "query": "login bug",
  "pagination": {
    "limit": 10,
    "offset": 0,
    "count": 2
  },
  "results": [
    {
      "ticket_id": "uuid",
      "project_id": "uuid",
      "task_key": "PROJ-1",
      "status_id": "uuid",
      "priority": "HIGH",
      "highlighted_title": "Fix <b>login</b> <b>bug</b>",
      "highlighted_description": "Users cannot <b>login</b> when using Google auth",
      "creator": {
        "id": "uuid",
        "name": "John Doe"
      },
      "assignees": [
        {
          "id": "uuid",
          "name": "Jane Smith"
        }
      ],
      "rank": 0.856
    },
    {
      "ticket_id": "uuid",
      "project_id": "uuid",
      "task_key": "PROJ-15",
      "status_id": "uuid",
      "priority": "MEDIUM",
      "highlighted_title": "Add <b>login</b> verification",
      "highlighted_description": null,
      "creator": {
        "id": "uuid",
        "name": "Jane Smith"
      },
      "assignees": [],
      "rank": 0.234
    }
  ]
}
```

**Errors:**
- 400: Empty query string

### GET `/search/project/:projectId`
Search within a specific project.

**Parameters:**
- `projectId` (path, required, UUID): Project ID
- `q` (query, required, string): Search query
- `limit` (query, optional, number): Results per page
- `offset` (query, optional, number): Pagination offset

**Response (200 OK):** Same format as general search

## 🔍 Special Features

### Full-Text Search (FTS)
- **Tsvector/Tsquery**: PostgreSQL native FTS
- **Language Support**: English language stemming for word forms
- **Phrase Matching**: Can search exact phrases
- **Boolean Operators**: AND, OR, NOT operators
- **Prefix Matching**: Partial word matching

### Result Ranking
- **Relevance Score**: Higher score = more relevant
- **ts_rank Function**: Built-in PostgreSQL ranking
- **Results Sorted**: Highest ranked first

### Highlighting
- **HTML Formatting**: Matching terms wrapped in `<b>` tags
- **Title Highlighting**: Emphasized in title field
- **Description Highlighting**: Emphasized in description
- **Safe HTML**: Prevents XSS with proper escaping

### Search Scope
- Searches across:
  - Ticket title (highest weight)
  - Ticket description (high weight)
  - Creator name
  - Assignee names
- Can filter by project

## ⚠️ Error Handling

**Validation Errors (400):**
- Query string empty or missing
- Limit exceeds maximum (50)
- Invalid offset

**Access Control:**
- No per-query auth needed (searches visible tickets in workspace)

## 🔗 Relationships with Other Modules

**Dependencies:**
- **TicketModule**: Searches across tickets

**Dependent Modules:**
- Frontend: Displays search results
- **TicketModule**: Uses for quick search

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Search limited to tickets (not comments, attachments)
- No faceted search (filter by status, priority, etc.)
- No saved searches
- No search history
- No search suggestions/autocomplete
- No advanced query syntax
- All searches public (no private results)

**Possible Enhancements:**
- Faceted search (filter results by status, assignee, etc.)
- Search suggestions/autocomplete
- Search history per user
- Saved searches
- Advanced query syntax (AND, OR, NOT, field-specific)
- Search results export
- Search analytics (popular searches)
- Workspace-level search configuration
- Elasticsearch integration for bigger installations
- Index management tools
- Search performance monitoring
