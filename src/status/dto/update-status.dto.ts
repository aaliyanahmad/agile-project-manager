import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StatusCategory } from '../../entities/enums';

export class UpdateStatusDto {
  @ApiPropertyOptional({
    description: 'The display name for the status. Must be unique within the project.',
    example: 'Ready for QA',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The category this status belongs to. Changing category may affect workflow positioning. Note: Cannot change category if status has tickets assigned.',
    enum: StatusCategory,
    enumName: 'StatusCategory',
    example: StatusCategory.DONE,
    examples: {
      'todo': {
        summary: 'Change to Todo status',
        value: StatusCategory.TODO
      },
      'in-progress': {
        summary: 'Change to In Progress status',
        value: StatusCategory.IN_PROGRESS
      },
      'done': {
        summary: 'Change to Done status',
        value: StatusCategory.DONE
      }
    }
  })
  @IsEnum(StatusCategory)
  @IsOptional()
  category?: StatusCategory;

  @ApiPropertyOptional({
    description: 'Position for ordering statuses within the project. Supports decimal values for gap-based ordering.',
    example: 2.5,
    type: Number,
    minimum: 0
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  position?: number;
}
