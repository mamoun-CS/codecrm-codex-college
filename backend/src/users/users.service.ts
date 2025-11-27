import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Team } from '../entities/team.entity';
import { Lead } from '../entities/leads.entity';
import { DashboardAccount } from '../entities/dashboard-accounts.entity';
import { RealtimeGateway } from '../events/realtime.gateway';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(DashboardAccount)
    private dashboardAccountRepository: Repository<DashboardAccount>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    private dataSource: DataSource,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async findAll(currentUser: any): Promise<any[]> {
    // Only admin and manager can view users
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      throw new ForbiddenException('You do not have permission to view users');
    }

    let users: User[];

    if (currentUser.role === 'admin') {
      users = await this.userRepository.find({
        relations: ['team'],
      });
    } else {
      // Manager can see users in their team
      users = await this.userRepository.find({
        where: { team_id: currentUser.team_id },
        relations: ['team'],
      });
    }

    // Transform response to exclude sensitive data
    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team_id: user.team_id,
      active: user.active,
      created_at: user.created_at,
      team: user.team ? { id: user.team.id, name: user.team.name } : undefined
    }));
  }

  async findOne(id: number, currentUser: any): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['team']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check permissions - admin can view all, manager can view their team
    if (currentUser.role !== 'admin' && (currentUser.role !== 'manager' || user.team_id !== currentUser.team_id)) {
      throw new ForbiddenException('Cannot view this user');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team_id: user.team_id,
      active: user.active,
      created_at: user.created_at,
      team: user.team ? { id: user.team.id, name: user.team.name } : undefined
    };
  }

  async updateRole(id: number, role: string, currentUser: any): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['team']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only admin can update roles
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admin can update roles');
    }

    user.role = role;
    const updatedUser = await this.userRepository.save(user);

    // Broadcast real-time update
    this.realtimeGateway.server.emit('user:updated', {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      team_id: updatedUser.team_id,
      active: updatedUser.active,
      team: updatedUser.team ? { id: updatedUser.team.id, name: updatedUser.team.name } : undefined
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      team_id: updatedUser.team_id,
      active: updatedUser.active,
      team: updatedUser.team ? { id: updatedUser.team.id, name: updatedUser.team.name } : undefined
    };
  }

  async deleteUser(id: number, currentUser: any): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['team']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only admin can delete users
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admin can delete users');
    }

    // Cannot delete yourself
    if (user.id === currentUser.id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Reassign this user's leads to the current admin before removal
    await this.leadRepository
      .createQueryBuilder()
      .update()
      .set({ owner_user_id: currentUser.id })
      .where('owner_user_id = :userId', { userId: user.id })
      .execute();

    await this.leadRepository
      .createQueryBuilder()
      .update()
      .set({ assigned_to: currentUser.id })
      .where('assigned_to = :userId', { userId: user.id })
      .execute();

    await this.userRepository.remove(user);

    // Broadcast real-time deletion
    this.realtimeGateway.server.emit('user:deleted', { id: user.id });
  }

  getAllowedRoles(currentUser: any): string[] {
    if (currentUser.role === 'admin') {
      return ['manager', 'sales', 'marketing'];
    }

    if (currentUser.role === 'manager') {
      return ['sales'];
    }

    return [];
  }

  async findAllSalesExcept(currentUserId: number) {
    const users = await this.userRepository.find({
      where: { role: 'sales', id: Not(currentUserId) },
      relations: ['team'],
    });

    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      team_id: user.team_id,
      team: user.team ? { id: user.team.id, name: user.team.name } : undefined
    }));
  }

  async getTransferrableUsers(currentUser: any): Promise<any[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.team', 'team')
      .where('user.active = :active', { active: true });

    // Exclude current user unless they are sales
    if (currentUser.role !== 'sales') {
      query.andWhere('user.id != :currentUserId', { currentUserId: currentUser.id });
    }

    // Role-based filtering
    switch (currentUser.role) {
      case 'admin':
        // Admin can see all users
        break;

      case 'manager':
        query.andWhere('user.team_id = :teamId', { teamId: currentUser.team_id });
        break;

      case 'sales':
        if (currentUser.team_id) {
          query.andWhere('user.team_id = :teamId', { teamId: currentUser.team_id });
        } else {
          query.andWhere('user.id = :currentUserId', { currentUserId: currentUser.id });
        }
        break;

      default:
        throw new ForbiddenException('Invalid user role');
    }

    const users = await query.getMany();

    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team_id: user.team_id,
      team: user.team ? { id: user.team.id, name: user.team.name } : undefined
    }));
  }

  async createUser(createUserDto: CreateUserDto, currentUser: any): Promise<User> {
    // Only admin and manager can create users
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      throw new ForbiddenException('You do not have permission to create users');
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    let teamId = createUserDto.team_id;

    // Manager can only assign to their team
    if (currentUser.role === 'manager') {
      if (!currentUser.team_id) {
        throw new ForbiddenException('Manager must belong to a team');
      }
      teamId = currentUser.team_id;
    }

    // Use transaction to ensure team creation and user creation are atomic
    return await this.dataSource.transaction(async (manager) => {
      // Handle team creation for admins or validate existing team
      if (teamId) {
        const team = await manager.findOne(Team, { where: { id: teamId } });
        if (!team) {
          // Admin can create team on the fly, others get error
          if (currentUser.role === 'admin') {
            console.log(`Admin ${currentUser.id} creating team ${teamId} for user creation`);
            const newTeam = manager.create(Team, {
              id: teamId,
              name: `Team ${teamId}`,
              description: `Auto-created team for ID ${teamId}`,
            });
            const savedTeam = await manager.save(Team, newTeam);
            console.log(`Team ${teamId} created successfully:`, savedTeam);
          } else {
            console.log(`Non-admin user ${currentUser.id} (${currentUser.role}) tried to create team ${teamId}`);
            throw new BadRequestException(`Team with ID ${teamId} does not exist`);
          }
        }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(createUserDto.password);

      // Create user
      const user = manager.create(User, {
        ...createUserDto,
        password_hash: hashedPassword,
        team_id: teamId,
      });

      const savedUser = await manager.save(User, user);

      // Broadcast real-time user creation event
      this.realtimeGateway.server.emit('user:created', {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        team_id: savedUser.team_id,
      });

      return savedUser;
    });
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto, currentUser: any): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['team']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check permissions
    if (currentUser.role !== 'admin' && (currentUser.role !== 'manager' || user.team_id !== currentUser.team_id)) {
      throw new ForbiddenException('Cannot modify this user');
    }

    // Manager can only modify team members
    if (currentUser.role === 'manager' && updateUserDto.team_id && updateUserDto.team_id !== currentUser.team_id) {
      throw new ForbiddenException('Cannot move users to another team');
    }

    // Update user
    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    // Broadcast real-time update
    this.realtimeGateway.server.emit('user:updated', {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      team_id: updatedUser.team_id,
    });

    return updatedUser;
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return bcrypt.hash(password, 10);
  }
}
