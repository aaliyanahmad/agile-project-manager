import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Workspace name', example: 'Engineering Team' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}