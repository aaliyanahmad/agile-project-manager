import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FullTextSearchQueryDto {
  @ApiProperty({
    description: 'Full-text search query string (searches title, description, creator, assignees)',
    example: 'login bug fix',
  })
  @IsString()
  q!: string;

  @ApiPropertyOptional({
    description: 'Number of results to return (1-50)',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Number of results to skip for pagination',
    example: 0,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
