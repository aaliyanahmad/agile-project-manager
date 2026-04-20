import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSprintDto {
  @ApiPropertyOptional({ description: 'Sprint goal', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  goal?: string | null;
}
