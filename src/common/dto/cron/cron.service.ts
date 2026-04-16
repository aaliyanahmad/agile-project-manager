import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron('0 */6 * * *') // every 6 hours
  async refreshTicketSearchView() {
    this.logger.log('Refreshing ticket_search_mv...');

    try {
      await this.dataSource.query(`
        REFRESH MATERIALIZED VIEW ticket_search_mv;
      `);

      this.logger.log('ticket_search_mv refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh ticket_search_mv', error);
    }
  }
}