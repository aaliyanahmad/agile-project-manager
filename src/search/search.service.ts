import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
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
}