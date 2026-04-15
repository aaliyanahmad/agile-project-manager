import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ticket } from '../entities/ticket.entity';
import { Sprint } from '../entities/sprint.entity';
import { Project } from '../entities/project.entity';

interface UserStoryResponse {
  userStory: string;
  acceptanceCriteria: string[];
  technicalNotes: string[];
}

@Injectable()
export class AiService {
  private model;

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateUserStory(ticketId: string): Promise<UserStoryResponse> {
    // Fetch ticket with relations
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['sprint', 'project'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Check if user story already exists (cached)
    if (ticket.aiUserStory) {
      try {
        return JSON.parse(ticket.aiUserStory);
      } catch (error) {
        // If parsing fails, regenerate
        console.warn(`Failed to parse cached aiUserStory for ticket ${ticketId}, regenerating...`);
      }
    }

    // Extract context from relations
    const sprintGoal = this._getSprintContext(ticket.sprint);
    const projectDescription = ticket.project?.description || 'No project description';

    // Build prompt
    const prompt = this._buildPrompt(ticket, sprintGoal, projectDescription);

    // Call Gemini
    let geminiResponse: string;
    try {
      const result = await this.model.generateContent(prompt);
      geminiResponse = result.response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new BadRequestException(
        `Failed to generate user story: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Parse response
    const userStory = this._parseGeminiResponse(geminiResponse);

    // Save to database
    ticket.aiUserStory = JSON.stringify(userStory);
    try {
      await this.ticketRepository.save(ticket);
    } catch (error) {
      console.error('Failed to save aiUserStory:', error);
      throw new BadRequestException('Failed to save generated user story');
    }

    return userStory;
  }

  /**
   * Fetch existing AI user story for a ticket
   */
  async getUserStory(ticketId: string): Promise<UserStoryResponse | { message: string }> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    if (!ticket.aiUserStory) {
      return { message: 'AI user story not generated yet' };
    }

    try {
      return JSON.parse(ticket.aiUserStory);
    } catch (error) {
      console.error(`Failed to parse aiUserStory for ticket ${ticketId}:`, error);
      throw new BadRequestException('Invalid cached user story format');
    }
  }

  /**
   * Extract sprint context (goal or fallback to name)
   */
  private _getSprintContext(sprint: Sprint | null): string {
    if (!sprint) {
      return 'No sprint assigned (Backlog)';
    }
    return sprint.goal || `Sprint: ${sprint.name}`;
  }

  /**
   * Build structured prompt for Gemini
   */
  private _buildPrompt(ticket: Ticket, sprintGoal: string, projectDescription: string): string {
    return `You are an expert Agile product manager. Generate a detailed user story based on the following context:

Project: ${projectDescription}
Sprint Goal: ${sprintGoal}
Ticket Title: ${ticket.title}
Ticket Description: ${ticket.description || 'No description provided'}

Generate a comprehensive user story with acceptance criteria and technical notes.

You MUST return ONLY valid JSON with this exact structure. No explanation, no markdown, no extra text:
{
  "userStory": "As a [role] I want [feature] so that [benefit]",
  "acceptanceCriteria": ["Criteria 1", "Criteria 2", "Criteria 3"],
  "technicalNotes": ["Technical note 1", "Technical note 2"]
}`;
  }

  /**
   * Parse Gemini response - extract JSON and validate structure
   */
  private _parseGeminiResponse(response: string): UserStoryResponse {
    // Try to extract JSON from response
    let cleanedResponse = response.trim();

    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse Gemini response:', cleanedResponse);
      throw new BadRequestException(
        'Invalid response from AI model. Expected JSON format.',
      );
    }

    // Validate structure
    if (typeof parsed !== 'object' || parsed === null) {
      throw new BadRequestException('AI response must be a JSON object');
    }

    const data = parsed as Record<string, unknown>;

    // Validate required fields
    if (
      typeof data.userStory !== 'string' ||
      !Array.isArray(data.acceptanceCriteria) ||
      !Array.isArray(data.technicalNotes)
    ) {
      throw new BadRequestException(
        'AI response must contain userStory (string), acceptanceCriteria (array), and technicalNotes (array)',
      );
    }

    // Validate array contents
    if (!data.acceptanceCriteria.every((item) => typeof item === 'string')) {
      throw new BadRequestException('acceptanceCriteria must be an array of strings');
    }

    if (!data.technicalNotes.every((item) => typeof item === 'string')) {
      throw new BadRequestException('technicalNotes must be an array of strings');
    }

    return {
      userStory: data.userStory,
      acceptanceCriteria: data.acceptanceCriteria,
      technicalNotes: data.technicalNotes,
    };
  }
}
 