import { Controller, Get, Post, Query, ValidationPipe, HttpException, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Full-text search across all tickets',
    description:
      'Searches across ticket title, description, creator name, and assignee names using PostgreSQL full-text search. Results include highlighting of matching terms and are ranked by relevance.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query string',
    example: 'login bug',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results to return (1-50, default 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of results to skip for pagination (default 0)',
    example: 0,
  })
  @ApiOkResponse({
    description: 'Search results with highlighting and ranking',
    schema: {
      example: {
        query: 'login bug',
        pagination: {
          limit: 10,
          offset: 0,
          count: 2,
        },
        results: [
          {
            ticket_id: 'uuid',
            project_id: 'uuid',
            status_id: 'uuid',
            priority: 'HIGH',
            highlighted_title: 'Fix <b>login</b> <b>bug</b>',
            highlighted_description: 'Users cannot <b>login</b>',
            creator: { id: 'uuid', name: 'John Doe' },
            assignees: [{ id: 'uuid', name: 'Jane Smith' }],
            rank: 0.89,
          },
        ],
      },
    },
  })
  async search(
    @Query('q') query?: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ): Promise<{ query: string; pagination: any; results: any[] }> {
    // Validate query parameter
    if (!query || typeof query !== 'string') {
      throw new BadRequestException('Search query (q) is required and must be a string');
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new BadRequestException('Search query cannot be empty');
    }

    // Ensure limit and offset are valid numbers
    const safeLimit = Number.isFinite(limit) ? Number(limit) : 10;
    const safeOffset = Number.isFinite(offset) ? Number(offset) : 0;

    this.logger.log(`Search request: q="${trimmedQuery}", limit=${safeLimit}, offset=${safeOffset}`);

    try {
      const results = await this.searchService.fullTextSearchTickets(trimmedQuery, safeLimit, safeOffset);
      return {
        query: trimmedQuery,
        pagination: {
          limit: safeLimit,
          offset: safeOffset,
          count: results.length,
        },
        results,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Search error: ${errorMessage}`);
      throw new HttpException(
        {
          success: false,
          message: 'Search failed',
          error: errorMessage,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('refresh-view')
  @ApiOperation({ summary: 'Manually refresh the ticket search materialized view' })
  @ApiOkResponse({
    description: 'Materialized view refresh triggered successfully',
    schema: {
      example: {
        success: true,
        message: 'Ticket search materialized view refresh initiated',
      },
    },
  })
  async refreshView(): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      this.logger.log('[API] Initiating manual refresh of ticket_search_mv');
      await this.searchService.refreshTicketSearchView();
      const duration = Date.now() - startTime;
      this.logger.log(
        `[API] Manual refresh completed successfully in ${duration}ms`,
      );
      return {
        success: true,
        message: 'Ticket search materialized view refresh completed successfully',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[API] Manual refresh failed after ${duration}ms: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          success: false,
          message: 'Failed to refresh ticket search materialized view',
          error: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}