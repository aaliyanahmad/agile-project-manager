import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}