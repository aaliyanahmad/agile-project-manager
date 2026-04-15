import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'Sprint Tracker' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiProperty({ description: 'Project description', example: 'A project to track sprints and tasks' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}