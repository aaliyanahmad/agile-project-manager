import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Labels')
@ApiBearerAuth()
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post('projects/:projectId/labels')
  @ApiOperation({ summary: 'Create a label for a project' })
  @ApiCreatedResponse({ description: 'Label created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiBody({ type: CreateLabelDto })
  async createLabel(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateLabelDto,
  ) {
    return {
      success: true,
      data: await this.labelsService.createLabel(projectId, user.id, dto),
    };
  }

  @Get('projects/:projectId/labels')
  @ApiOperation({ summary: 'Get all labels for a project' })
  @ApiOkResponse({ description: 'Labels returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getLabels(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return {
      success: true,
      data: await this.labelsService.getLabels(projectId, user.id),
    };
  }

  @Patch('labels/:id')
  @ApiOperation({ summary: 'Update a label' })
  @ApiOkResponse({ description: 'Label updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Label not found' })
  @ApiParam({ name: 'id', description: 'Label UUID' })
  @ApiBody({ type: UpdateLabelDto })
  async updateLabel(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateLabelDto,
  ) {
    return {
      success: true,
      data: await this.labelsService.updateLabel(id, user.id, dto),
    };
  }

  @Delete('labels/:id')
  @ApiOperation({ summary: 'Delete a label' })
  @ApiOkResponse({ description: 'Label deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Label not found' })
  @ApiParam({ name: 'id', description: 'Label UUID' })
  async deleteLabel(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    await this.labelsService.deleteLabel(id, user.id);
    return {
      success: true,
      message: 'Label deleted successfully',
    };
  }
}
