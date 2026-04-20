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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { StatusService } from './status.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReorderStatusDto } from './dto/reorder-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Status } from '../entities/status.entity';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Statuses')
@ApiBearerAuth()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post('projects/:projectId/statuses')
  @ApiOperation({
    summary: 'Create a new status for a project',
    description: 'Creates a custom status for the specified project. The status will be added with the specified position or at the end if no position is provided.'
  })
  @ApiCreatedResponse({
    description: 'Status created successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc' },
            projectId: { type: 'string', example: 'a1b2c3d4-5e6f-7a8b-9c0d-123456789abc' },
            name: { type: 'string', example: 'Code Review' },
            category: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'IN_PROGRESS' },
            position: { type: 'number', example: 4 },
            createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T14:30:00.000Z' },
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or business rule violation',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'name must be longer than or equal to 1 characters' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiForbiddenResponse({
    description: 'User does not have access to this project',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied: User does not belong to this workspace' }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Project not found' }
      }
    }
  })
  @ApiParam({
    name: 'projectId',
    description: 'UUID of the project to create the status for',
    example: 'a1b2c3d4-5e6f-7a8b-9c0d-123456789abc'
  })
  @ApiBody({
    type: CreateStatusDto,
    description: 'Status creation data',
    examples: {
      'create-custom-status': {
        summary: 'Create a custom status',
        value: {
          name: 'Code Review',
          category: 'IN_PROGRESS',
          position: 4
        }
      },
      'create-without-position': {
        summary: 'Create status without specifying position',
        value: {
          name: 'Testing',
          category: 'DONE'
        }
      }
    }
  })
  async createStatus(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateStatusDto,
  ) {
    return {
      success: true,
      data: await this.statusService.createStatus(projectId, user.id, dto),
    };
  }

  @Get('projects/:projectId/statuses')
  @ApiOperation({
    summary: 'Get all statuses for a project',
    description: 'Retrieves all statuses for the specified project, ordered by position. This includes the default statuses (Todo, In Progress, Done) plus any custom statuses created for the project.'
  })
  @ApiOkResponse({
    description: 'Statuses returned successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc' },
              projectId: { type: 'string', example: 'a1b2c3d4-5e6f-7a8b-9c0d-123456789abc' },
              name: { type: 'string', example: 'Todo' },
              category: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'TODO' },
              position: { type: 'number', example: 1 },
              createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T14:30:00.000Z' },
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiForbiddenResponse({
    description: 'User does not have access to this project',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied: User does not belong to this workspace' }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Project not found' }
      }
    }
  })
  @ApiParam({
    name: 'projectId',
    description: 'UUID of the project to get statuses for',
    example: 'a1b2c3d4-5e6f-7a8b-9c0d-123456789abc'
  })
  async getStatuses(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    return {
      success: true,
      data: await this.statusService.getStatuses(projectId, user.id),
    };
  }

  @Patch('statuses/:id')
  @ApiOperation({
    summary: 'Update a status',
    description: 'Updates an existing status. You can change the name, category, or position. Business rules prevent changing the category if it would leave the project without at least one status in that category.'
  })
  @ApiOkResponse({
    description: 'Status updated successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc' },
            projectId: { type: 'string', example: 'a1b2c3d4-5e6f-7a8b-9c0d-123456789abc' },
            name: { type: 'string', example: 'Code Review' },
            category: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'IN_PROGRESS' },
            position: { type: 'number', example: 4 },
            createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T14:30:00.000Z' },
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data or business rule violation',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Cannot change category: project must have at least one TODO status' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiForbiddenResponse({
    description: 'User does not have access to this status/project',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied: User does not belong to this workspace' }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Status not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Status not found' }
      }
    }
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the status to update',
    example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc'
  })
  @ApiBody({
    type: UpdateStatusDto,
    description: 'Status update data',
    examples: {
      'update-name': {
        summary: 'Update status name',
        value: {
          name: 'Ready for Review'
        }
      },
      'update-category': {
        summary: 'Update status category',
        value: {
          category: 'DONE'
        }
      },
      'update-position': {
        summary: 'Update status position',
        value: {
          position: 2.5
        }
      }
    }
  })
  async updateStatus(
    @Param('id') statusId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateStatusDto,
  ) {
    return {
      success: true,
      data: await this.statusService.updateStatus(statusId, user.id, dto),
    };
  }

  @Delete('statuses/:id')
  @ApiOperation({
    summary: 'Delete a status',
    description: 'Deletes a status from the project. Business rules prevent deletion if tickets are assigned to the status or if it would leave the project without at least one status in that category.'
  })
  @ApiOkResponse({
    description: 'Status deleted successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Status deleted successfully' }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Cannot delete status due to business rule constraints',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Cannot delete a status that has tickets assigned to it' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiForbiddenResponse({
    description: 'User does not have access to this status/project',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied: User does not belong to this workspace' }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Status not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Status not found' }
      }
    }
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the status to delete',
    example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc'
  })
  async deleteStatus(
    @Param('id') statusId: string,
    @CurrentUser() user: User,
  ) {
    await this.statusService.deleteStatus(statusId, user.id);
    return {
      success: true,
      message: 'Status deleted successfully',
    };
  }

  @Patch('statuses/:id/reorder')
  @ApiOperation({
    summary: 'Reorder a status within a project',
    description: 'Changes the position of a status within its project. Uses gap-based ordering to allow inserting statuses between existing ones (e.g., position 2.5).'
  })
  @ApiOkResponse({
    description: 'Status reordered successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc' },
            projectId: { type: 'string', example: 'a1b2c3d4-5e6f-7a8b-9c0d-123456789abc' },
            name: { type: 'string', example: 'Code Review' },
            category: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'IN_PROGRESS' },
            position: { type: 'number', example: 2.5 },
            createdAt: { type: 'string', format: 'date-time', example: '2026-04-13T14:30:00.000Z' },
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid position or business rule violation',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid position value' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiForbiddenResponse({
    description: 'User does not have access to this status/project',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Access denied: User does not belong to this workspace' }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Status not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Status not found' }
      }
    }
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the status to reorder',
    example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc'
  })
  @ApiBody({
    type: ReorderStatusDto,
    description: 'New position data',
    examples: {
      'insert-between': {
        summary: 'Insert status between existing ones',
        value: {
          newPosition: 2.5
        }
      },
      'move-to-end': {
        summary: 'Move status to the end',
        value: {
          newPosition: 10
        }
      }
    }
  })
  async reorderStatus(
    @Param('id') statusId: string,
    @CurrentUser() user: User,
    @Body() dto: ReorderStatusDto,
  ) {
    return {
      success: true,
      data: await this.statusService.reorderStatus(statusId, user.id, dto),
    };
  }
}
