import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSprintDto {
  @ApiPropertyOptional({ description: 'Optional sprint start date', example: '2026-04-10' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Optional sprint end date', example: '2026-04-24' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
