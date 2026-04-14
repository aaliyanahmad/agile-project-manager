import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { Express } from 'express';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadsDir = path.join(
    process.cwd(),
    'uploads',
  );
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly dangerousExtensions = [
    '.exe',
    '.bat',
    '.cmd',
    '.sh',
    '.com',
    '.pif',
    '.scr',
    '.vbs',
    '.js',
    '.jar',
  ];

  constructor() {
    this.ensureUploadsDirectory();
  }

  /**
   * Ensure uploads directory exists
   */
  private ensureUploadsDirectory(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      this.logger.log(`Created uploads directory at ${this.uploadsDir}`);
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(
    file: Express.Multer.File,
  ): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of 5MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Check for dangerous extensions
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (this.dangerousExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `Executable files are not allowed`,
      );
    }

    // Prevent path traversal
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      throw new BadRequestException(
        `Invalid filename. Path traversal is not allowed`,
      );
    }
  }

  /**
   * Sanitize filename for filesystem safety
   */
  private sanitizeFileName(originalName: string): string {
    // Remove file extension
    const nameWithoutExt = originalName
      .substring(0, originalName.lastIndexOf('.')) || originalName;
    
    // Remove/replace unsafe characters
    let sanitized = nameWithoutExt
      .replace(/[^a-zA-Z0-9\-_]/g, '_')  // Replace special chars with underscore
      .replace(/_{2,}/g, '_')             // Replace multiple underscores with single
      .toLowerCase()
      .trim();

    // Ensure not empty and not too long
    if (!sanitized) sanitized = 'file';
    if (sanitized.length > 50) sanitized = sanitized.substring(0, 50);

    return sanitized;
  }

  /**
   * Generate unique filename with format: <timestamp>_<random>_<sanitizedName>.<ext>
   * Example: 1712901234_ab12cd_report.pdf
   */
  private generateUniqueFileName(originalName: string): string {
    const fileExtension = path.extname(originalName).toLowerCase();
    const sanitizedName = this.sanitizeFileName(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8); // 6 random chars

    return `${timestamp}_${random}_${sanitizedName}${fileExtension}`;
  }

  /**
   * Upload file to local storage
   * Returns file URL, original name, and size
   */
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    // Validate file
    this.validateFile(file);

    try {
      // Generate unique filename
      const uniqueFileName = this.generateUniqueFileName(
        file.originalname,
      );
      const filePath = path.join(this.uploadsDir, uniqueFileName);

      // Save file to disk
      fs.writeFileSync(filePath, file.buffer);

      this.logger.log(
        `File uploaded successfully: ${uniqueFileName} (${file.size} bytes)`,
      );

      return {
        fileUrl: `/uploads/${uniqueFileName}`,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Error uploading file: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Failed to upload file. Please try again.',
      );
    }
  }

  /**
   * Delete file from local storage (for cleanup)
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      // Prevent path traversal
      if (fileName.includes('..') || fileName.includes('/')) {
        throw new BadRequestException(
          'Invalid filename',
        );
      }

      const filePath = path.join(this.uploadsDir, fileName);

      // Ensure file is within uploads directory
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadsDir = path.resolve(this.uploadsDir);

      if (!resolvedPath.startsWith(resolvedUploadsDir)) {
        throw new BadRequestException(
          'Invalid file path',
        );
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`File deleted: ${fileName}`);
      }
    } catch (error) {
      this.logger.error(
        `Error deleting file: ${error.message}`,
      );
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Check if file exists
   */
  fileExists(fileName: string): boolean {
    const filePath = path.join(this.uploadsDir, fileName);
    return fs.existsSync(filePath);
  }
}
