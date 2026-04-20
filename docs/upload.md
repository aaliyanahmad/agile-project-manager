# Upload Module

## 📌 Overview

The Upload module handles file upload operations. It provides utilities for saving uploaded files to disk storage with unique naming, file validation, and error handling. Files are stored in the `uploads/` directory and served via the static file handler.

**Key Responsibilities:**
- Save uploaded files to disk
- Generate unique file names to prevent collisions
- Validate file types and sizes
- Handle file metadata (name, size, type)
- Provide file URLs for retrieval
- Clean up files when needed

## 🏗 Architecture

### Design Pattern
- **Utility Service**: UploadService provides file handling utilities
- **File System Storage**: Files saved to local disk (uploads/ folder)
- **Unique Naming**: UUID-based file naming prevents collisions
- **Metadata Tracking**: File information stored with original filename

### Key Design Decisions
1. **Local File Storage**: Files saved to disk, not database
2. **Unique Names**: Filenames use UUID to prevent overwrites
3. **Original Name Preservation**: Original filename stored for user reference
4. **Size Limits**: Maximum file size enforced (5MB)
5. **Type Validation**: Whitelist of allowed file types

## 📦 Entities

**Attachment entity stores metadata; Upload module handles file system operations**

## 📥 DTOs

### FileUploadDto (implicit from multer)
**Fields:**
- `file` (multipart/form-data): File to upload
  - `originalname`: Original file name
  - `buffer`: File content (in memory)
  - `mimetype`: MIME type
  - `size`: File size in bytes

## ⚙️ Services

### UploadService

**Method: `uploadFile(file)`**
- Accepts multer file object
- Generates unique filename using UUID
- Saves file to uploads/ directory
- Returns file metadata (URL, filename, size)

**Process:**
1. Generate UUID-based filename
2. Concatenate with original extension
3. Write file buffer to disk
4. Return file info object

**Method: `saveFile(fileName, fileBuffer, filePath?)`**
- Core file save operation
- Saves file to specified or default path
- Returns file info with full path

**Method: `deleteFile(filePath)`**
- Removes file from disk
- Error handling if file not found

**Method: `getFileUrl(fileName)`**
- Generates public URL for uploaded file
- Format: `/uploads/{fileName}`

## 🌐 API Endpoints

### POST `/upload`
Upload a file (temporary endpoint).

**Headers:**
- `Content-Type: multipart/form-data`
- `Authorization: Bearer <token>`

**Request Body:**
```
Form Data:
  file: <binary file>
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "fileName": "1619123456789_originalname.pdf",
    "fileUrl": "/uploads/1619123456789_originalname.pdf",
    "fileSize": 102400,
    "mimeType": "application/pdf"
  }
}
```

**Errors:**
- 400: File too large, invalid type
- 401: Unauthorized

## 🔍 Special Features

### File Type Validation
Allowed MIME types:
- **Images**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **Documents**: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Text**: `text/plain`, `text/csv`

### File Size Limits
- Maximum file size: 5MB (5242880 bytes)
- Configurable via environment variable
- Enforced at multer middleware level

### Unique File Naming
- Format: `<timestamp>_<uuid>_<original-name>`
- Example: `1619123456789_a1b2c3d4-5e6f-7a8b-9c0d-1234567890ab_document.pdf`
- Prevents filename collisions
- Preserves original filename for reference

### Static File Serving
- Files served via `ServeStaticModule`
- Route: `/uploads/{fileName}`
- Public access (no auth required for serving)

## ⚠️ Error Handling

**Validation Errors (400):**
- File too large (exceeds 5MB)
- File type not allowed
- No file provided

**Server Errors (500):**
- Failed to write file to disk
- Permission denied

## 🔗 Relationships with Other Modules

**Dependencies:**
- None (standalone utility)

**Dependent Modules:**
- **AttachmentsModule**: Uses upload for file storage
- **CommentModule**: Potentially uses for comment attachments

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Files stored in local file system (not scalable)
- No file encryption
- No file versioning
- No file access control
- No storage quota per user
- Files not backed up
- No CDN integration

**Possible Enhancements:**
- Cloud storage integration (AWS S3, Google Cloud Storage)
- File encryption
- File versioning/history
- Access control per file
- Storage quota management
- Automatic backup
- CDN integration for faster delivery
- File compression
- Image thumbnail generation
- Virus scanning
- Encryption for sensitive files
- File retention policies
