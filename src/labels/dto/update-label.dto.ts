import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateLabelDto {
  @ApiPropertyOptional({ description: 'Label name', example: 'Bug' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Hex color', example: '#FF0000' })
  @IsString()
  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{6})$/, {
    message: 'color must be a valid hex code like #FF0000',
  })
  color?: string;
}
