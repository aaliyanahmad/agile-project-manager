import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignLabelsDto {
  @ApiProperty({
    description: 'Array of label UUIDs (replace full set)',
    example: ['a1b2c3d4-5e6f-7a8b-9c0d-123456789abc'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  labelIds!: string[];
}
