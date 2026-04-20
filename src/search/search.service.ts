import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';

export interface SearchResult {
  tickets: Array<{
    id: string;
    ticketKey: string;
    title: string;
    status: string;
    project: {
      id: string;
      name: string;
    };
  }>;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly dataSource: DataSource,
  ) {}

  async searchTickets(q: string, projectId?: string): Promise<SearchResult> {
    console.log('SearchService.searchTickets called with:', { q, projectId });

    const trimmedQuery = q.trim();
    if (!trimmedQuery) {
      console.log('SearchService: Empty query after trimming, returning empty results');
      return { tickets: [] };
    }

    const query = `%${trimmedQuery}%`;

    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.project', 'project')
      .leftJoinAndSelect('ticket.status', 'status')
      .select([
        'ticket.id',
        'ticket.ticketKey',
        'ticket.title',
        'status.name',
        'project.id',
        'project.name',
      ])
      .where(
        '(LOWER(ticket.title) LIKE LOWER(:query) OR LOWER(ticket.ticketKey) LIKE LOWER(:query) OR LOWER(ticket.description) LIKE LOWER(:query))',
        { query }
      )
      .orderBy('ticket.updatedAt', 'DESC')
      .limit(10);

    if (projectId) {
      console.log('SearchService: Adding projectId filter:', projectId);
      qb.andWhere('ticket.projectId = :projectId', { projectId });
    }

    console.log('SearchService: Executing query...');
    const tickets = await qb.getMany();
    console.log('SearchService: Found', tickets.length, 'tickets');

    return {
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        status: ticket.status?.name || 'Unknown',
        project: {
          id: ticket.project.id,
          name: ticket.project.name,
        },
      })),
    };
  }

  /**
   * Full-text search using PostgreSQL materialized view and tsvector.
   * 
   * Features:
   * - Searches across ticket title, description, creator name, and assignee names
   * - Results ranked by relevance using ts_rank
   * - Highlighted titles and descriptions using ts_headline
   * - Pagination support (limit + offset)
   * - No SQL injection vulnerability (parameterized queries)
   * 
   * @param query - Search query string (non-empty)
   * @param limit - Number of results to return (1-50, default 10)
   * @param offset - Number of results to skip (default 0)
   * @returns Array of ticket search results with highlighting and ranking
   * @throws BadRequestException if query is empty
   */
  async fullTextSearchTickets(
    query: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<any[]> {
    // Validate input
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new BadRequestException('Search query cannot be empty');
    }

    // Cap limit to prevent abuse
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);

    this.logger.log(
      `Executing full-text search: query="${trimmedQuery}", limit=${safeLimit}, offset=${safeOffset}`,
    );

    try {
      const startTime = Date.now();

      // Use parameterized query to prevent SQL injection
      // ts_headline highlights matching terms with <b> tags
      const results = await this.dataSource.query(
        `
        SELECT 
          ticket_id,
          project_id,
          status_id,
          priority,
          ts_headline('english', COALESCE(title, ''), plainto_tsquery('english', $1)) AS highlighted_title,
          ts_headline('english', COALESCE(description, ''), plainto_tsquery('english', $1), 'StartSel=<b>, StopSel=</b>') AS highlighted_description,
          creator,
          assignees,
          ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
        FROM ticket_search_mv
        WHERE search_vector @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT $2 OFFSET $3
        `,
        [trimmedQuery, safeLimit, safeOffset],
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Full-text search completed: found ${results.length} results in ${duration}ms`,
      );

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Full-text search failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Manually refresh the ticket_search_mv materialized view.
   * Uses concurrent refresh to avoid blocking queries against the view.
   * 
   * Error handling strategy:
   * - Logs both success and failure with details
   * - Throws error to allow caller (cron or API) to handle appropriately
   * - Caller is responsible for catching and preventing crashes
   */
  async refreshTicketSearchView(): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger.log('Initiating refresh of ticket_search_mv materialized view');
      
      await this.dataSource.query(
        `REFRESH MATERIALIZED VIEW CONCURRENTLY ticket_search_mv`,
      );
      
      const duration = Date.now() - startTime;
      this.logger.log(
        `Successfully refreshed ticket_search_mv materialized view (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(
        `Failed to refresh ticket_search_mv materialized view after ${duration}ms: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      
      // Propagate error to caller (cron or API endpoint)
      throw error;
    }
  }

  /**
   * Scheduled cron job that automatically refreshes the ticket_search_mv materialized view.
   * Runs every 6 hours at UTC times: 0:00, 6:00, 12:00, 18:00
   * Cron expression: every 6 hours at minute 0
   * 
   * Error handling: Catches all errors to prevent application crashes.
   * All failures are logged for monitoring and debugging.
   */
  @Cron('0 */6 * * *')
  async handleTicketSearchMvRefresh(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('[CRON] Starting scheduled refresh of ticket_search_mv');

    try {
      await this.refreshTicketSearchView();
      const duration = Date.now() - startTime;
      this.logger.log(
        `[CRON] Scheduled refresh completed successfully in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(
        `[CRON] Scheduled refresh failed after ${duration}ms: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Intentionally swallow error - cron should never crash the application
    }
  }
}