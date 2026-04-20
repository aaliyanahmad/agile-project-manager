import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserTheme } from '../entities/enums';

export interface UpdateUserPreferencesDto {
  theme: UserTheme;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async updateUserPreferences(userId: string, preferences: UpdateUserPreferencesDto): Promise<User> {
    await this.userRepository.update(userId, {
      theme: preferences.theme,
    });

    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }
}