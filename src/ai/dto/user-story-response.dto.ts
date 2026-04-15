import { ApiProperty } from '@nestjs/swagger';

export class UserStoryResponseDto {
  @ApiProperty({
    description: 'The user story in the format "As a ... I want ... so that ..."',
    example: 'As a project manager I want to generate user stories from tickets so that I can save time on documentation',
  })
  userStory!: string;

  @ApiProperty({
    description: 'List of acceptance criteria for the user story',
    example: [
      'User story should be generated from ticket description',
      'Acceptance criteria should be provided in bullet points',
      'Technical notes should be included for developers',
    ],
  })
  acceptanceCriteria!: string[];

  @ApiProperty({
    description: 'Technical notes for the development team',
    example: ['Consider using Gemini API for AI generation', 'Cache results to avoid API calls'],
  })
  technicalNotes!: string[];
}
