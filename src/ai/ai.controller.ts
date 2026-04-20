import { Controller, Get, Param, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { UserStoryResponseDto } from './dto/user-story-response.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
@ApiTags('AI - User Stories')
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post(':id/ai-user-story')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate AI user story for a ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'User story generated successfully',
    type: UserStoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to generate user story',
  })
  async generateUserStory(@Param('id') ticketId: string): Promise<UserStoryResponseDto> {
    return this.aiService.generateUserStory(ticketId);
  }

  @Get(':id/ai-user-story')
  @ApiOperation({ summary: 'Fetch existing AI user story for a ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'User story retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket not found',
  })
  async getUserStory(
    @Param('id') ticketId: string,
  ): Promise<UserStoryResponseDto | { message: string }> {
    return this.aiService.getUserStory(ticketId);
  }
}
