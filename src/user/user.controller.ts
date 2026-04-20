import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { UserService, UpdateUserPreferencesDto } from './user.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';
import { IsEnum } from 'class-validator';
import { UserTheme } from '../entities/enums';

class UpdateUserPreferencesDtoValidated implements UpdateUserPreferencesDto {
  @IsEnum(UserTheme)
  theme: UserTheme;
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('me/preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiBody({
    description: 'User preferences to update',
    schema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          enum: ['light', 'dark'],
          example: 'dark',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'User preferences updated successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john@example.com',
        theme: 'dark',
      },
    },
  })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() preferences: UpdateUserPreferencesDtoValidated,
  ) {
    return this.userService.updateUserPreferences(user.id, preferences);
  }
}