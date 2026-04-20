import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({ description: 'Label name', example: 'Bug' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Hex color', example: '#FF0000' })
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6})$/, {
    message: 'color must be a valid hex code like #FF0000',
  })
  color!: string;
}
