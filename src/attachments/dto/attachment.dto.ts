import { ApiProperty } from '@nestjs/swagger';

export class UploadedByUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User name' })
  name: string;
}

export class AttachmentDto {
  @ApiProperty({ description: 'Attachment unique identifier' })
  id: string;

  @ApiProperty({ description: 'File URL accessible via /uploads route' })
  fileUrl: string;

  @ApiProperty({ description: 'Original file name' })
  fileName: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({
    type: UploadedByUserDto,
    description: 'User who uploaded the file',
  })
  uploadedBy: UploadedByUserDto;

  @ApiProperty({ description: 'When the attachment was created' })
  createdAt: Date;
}
