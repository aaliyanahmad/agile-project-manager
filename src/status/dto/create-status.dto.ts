import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StatusCategory } from '../../entities/enums';

export class CreateStatusDto {
  @ApiProperty({
    description: 'The display name for the status',
    example: 'Code Review',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({
    description: 'The category this status belongs to. Determines the workflow stage.',
    enum: StatusCategory,
    enumName: 'StatusCategory',
    example: StatusCategory.IN_PROGRESS,
    examples: {
      'todo': {
        summary: 'Todo status',
        value: StatusCategory.TODO
      },
      'in-progress': {
        summary: 'In Progress status',
        value: StatusCategory.IN_PROGRESS
      },
      'done': {
        summary: 'Done status',
        value: StatusCategory.DONE
      }
    }
  })
  @IsEnum(StatusCategory)
  category!: StatusCategory;

  @ApiPropertyOptional({
    description: 'Position for ordering statuses within the project. If not provided, status will be added at the end. Supports decimal values for gap-based ordering.',
    example: 4,
    type: Number,
    minimum: 0
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  position?: number;
}
